import { useCallback, useState, useEffect, useRef, useMemo } from "react";
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
  MarkerType,
} from "reactflow";
import * as d3 from "d3-force";
import "reactflow/dist/style.css";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search,
  Maximize2,
  Network,
  ChevronDown,
  ChevronRight,
  Info,
  Filter,
  Eye,
  EyeOff,
  Target,
  Layers,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface KnowledgeGraphNode {
  id: string;
  type: string;
  name: string;
  labels?: string[];
  properties?: any;
  evidence_count?: number;
}

interface KnowledgeGraphEdge {
  source_id: string;
  target_id: string;
  type: string;
  canonical_rel_type?: string;
  confidence?: number;
  evidence_count?: number;
  evidence?: any[];
  source_documents?: string[];
}

interface RelationshipNetworkGraphProps {
  knowledgeGraphData?: {
    nodes: KnowledgeGraphNode[];
    edges: KnowledgeGraphEdge[];
    metadata?: any;
  };
}

// Custom node component for network nodes
function NetworkNode({ data }: NodeProps) {
  const getNodeColor = (type: string) => {
    const colors: Record<string, string> = {
      Report: "bg-blue-500/30 border-blue-500",
      System: "bg-purple-500/30 border-purple-500",
      DataEntity: "bg-green-500/30 border-green-500",
      Process: "bg-orange-500/30 border-orange-500",
      Document: "bg-pink-500/30 border-pink-500",
      default: "bg-gray-500/30 border-gray-500",
    };
    return colors[type] || colors.default;
  };

  const getNodeSize = (connections: number) => {
    if (connections > 20) return "min-w-[140px] max-w-[180px]";
    if (connections > 10) return "min-w-[120px] max-w-[160px]";
    return "min-w-[100px] max-w-[140px]";
  };

  const nodeType = data.nodeType || "default";
  const connections = data.connections || 0;
  const isExpanded = data.isExpanded || false;
  const canExpand = data.canExpand || false;

  return (
    <>
      <Handle type="target" position={Position.Top} style={{ background: '#555' }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#555' }} />
      <Handle type="target" position={Position.Left} style={{ background: '#555' }} />
      <Handle type="source" position={Position.Right} style={{ background: '#555' }} />
      
      <Card
        className={`p-3 ${getNodeSize(connections)} ${getNodeColor(nodeType)} cursor-pointer hover:shadow-lg transition-all hover:scale-105 border-2`}
        data-testid={`network-node-${data.id}`}
        onClick={data.onClick}
      >
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-1">
            <Badge variant="outline" className="text-[10px] px-1 py-0 bg-background/50">
              {nodeType}
            </Badge>
            {canExpand && (
              <div className="text-muted-foreground">
                {isExpanded ? (
                  <EyeOff className="w-3 h-3" />
                ) : (
                  <Eye className="w-3 h-3" />
                )}
              </div>
            )}
          </div>
          <div className="text-xs font-semibold text-foreground text-center leading-tight" title={data.label}>
            {data.label}
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span title="Number of connections">{connections} links</span>
            {data.evidenceCount > 0 && (
              <span title="Evidence count">{data.evidenceCount} evidence</span>
            )}
          </div>
        </div>
      </Card>
    </>
  );
}

const nodeTypes = {
  network: NetworkNode,
};

// Helper function to get relationship type color
function getRelationshipColor(relType: string): string {
  const colors: Record<string, string> = {
    DISPLAYED_ON: "#3b82f6", // blue
    PROCESSES: "#10b981", // green
    USES: "#f59e0b", // amber
    PART_OF: "#8b5cf6", // purple
    CONTAINS: "#ec4899", // pink
    CONNECTS_TO: "#06b6d4", // cyan
    REFERENCES: "#64748b", // slate
  };
  return colors[relType] || "#94a3b8"; // default gray
}

// Component to handle viewport centering
function ViewportCenterer({ nodes, trigger }: { nodes: Node[]; trigger: number }) {
  const { fitView } = useReactFlow();

  useEffect(() => {
    if (nodes.length > 0 && trigger > 0) {
      setTimeout(() => {
        fitView({ padding: 0.2, duration: 500 });
      }, 50);
    }
  }, [trigger, nodes, fitView]);

  return null;
}

export function RelationshipNetworkGraph({ knowledgeGraphData }: RelationshipNetworkGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [visibleNodes, setVisibleNodes] = useState<Set<string>>(new Set());
  const [neighborhoodDepth, setNeighborhoodDepth] = useState(1);
  const [minConnections, setMinConnections] = useState(5);
  const [showFilters, setShowFilters] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedRelTypes, setSelectedRelTypes] = useState<Set<string>>(new Set());
  const [viewTrigger, setViewTrigger] = useState(0);

  // Store full graph data
  const graphDataRef = useRef<{
    nodeMap: Map<string, KnowledgeGraphNode>;
    edgeList: KnowledgeGraphEdge[];
    adjacencyList: Map<string, Set<string>>;
    nodeConnections: Map<string, number>;
  }>({
    nodeMap: new Map(),
    edgeList: [],
    adjacencyList: new Map(),
    nodeConnections: new Map(),
  });

  // Analyze knowledge graph and build data structures
  useEffect(() => {
    if (!knowledgeGraphData?.nodes || !knowledgeGraphData?.edges) return;

    const nodeMap = new Map<string, KnowledgeGraphNode>();
    const adjacencyList = new Map<string, Set<string>>();
    const nodeConnections = new Map<string, number>();

    // Build node map
    knowledgeGraphData.nodes.forEach(node => {
      nodeMap.set(node.id, node);
      adjacencyList.set(node.id, new Set());
      nodeConnections.set(node.id, 0);
    });

    // Build adjacency list and count connections
    knowledgeGraphData.edges.forEach(edge => {
      const sourceSet = adjacencyList.get(edge.source_id);
      const targetSet = adjacencyList.get(edge.target_id);
      
      if (sourceSet) sourceSet.add(edge.target_id);
      if (targetSet) targetSet.add(edge.source_id);
      
      nodeConnections.set(edge.source_id, (nodeConnections.get(edge.source_id) || 0) + 1);
      nodeConnections.set(edge.target_id, (nodeConnections.get(edge.target_id) || 0) + 1);
    });

    graphDataRef.current = {
      nodeMap,
      edgeList: knowledgeGraphData.edges,
      adjacencyList,
      nodeConnections,
    };

    // Get all relationship types for filtering
    const relTypes = new Set<string>();
    knowledgeGraphData.edges.forEach(edge => {
      if (edge.type) relTypes.add(edge.type);
    });
    setSelectedRelTypes(relTypes); // Show all by default
  }, [knowledgeGraphData]);

  // Get top hub nodes and initialize view - APPLY minConnections filter
  useEffect(() => {
    if (!graphDataRef.current.nodeMap.size) return;

    const { nodeMap, nodeConnections } = graphDataRef.current;

    // Get nodes with connections >= minConnections, sorted by connection count
    const topNodes = Array.from(nodeConnections.entries())
      .filter(([, connections]) => connections >= minConnections)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 50)
      .map(([id]) => id);

    setVisibleNodes(new Set(topNodes));
    setViewTrigger(prev => prev + 1);
  }, [graphDataRef.current.nodeMap.size, minConnections]);

  // Build React Flow nodes and edges with D3-FORCE layout
  useEffect(() => {
    if (!visibleNodes.size) return;

    const { nodeMap, edgeList, nodeConnections } = graphDataRef.current;
    
    // Create edges between visible nodes
    const visibleEdges = edgeList.filter(
      edge =>
        visibleNodes.has(edge.source_id) &&
        visibleNodes.has(edge.target_id) &&
        selectedRelTypes.has(edge.type)
    );

    // Build d3-force simulation nodes
    const simulationNodes = Array.from(visibleNodes).map(nodeId => ({
      id: nodeId,
      x: Math.random() * 800,
      y: Math.random() * 600,
    }));

    // Build d3-force simulation links
    const simulationLinks = visibleEdges.map(edge => ({
      source: edge.source_id,
      target: edge.target_id,
    }));

    // Create force simulation
    const simulation = d3.forceSimulation(simulationNodes as any)
      .force("link", d3.forceLink(simulationLinks).id((d: any) => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(400, 300))
      .force("collision", d3.forceCollide().radius(60))
      .stop();

    // Run simulation for 300 iterations to stabilize
    for (let i = 0; i < 300; i++) {
      simulation.tick();
    }

    // Create React Flow nodes with force-directed positions
    const flowNodes: Node[] = [];
    
    simulationNodes.forEach(simNode => {
      const node = nodeMap.get(simNode.id);
      if (!node) return;

      const connections = nodeConnections.get(simNode.id) || 0;
      const hasUnexploredConnections = expandedNodes.has(simNode.id) === false && connections > 0;

      flowNodes.push({
        id: simNode.id,
        type: "network",
        position: { x: simNode.x || 0, y: simNode.y || 0 },
        data: {
          id: simNode.id,
          label: node.name,
          nodeType: node.type,
          connections,
          evidenceCount: node.evidence_count || 0,
          canExpand: hasUnexploredConnections,
          isExpanded: expandedNodes.has(simNode.id),
          onClick: () => handleNodeClick(simNode.id),
        },
      });
    });

    // Create React Flow edges
    const flowEdges: Edge[] = visibleEdges.map((edge, idx) => ({
      id: `edge-${edge.source_id}-${edge.target_id}-${idx}`,
      source: edge.source_id,
      target: edge.target_id,
      type: "smoothstep",
      animated: false,
      label: edge.type,
      labelStyle: { fontSize: 10, fill: "#64748b" },
      labelBgStyle: { fill: "#0f172a", fillOpacity: 0.7 },
      style: {
        stroke: getRelationshipColor(edge.type),
        strokeWidth: 2,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: getRelationshipColor(edge.type),
      },
    }));

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [visibleNodes, expandedNodes, selectedRelTypes, setNodes, setEdges]);

  // Handle node click to expand/collapse with N-hop neighborhood
  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNode(nodeId);
    setShowDetails(true);

    const { adjacencyList } = graphDataRef.current;

    setExpandedNodes(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(nodeId)) {
        // Collapse - remove from expanded
        newExpanded.delete(nodeId);
      } else {
        // Expand - add to expanded
        newExpanded.add(nodeId);
        
        // Add N-hop neighborhood to visible nodes
        setVisibleNodes(prevVisible => {
          const newVisible = new Set(prevVisible);
          const nodesToExplore = [{ id: nodeId, depth: 0 }];
          const visited = new Set<string>([nodeId]);

          while (nodesToExplore.length > 0) {
            const current = nodesToExplore.shift()!;
            if (current.depth >= neighborhoodDepth) continue;

            const neighbors = adjacencyList.get(current.id) || new Set();
            neighbors.forEach(neighborId => {
              if (!visited.has(neighborId)) {
                visited.add(neighborId);
                newVisible.add(neighborId);
                nodesToExplore.push({ id: neighborId, depth: current.depth + 1 });
              }
            });
          }

          return newVisible;
        });
      }
      return newExpanded;
    });

    setViewTrigger(prev => prev + 1);
  }, [neighborhoodDepth]);

  // Search functionality
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    if (!term) return;

    const { nodeMap } = graphDataRef.current;
    const matchingNodes = Array.from(nodeMap.values())
      .filter(node => node.name.toLowerCase().includes(term.toLowerCase()))
      .map(node => node.id)
      .slice(0, 20);

    if (matchingNodes.length > 0) {
      setVisibleNodes(new Set(matchingNodes));
      setViewTrigger(prev => prev + 1);
    }
  }, []);

  // Get all relationship types for filtering
  const relationshipTypes = useMemo(() => {
    const types = new Set<string>();
    graphDataRef.current.edgeList.forEach(edge => {
      if (edge.type) types.add(edge.type);
    });
    return Array.from(types).sort();
  }, [graphDataRef.current.edgeList.length]);

  // Get details of selected node
  const selectedNodeDetails = useMemo(() => {
    if (!selectedNode) return null;
    const node = graphDataRef.current.nodeMap.get(selectedNode);
    if (!node) return null;

    const connections = graphDataRef.current.nodeConnections.get(selectedNode) || 0;
    const neighbors = Array.from(graphDataRef.current.adjacencyList.get(selectedNode) || []);
    const relatedEdges = graphDataRef.current.edgeList.filter(
      edge => edge.source_id === selectedNode || edge.target_id === selectedNode
    );

    return {
      ...node,
      connections,
      neighbors: neighbors.slice(0, 10),
      relatedEdges: relatedEdges.slice(0, 10),
    };
  }, [selectedNode]);

  const stats = {
    totalNodes: graphDataRef.current.nodeMap.size,
    totalEdges: graphDataRef.current.edgeList.length,
    visibleNodes: visibleNodes.size,
    visibleEdges: edges.length,
  };

  return (
    <div className={`relative ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : 'h-full w-full'}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        className="bg-background"
        minZoom={0.1}
        maxZoom={2}
      >
        <Background color="#94a3b8" gap={16} />
        <Controls />
        <ViewportCenterer nodes={nodes} trigger={viewTrigger} />
        <MiniMap
          nodeColor={(node) => {
            const type = node.data.nodeType;
            if (type === "Report") return "#3b82f6";
            if (type === "System") return "#8b5cf6";
            if (type === "DataEntity") return "#10b981";
            if (type === "Process") return "#f59e0b";
            return "#6b7280";
          }}
          maskColor="rgba(0, 0, 0, 0.2)"
        />
        
        {/* Search and Controls Panel */}
        <Panel position="top-left" className="bg-card/95 backdrop-blur border border-border rounded-lg p-3 shadow-lg">
          <div className="space-y-3 w-[280px]">
            <div className="flex items-center gap-2">
              <Network className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-sm">Relationship Network</h3>
            </div>

            {/* Search */}
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search nodes..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="h-8 flex-1"
                data-testid="input-network-search"
              />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-muted/50 rounded p-2">
                <div className="font-semibold text-primary">{stats.visibleNodes}</div>
                <div className="text-muted-foreground">Visible Nodes</div>
              </div>
              <div className="bg-muted/50 rounded p-2">
                <div className="font-semibold text-primary">{stats.visibleEdges}</div>
                <div className="text-muted-foreground">Relationships</div>
              </div>
            </div>

            {/* Instructions */}
            <div className="text-xs text-muted-foreground space-y-1 border-t border-border pt-2">
              <div>• Click nodes to expand connections</div>
              <div>• {stats.totalNodes} total concepts</div>
              <div>• {stats.totalEdges} total relationships</div>
            </div>
          </div>
        </Panel>

        {/* Filters Panel */}
        <Panel position="top-right" className="bg-card/95 backdrop-blur border border-border rounded-lg shadow-lg max-w-[300px]">
          <Collapsible open={showFilters} onOpenChange={setShowFilters}>
            <CollapsibleTrigger className="w-full p-3 flex items-center justify-between hover:bg-muted/50">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                <span className="text-sm font-semibold">Filters</span>
              </div>
              {showFilters ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="p-3 pt-0 space-y-3">
              {/* Relationship Type Filter */}
              <div className="space-y-2">
                <Label className="text-xs">Relationship Types</Label>
                <div className="max-h-[200px] overflow-y-auto space-y-1">
                  {relationshipTypes.map(type => (
                    <div key={type} className="flex items-center gap-2">
                      <Checkbox
                        id={`rel-${type}`}
                        checked={selectedRelTypes.has(type)}
                        onCheckedChange={(checked) => {
                          setSelectedRelTypes(prev => {
                            const newSet = new Set(prev);
                            if (checked) {
                              newSet.add(type);
                            } else {
                              newSet.delete(type);
                            }
                            return newSet;
                          });
                        }}
                      />
                      <label
                        htmlFor={`rel-${type}`}
                        className="text-xs cursor-pointer flex-1"
                        style={{ color: getRelationshipColor(type) }}
                      >
                        {type}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Min Connections Slider */}
              <div className="space-y-2">
                <Label className="text-xs">Min Connections: {minConnections}</Label>
                <Slider
                  value={[minConnections]}
                  onValueChange={([value]) => setMinConnections(value)}
                  min={1}
                  max={20}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Neighborhood Depth Slider */}
              <div className="space-y-2">
                <Label className="text-xs">Expansion Hops: {neighborhoodDepth}</Label>
                <Slider
                  value={[neighborhoodDepth]}
                  onValueChange={([value]) => setNeighborhoodDepth(value)}
                  min={1}
                  max={3}
                  step={1}
                  className="w-full"
                />
                <div className="text-[10px] text-muted-foreground">
                  {neighborhoodDepth === 1 ? "1 hop (immediate neighbors)" : `${neighborhoodDepth} hops (extended network)`}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Panel>

        {/* Node Details Panel */}
        {showDetails && selectedNodeDetails && (
          <Panel position="bottom-left" className="bg-card/95 backdrop-blur border border-border rounded-lg p-3 shadow-lg max-w-[400px]">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold">Node Details</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setShowDetails(false)}
                >
                  <EyeOff className="w-4 h-4" />
                </Button>
              </div>

              <div className="text-xs space-y-1">
                <div className="font-semibold text-foreground">{selectedNodeDetails.name}</div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-[10px]">{selectedNodeDetails.type}</Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    {selectedNodeDetails.connections} connections
                  </Badge>
                  {selectedNodeDetails.evidence_count && (
                    <Badge variant="secondary" className="text-[10px]">
                      {selectedNodeDetails.evidence_count} evidence
                    </Badge>
                  )}
                </div>

                {selectedNodeDetails.neighbors.length > 0 && (
                  <div className="mt-2">
                    <div className="text-muted-foreground mb-1">Connected to:</div>
                    <div className="space-y-0.5 max-h-[100px] overflow-y-auto">
                      {selectedNodeDetails.neighbors.map(neighborId => {
                        const neighbor = graphDataRef.current.nodeMap.get(neighborId);
                        return (
                          <div key={neighborId} className="text-[10px] text-muted-foreground truncate">
                            • {neighbor?.name || neighborId}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Panel>
        )}

        {/* Fullscreen Toggle */}
        <Panel position="bottom-right">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            data-testid="button-network-fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </Panel>
      </ReactFlow>
    </div>
  );
}
