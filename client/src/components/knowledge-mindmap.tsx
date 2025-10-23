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
} from "reactflow";
import "reactflow/dist/style.css";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Custom node component for knowledge graph nodes
function KnowledgeNode({ data }: NodeProps) {
  const getNodeColor = (type: string) => {
    const colors: Record<string, string> = {
      Report: "bg-blue-500/20 border-blue-500",
      DataEntity: "bg-green-500/20 border-green-500",
      System: "bg-purple-500/20 border-purple-500",
      Process: "bg-orange-500/20 border-orange-500",
      Person: "bg-pink-500/20 border-pink-500",
      default: "bg-gray-500/20 border-gray-500",
    };
    return colors[type] || colors.default;
  };

  return (
    <Card
      className={`p-3 min-w-[150px] max-w-[200px] ${getNodeColor(data.type)} cursor-pointer hover:shadow-lg transition-all`}
      data-testid={`mindmap-node-${data.id}`}
    >
      <div className="space-y-1">
        <div className="text-xs font-semibold text-foreground truncate" title={data.label}>
          {data.label}
        </div>
        <Badge variant="outline" className="text-[10px]">
          {data.type}
        </Badge>
        {data.evidenceCount && (
          <div className="text-[10px] text-muted-foreground">
            {data.evidenceCount} references
          </div>
        )}
      </div>
    </Card>
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

  // Process knowledge graph data into React Flow format
  useEffect(() => {
    if (!knowledgeGraphData) return;

    const graphNodes: Node[] = [];
    const graphEdges: Edge[] = [];

    // Convert nodes - use a circular layout
    if (knowledgeGraphData.nodes) {
      const nodeCount = Math.min(knowledgeGraphData.nodes.length, 100); // Limit to first 100 for performance
      const radius = 400;
      const centerX = 500;
      const centerY = 400;

      knowledgeGraphData.nodes.slice(0, nodeCount).forEach((node: any, index: number) => {
        const angle = (index / nodeCount) * 2 * Math.PI;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);

        graphNodes.push({
          id: node.id,
          type: "knowledge",
          position: { x, y },
          data: {
            id: node.id,
            label: node.name || node.id,
            type: node.type || "Unknown",
            evidenceCount: node.evidence_count,
            properties: node.properties,
          },
        });
      });
    }

    // Convert edges
    if (knowledgeGraphData.edges) {
      const nodeIds = new Set(graphNodes.map(n => n.id));
      
      knowledgeGraphData.edges.forEach((edge: any, index: number) => {
        // Only add edges where both source and target exist in our node set
        if (nodeIds.has(edge.source_id) && nodeIds.has(edge.target_id)) {
          graphEdges.push({
            id: `edge-${index}`,
            source: edge.source_id,
            target: edge.target_id,
            type: "smoothstep",
            animated: true,
            label: edge.type || "",
            style: { stroke: "#94a3b8", strokeWidth: 1 },
            labelStyle: { fontSize: 10, fill: "#64748b" },
          });
        }
      });
    }

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
      >
        <Background color="#94a3b8" gap={16} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const type = node.data.type;
            if (type === "Report") return "#3b82f6";
            if (type === "DataEntity") return "#10b981";
            if (type === "System") return "#a855f7";
            if (type === "Process") return "#f97316";
            return "#6b7280";
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
            {knowledgeGraphData?.metadata && (
              <div className="text-xs text-muted-foreground space-y-0.5">
                <div>{knowledgeGraphData.metadata.consolidation_stats?.consolidated_nodes || 0} nodes</div>
                <div>{knowledgeGraphData.metadata.consolidation_stats?.consolidated_edges || 0} edges</div>
                <div>{knowledgeGraphData.metadata.total_source_documents || 0} documents</div>
              </div>
            )}
          </div>
        </Panel>

        {/* Legend Panel */}
        <Panel position="top-right" className="bg-card/95 backdrop-blur border border-border rounded-lg p-3 shadow-lg">
          <div className="text-xs font-semibold mb-2">Node Types</div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-500/20 border border-blue-500" />
              <span>Report</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500/20 border border-green-500" />
              <span>Data Entity</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-purple-500/20 border border-purple-500" />
              <span>System</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-orange-500/20 border border-orange-500" />
              <span>Process</span>
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
