import { useCallback, useState, useEffect, useRef } from "react";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  useReactFlow,
  MiniMap,
  Panel,
  NodeProps,
  Handle,
  Position,
} from "reactflow";
import dagre from "dagre";
import "reactflow/dist/style.css";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, ZoomIn, ZoomOut, Maximize2, Database, ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Custom node component for knowledge graph nodes
function KnowledgeNode({ data }: NodeProps) {
  const getNodeColor = (level: number, isExpanded: boolean) => {
    const colors: Record<number, string> = {
      0: isExpanded ? "bg-primary/40 border-primary border-2" : "bg-primary/30 border-primary border-2",
      1: isExpanded ? "bg-blue-500/30 border-blue-500 border-2" : "bg-blue-500/20 border-blue-500",
      2: "bg-green-500/20 border-green-500",
    };
    return colors[level] || "bg-gray-500/20 border-gray-500";
  };

  const getNodeSize = (level: number) => {
    if (level === 0) return "min-w-[200px] max-w-[250px]";
    if (level === 1) return "min-w-[160px] max-w-[200px]";
    return "min-w-[140px] max-w-[180px]";
  };

  const hasChildren = data.hasChildren;
  const isExpanded = data.isExpanded;

  return (
    <>
      {data.level > 0 && (
        <Handle
          type="target"
          position={Position.Left}
          style={{ background: '#555' }}
        />
      )}
      
      <Card
        className={`p-3 ${getNodeSize(data.level)} ${getNodeColor(data.level, isExpanded)} cursor-pointer hover:shadow-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${hasChildren ? 'hover:scale-105' : ''}`}
        data-testid={`mindmap-node-${data.id}`}
        onClick={data.onClick}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            data.onClick?.();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={data.label}
      >
        <div className="space-y-1">
          <div className="flex items-center justify-center gap-1">
            {data.level === 0 && (
              <Database className="w-5 h-5 text-primary mb-2" />
            )}
            {hasChildren && data.level < 2 && (
              isExpanded ? 
                <ChevronDown className="w-4 h-4 text-muted-foreground" /> :
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
          <div className={`${data.level === 0 ? 'text-sm' : 'text-xs'} font-semibold text-foreground text-center`} title={data.label}>
            {data.label}
          </div>
          {data.level > 0 && data.count && (
            <div className="text-[10px] text-muted-foreground text-center">
              {data.count} items
            </div>
          )}
        </div>
      </Card>
      
      {data.level < 2 && (
        <Handle
          type="source"
          position={Position.Right}
          style={{ background: '#555' }}
        />
      )}
    </>
  );
}

const nodeTypes = {
  knowledge: KnowledgeNode,
};

interface KnowledgeMindmapProps {
  knowledgeGraphData?: any;
}

// Tree layout using dagre
const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  const nodeWidth = 200;
  const nodeHeight = 100;
  
  dagreGraph.setGraph({ 
    rankdir: direction,
    nodesep: 80,
    ranksep: 200,
    marginx: 50,
    marginy: 50,
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

// Component to handle viewport centering (must be inside ReactFlow)
function ViewportCenterer({ nodes }: { nodes: Node[] }) {
  const { setCenter } = useReactFlow();
  const prevNodesRef = useRef<Node[]>([]);

  useEffect(() => {
    // Only center if nodes have changed
    if (nodes.length > 0 && nodes !== prevNodesRef.current) {
      const rootNode = nodes.find(n => n.id === 'root' && !n.hidden);
      if (rootNode) {
        setTimeout(() => {
          setCenter(rootNode.position.x + 100, rootNode.position.y + 50, { zoom: 1, duration: 300 });
        }, 50);
      }
      prevNodesRef.current = nodes;
    }
  }, [nodes, setCenter]);

  return null;
}

export function KnowledgeMindmap({ knowledgeGraphData }: KnowledgeMindmapProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [allNodes, setAllNodes] = useState<Node[]>([]);
  const [allEdges, setAllEdges] = useState<Edge[]>([]);
  const childrenMapRef = useRef<Record<string, string[]>>({});

  // Build hierarchical tree structure from knowledge graph
  useEffect(() => {
    if (!knowledgeGraphData?.nodes) return;

    // Categorize nodes into meaningful groups
    const categorizeNode = (node: any): string => {
      const name = node.name.toLowerCase();
      const type = node.type?.toLowerCase() || "";
      
      if (name.includes("order") || name.includes("placement") || name.includes("settlement")) {
        return "Order Journey & Processes";
      }
      if (name.includes("customer") || name.includes("account") || name.includes("investor") || name.includes("kyc")) {
        return "Customer & Account Management";
      }
      if (name.includes("product") || name.includes("fund") || name.includes("security") || name.includes("portfolio")) {
        return "Products & Securities";
      }
      if (name.includes("transaction") || name.includes("redemption") || name.includes("sip") || name.includes("swp") || name.includes("stp")) {
        return "Transactions & Operations";
      }
      if (type.includes("system") || name.includes("api") || name.includes("integration")) {
        return "Systems & Integration";
      }
      if (name.includes("compliance") || name.includes("regulation") || name.includes("sebi") || name.includes("kyc")) {
        return "Compliance & Regulations";
      }
      if (type.includes("report") || name.includes("report") || name.includes("document")) {
        return "Reports & Documents";
      }
      
      return "Other";
    };

    // Group nodes by category
    const categories: Record<string, any[]> = {};
    knowledgeGraphData.nodes.forEach((node: any) => {
      const category = categorizeNode(node);
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(node);
    });

    if (categories["Other"] && categories["Other"].length < 5) {
      delete categories["Other"];
    }

    // Create hierarchical structure (no positions yet - dagre will handle that)
    const graphNodes: Node[] = [];
    const graphEdges: Edge[] = [];
    const childrenMap: Record<string, string[]> = {};

    const rootId = "root";
    
    // Root node (Level 0)
    graphNodes.push({
      id: rootId,
      type: "knowledge",
      position: { x: 0, y: 0 }, // Temporary position
      data: {
        id: rootId,
        label: "Order Management & Wealth Operations",
        level: 0,
        count: knowledgeGraphData.nodes.length,
        hasChildren: true,
        isExpanded: false,
        onClick: () => handleNodeClick(rootId),
      },
    });

    childrenMap[rootId] = [];

    // Level 1: Main categories
    const categoryNames = Object.keys(categories).filter(cat => cat !== "Other");

    categoryNames.forEach((category, catIndex) => {
      const categoryId = `cat-${catIndex}`;
      graphNodes.push({
        id: categoryId,
        type: "knowledge",
        position: { x: 0, y: 0 }, // Temporary position
        data: {
          id: categoryId,
          label: category,
          level: 1,
          count: categories[category].length,
          hasChildren: true,
          isExpanded: false,
          onClick: () => handleNodeClick(categoryId),
        },
      });

      childrenMap[rootId].push(categoryId);
      childrenMap[categoryId] = [];

      graphEdges.push({
        id: `edge-root-${categoryId}`,
        source: rootId,
        target: categoryId,
        type: "smoothstep",
        animated: false,
        style: { stroke: "#3b82f6", strokeWidth: 2 },
      });

      // Level 2: Items
      const subcategories = categories[category]
        .sort((a, b) => (b.evidence_count || 0) - (a.evidence_count || 0))
        .slice(0, 5);

      subcategories.forEach((node: any, nodeIndex) => {
        const nodeId = `node-${catIndex}-${nodeIndex}`;
        graphNodes.push({
          id: nodeId,
          type: "knowledge",
          position: { x: 0, y: 0 }, // Temporary position
          data: {
            id: nodeId,
            label: node.name,
            level: 2,
            type: node.type,
            evidenceCount: node.evidence_count,
            hasChildren: false,
            isExpanded: false,
            onClick: () => {},
          },
        });

        childrenMap[categoryId].push(nodeId);

        graphEdges.push({
          id: `edge-${categoryId}-${nodeId}`,
          source: categoryId,
          target: nodeId,
          type: "smoothstep",
          animated: false,
          style: { stroke: "#10b981", strokeWidth: 1 },
        });
      });
    });

    // Apply tree layout to all nodes
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(graphNodes, graphEdges, 'LR');

    setAllNodes(layoutedNodes);
    setAllEdges(layoutedEdges);
    childrenMapRef.current = childrenMap;
  }, [knowledgeGraphData]);

  // Handle node click to expand/collapse
  const handleNodeClick = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(nodeId)) {
        // Collapse: remove this node and all descendants
        newExpanded.delete(nodeId);
        const removeDescendants = (id: string) => {
          const children = childrenMapRef.current[id] || [];
          children.forEach((childId: string) => {
            newExpanded.delete(childId);
            removeDescendants(childId);
          });
        };
        removeDescendants(nodeId);
      } else {
        // Expand: add this node
        newExpanded.add(nodeId);
      }
      return newExpanded;
    });
  }, []);

  // Update visible nodes and edges based on expansion state
  useEffect(() => {
    if (allNodes.length === 0) return;

    // Determine which nodes should be visible
    const visibleNodeIds = new Set<string>(['root']); // Root is always visible
    
    const addVisibleChildren = (nodeId: string) => {
      if (expandedNodes.has(nodeId)) {
        const children = childrenMapRef.current[nodeId] || [];
        children.forEach((childId: string) => {
          visibleNodeIds.add(childId);
        });
      }
    };

    // Start from root and add visible descendants
    visibleNodeIds.forEach(nodeId => addVisibleChildren(nodeId));
    allNodes.forEach(node => {
      if (visibleNodeIds.has(node.id)) {
        addVisibleChildren(node.id);
      }
    });

    // Get only visible nodes for layout
    const visibleNodes = allNodes.filter(node => visibleNodeIds.has(node.id));
    const visibleEdges = allEdges.filter(edge => 
      visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
    );

    // Re-layout only visible nodes for proper tree structure
    const { nodes: layoutedNodes } = getLayoutedElements(visibleNodes, visibleEdges, 'LR');

    // Update nodes with visibility and expansion state
    const updatedNodes = allNodes.map(node => {
      const layoutedNode = layoutedNodes.find(n => n.id === node.id);
      return {
        ...node,
        position: layoutedNode ? layoutedNode.position : node.position,
        hidden: !visibleNodeIds.has(node.id),
        data: {
          ...node.data,
          isExpanded: expandedNodes.has(node.id),
          onClick: () => handleNodeClick(node.id),
        },
      };
    });

    setNodes(updatedNodes);
    setEdges(visibleEdges);
  }, [expandedNodes, allNodes, allEdges, setNodes, setEdges, handleNodeClick]);

  // Filter nodes based on search - expand ancestors of matching nodes
  useEffect(() => {
    if (!searchTerm || allNodes.length === 0) return;

    const searchLower = searchTerm.toLowerCase();
    const matchingNodeIds = new Set<string>();
    
    // Find all nodes that match the search
    allNodes.forEach(node => {
      if (node.data.label.toLowerCase().includes(searchLower)) {
        matchingNodeIds.add(node.id);
      }
    });

    // Build parent map from children map
    const parentMap: Record<string, string> = {};
    Object.entries(childrenMapRef.current).forEach(([parentId, children]) => {
      children.forEach(childId => {
        parentMap[childId] = parentId;
      });
    });

    // Expand all ancestors of matching nodes
    const nodesToExpand = new Set<string>();
    matchingNodeIds.forEach(nodeId => {
      let currentId: string | undefined = nodeId;
      while (currentId && currentId !== 'root') {
        const parentId: string | undefined = parentMap[currentId];
        if (parentId) {
          nodesToExpand.add(parentId);
        }
        currentId = parentId;
      }
    });

    // Apply expansion for search results
    if (nodesToExpand.size > 0) {
      setExpandedNodes(prev => {
        const newExpanded = new Set(prev);
        nodesToExpand.forEach(id => newExpanded.add(id));
        return newExpanded;
      });
    }
  }, [searchTerm, allNodes]);

  // Apply search filtering - keep matching nodes AND their ancestors visible
  const displayNodes = searchTerm 
    ? (() => {
        const searchLower = searchTerm.toLowerCase();
        const matchingNodeIds = new Set<string>();
        
        // Find all nodes that match the search
        nodes.forEach(node => {
          if (node.data.label.toLowerCase().includes(searchLower)) {
            matchingNodeIds.add(node.id);
          }
        });

        // Build parent map
        const parentMap: Record<string, string> = {};
        Object.entries(childrenMapRef.current).forEach(([parentId, children]) => {
          children.forEach(childId => {
            parentMap[childId] = parentId;
          });
        });

        // Include all ancestors of matching nodes
        const nodesToShow = new Set<string>(matchingNodeIds);
        matchingNodeIds.forEach(nodeId => {
          let currentId: string | undefined = nodeId;
          while (currentId) {
            nodesToShow.add(currentId);
            currentId = parentMap[currentId];
          }
        });

        // Apply visibility filter
        return nodes.map(node => ({
          ...node,
          hidden: node.hidden || !nodesToShow.has(node.id),
        }));
      })()
    : nodes;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const visibleCount = displayNodes.filter(n => !n.hidden).length;
  const categoryCount = displayNodes.filter(n => !n.hidden && n.data.level === 1).length;
  const itemCount = displayNodes.filter(n => !n.hidden && n.data.level === 2).length;

  return (
    <div className={`relative ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : 'h-full w-full'}`}>
      <ReactFlow
        nodes={displayNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        className="bg-background"
        minZoom={0.1}
        maxZoom={1.5}
      >
        <Background color="#94a3b8" gap={16} />
        <Controls />
        <ViewportCenterer nodes={displayNodes} />
        <MiniMap
          nodeColor={(node) => {
            const level = node.data.level;
            if (level === 0) return "#3b82f6";
            if (level === 1) return "#3b82f6";
            return "#10b981";
          }}
          maskColor="rgba(0, 0, 0, 0.2)"
        />
        
        {/* Search Panel */}
        <Panel position="top-left" className="bg-card/95 backdrop-blur border border-border rounded-lg p-3 shadow-lg">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search nodes..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="h-8 w-48"
                data-testid="input-mindmap-search"
              />
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <div className="font-semibold">Progressive Reveal:</div>
              <div>• Click nodes to expand</div>
              <div>• {visibleCount} nodes visible</div>
              {categoryCount > 0 && <div>• {categoryCount} categories shown</div>}
              {itemCount > 0 && <div>• {itemCount} items shown</div>}
            </div>
          </div>
        </Panel>

        {/* Legend Panel */}
        <Panel position="top-right" className="bg-card/95 backdrop-blur border border-border rounded-lg p-3 shadow-lg">
          <div className="text-xs font-semibold mb-2">Hierarchy Levels</div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-primary/30 border-2 border-primary" />
              <span>Root (Level 0)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-500/20 border border-blue-500" />
              <span>Categories (Level 1)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500/20 border border-green-500" />
              <span>Items (Level 2)</span>
            </div>
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
              <ChevronRight className="w-3 h-3" />
              <span>Click to expand</span>
            </div>
          </div>
        </Panel>

        {/* Fullscreen Toggle */}
        <Panel position="bottom-right">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            data-testid="button-mindmap-fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </Panel>
      </ReactFlow>
    </div>
  );
}
