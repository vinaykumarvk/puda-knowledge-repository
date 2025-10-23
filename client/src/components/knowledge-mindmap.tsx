import { useCallback, useState, useEffect } from "react";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MiniMap,
  Panel,
  NodeProps,
  Handle,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, ZoomIn, ZoomOut, Maximize2, Database } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Custom node component for knowledge graph nodes
function KnowledgeNode({ data }: NodeProps) {
  const getNodeColor = (level: number) => {
    const colors: Record<number, string> = {
      0: "bg-primary/30 border-primary border-2", // Root
      1: "bg-blue-500/20 border-blue-500", // Level 1
      2: "bg-green-500/20 border-green-500", // Level 2
    };
    return colors[level] || "bg-gray-500/20 border-gray-500";
  };

  const getNodeSize = (level: number) => {
    if (level === 0) return "min-w-[200px] max-w-[250px]"; // Root - largest
    if (level === 1) return "min-w-[160px] max-w-[200px]"; // Level 1 - medium
    return "min-w-[140px] max-w-[180px]"; // Level 2 - smallest
  };

  return (
    <>
      {/* Input handle (target) - receives connections from parent */}
      {data.level > 0 && (
        <Handle
          type="target"
          position={Position.Top}
          style={{ background: '#555' }}
        />
      )}
      
      <Card
        className={`p-3 ${getNodeSize(data.level)} ${getNodeColor(data.level)} cursor-pointer hover:shadow-lg transition-all`}
        data-testid={`mindmap-node-${data.id}`}
      >
        <div className="space-y-1">
          {data.level === 0 && (
            <Database className="w-5 h-5 text-primary mx-auto mb-2" />
          )}
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
      
      {/* Output handle (source) - sends connections to children */}
      {data.level < 2 && (
        <Handle
          type="source"
          position={Position.Bottom}
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

export function KnowledgeMindmap({ knowledgeGraphData }: KnowledgeMindmapProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Build hierarchical tree structure from knowledge graph
  useEffect(() => {
    if (!knowledgeGraphData?.nodes) return;

    // Categorize nodes into meaningful groups
    const categorizeNode = (node: any): string => {
      const name = node.name.toLowerCase();
      const type = node.type?.toLowerCase() || "";
      
      // Order Journey & Processes
      if (name.includes("order") || name.includes("placement") || name.includes("settlement")) {
        return "Order Journey & Processes";
      }
      // Customer & Account Management
      if (name.includes("customer") || name.includes("account") || name.includes("investor") || name.includes("kyc")) {
        return "Customer & Account Management";
      }
      // Products & Securities
      if (name.includes("product") || name.includes("fund") || name.includes("security") || name.includes("portfolio")) {
        return "Products & Securities";
      }
      // Transactions & Operations
      if (name.includes("transaction") || name.includes("redemption") || name.includes("sip") || name.includes("swp") || name.includes("stp")) {
        return "Transactions & Operations";
      }
      // Systems & Integration
      if (type.includes("system") || name.includes("api") || name.includes("integration")) {
        return "Systems & Integration";
      }
      // Compliance & Regulations
      if (name.includes("compliance") || name.includes("regulation") || name.includes("sebi") || name.includes("kyc")) {
        return "Compliance & Regulations";
      }
      // Reports & Documents
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

    // Remove "Other" category if it has too few items
    if (categories["Other"] && categories["Other"].length < 5) {
      delete categories["Other"];
    }

    // Create hierarchical layout
    const graphNodes: Node[] = [];
    const graphEdges: Edge[] = [];

    // Root node (Level 0)
    const rootX = 800;
    const rootY = 100;
    graphNodes.push({
      id: "root",
      type: "knowledge",
      position: { x: rootX, y: rootY },
      data: {
        id: "root",
        label: "Order Management & Wealth Operations",
        level: 0,
        count: knowledgeGraphData.nodes.length,
      },
    });

    // Level 1: Main categories arranged in a semi-circle around root
    const categoryNames = Object.keys(categories).filter(cat => cat !== "Other");
    const level1Radius = 400;
    const level1StartAngle = -Math.PI / 2; // Start from top
    const level1AngleStep = Math.PI / (categoryNames.length - 1 || 1);

    categoryNames.forEach((category, catIndex) => {
      const angle = level1StartAngle + (catIndex * level1AngleStep);
      const x = rootX + level1Radius * Math.cos(angle);
      const y = rootY + 300 + level1Radius * Math.sin(angle);

      const categoryId = `cat-${catIndex}`;
      graphNodes.push({
        id: categoryId,
        type: "knowledge",
        position: { x, y },
        data: {
          id: categoryId,
          label: category,
          level: 1,
          count: categories[category].length,
        },
      });

      // Edge from root to category
      graphEdges.push({
        id: `edge-root-${categoryId}`,
        source: "root",
        target: categoryId,
        type: "smoothstep",
        animated: false,
        style: { stroke: "#3b82f6", strokeWidth: 2 },
      });

      // Level 2: Subcategories/items - show top 5 most relevant per category
      const subcategories = categories[category]
        .sort((a, b) => (b.evidence_count || 0) - (a.evidence_count || 0))
        .slice(0, 5);

      const level2Radius = 200;
      const level2AngleStep = (Math.PI / 3) / (subcategories.length - 1 || 1);
      const level2StartAngle = angle - Math.PI / 6;

      subcategories.forEach((node: any, nodeIndex) => {
        const subAngle = level2StartAngle + (nodeIndex * level2AngleStep);
        const subX = x + level2Radius * Math.cos(subAngle);
        const subY = y + level2Radius * Math.sin(subAngle);

        const nodeId = `node-${catIndex}-${nodeIndex}`;
        graphNodes.push({
          id: nodeId,
          type: "knowledge",
          position: { x: subX, y: subY },
          data: {
            id: nodeId,
            label: node.name,
            level: 2,
            type: node.type,
            evidenceCount: node.evidence_count,
          },
        });

        // Edge from category to subcategory
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

    setNodes(graphNodes);
    setEdges(graphEdges);
  }, [knowledgeGraphData, setNodes, setEdges]);

  // Filter nodes based on search
  const filteredNodes = nodes.map(node => ({
    ...node,
    hidden: searchTerm ? !node.data.label.toLowerCase().includes(searchTerm.toLowerCase()) : false,
  }));

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const categoryCount = nodes.filter(n => n.data.level === 1).length;
  const itemCount = nodes.filter(n => n.data.level === 2).length;

  return (
    <div className={`relative ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : 'h-full w-full'}`}>
      <ReactFlow
        nodes={filteredNodes}
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
              <div className="font-semibold">Hierarchical Structure:</div>
              <div>• 1 Root (Order Management)</div>
              <div>• {categoryCount} Categories (Level 1)</div>
              <div>• {itemCount} Items (Level 2)</div>
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
