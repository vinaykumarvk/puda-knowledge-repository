import { useCallback, useState, useEffect, useRef, useMemo } from "react";
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
import * as d3 from "d3-force";
import "reactflow/dist/style.css";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Maximize2, X, BookOpen, FileText, Trophy, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TopicBubble {
  id: string;
  name: string;
  category: string;
  size: number;
  type: "category" | "topic";
  description?: string;
  keyPoints?: string[];
  evidenceCount?: number;
  relatedQuizzes?: number;
  connectedTopics?: string[];
  subtopics?: string[]; // IDs of subtopic nodes
  originalNodeData?: any; // Store original knowledge graph node
}

interface SimplifiedTopicNetworkProps {
  knowledgeGraphData?: any;
}

// Custom node component for topic bubbles
function TopicBubbleNode({ data }: NodeProps) {
  const getNodeColor = (category: string, type: string) => {
    if (type === "category") {
      const colors: Record<string, string> = {
        "Order Journey & Processes": "bg-blue-500/30 border-blue-500 border-2",
        "Customer & Account Management": "bg-purple-500/30 border-purple-500 border-2",
        "Products & Securities": "bg-green-500/30 border-green-500 border-2",
        "Transactions & Operations": "bg-amber-500/30 border-amber-500 border-2",
        "Systems & Integration": "bg-cyan-500/30 border-cyan-500 border-2",
        "Compliance & Regulations": "bg-red-500/30 border-red-500 border-2",
        "Reports & Documents": "bg-indigo-500/30 border-indigo-500 border-2",
      };
      return colors[category] || "bg-gray-500/30 border-gray-500 border-2";
    } else {
      const colors: Record<string, string> = {
        "Order Journey & Processes": "bg-blue-500/20 border-blue-400",
        "Customer & Account Management": "bg-purple-500/20 border-purple-400",
        "Products & Securities": "bg-green-500/20 border-green-400",
        "Transactions & Operations": "bg-amber-500/20 border-amber-400",
        "Systems & Integration": "bg-cyan-500/20 border-cyan-400",
        "Compliance & Regulations": "bg-red-500/20 border-red-400",
        "Reports & Documents": "bg-indigo-500/20 border-indigo-400",
      };
      return colors[category] || "bg-gray-500/20 border-gray-400";
    }
  };

  const getNodeSize = (type: string, size: number) => {
    if (type === "category") {
      return { width: "120px", height: "120px", fontSize: "13px" };
    } else {
      const scaledSize = Math.max(60, Math.min(90, 60 + size / 10));
      return { width: `${scaledSize}px`, height: `${scaledSize}px`, fontSize: "11px" };
    }
  };

  const sizes = getNodeSize(data.type, data.size);

  return (
    <div
      className={`rounded-full ${getNodeColor(data.category, data.type)} cursor-pointer hover:shadow-2xl hover:scale-110 transition-all duration-300 flex items-center justify-center p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
      style={{ width: sizes.width, height: sizes.height }}
      data-testid={`topic-bubble-${data.id}`}
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
      <div className="text-center">
        <div className={`font-semibold text-foreground leading-tight`} style={{ fontSize: sizes.fontSize }}>
          {data.label}
        </div>
        {data.type === "topic" && data.evidenceCount && (
          <div className="text-[9px] text-muted-foreground mt-1">
            {data.evidenceCount} refs
          </div>
        )}
      </div>
    </div>
  );
}

const nodeTypes = {
  bubble: TopicBubbleNode,
};

// Detail panel component with subtopics
function TopicDetailPanel({ 
  topic, 
  onClose, 
  allTopics,
  onTopicClick 
}: { 
  topic: TopicBubble | null; 
  onClose: () => void;
  allTopics: TopicBubble[];
  onTopicClick: (topicId: string) => void;
}) {
  if (!topic) return null;

  const connectedTopics = allTopics.filter(t => topic.connectedTopics?.includes(t.id));
  const subtopicsList = allTopics.filter(t => topic.subtopics?.includes(t.id));

  return (
    <Card className="w-[400px] h-full flex flex-col shadow-2xl border-2">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl mb-1">{topic.name}</CardTitle>
            <CardDescription className="text-sm">{topic.category}</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-detail">
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex gap-2 mt-3 flex-wrap">
          {topic.evidenceCount && (
            <Badge variant="secondary" className="text-xs">
              <FileText className="w-3 h-3 mr-1" />
              {topic.evidenceCount} sources
            </Badge>
          )}
          {topic.relatedQuizzes && (
            <Badge variant="secondary" className="text-xs">
              <Trophy className="w-3 h-3 mr-1" />
              {topic.relatedQuizzes} quizzes
            </Badge>
          )}
          {subtopicsList.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {subtopicsList.length} subtopics
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-6 mb-2">
          <TabsTrigger value="overview" className="text-xs" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="subtopics" className="text-xs" data-testid="tab-subtopics">Subtopics</TabsTrigger>
          <TabsTrigger value="learn" className="text-xs" data-testid="tab-learn">Learn</TabsTrigger>
          <TabsTrigger value="practice" className="text-xs" data-testid="tab-practice">Practice</TabsTrigger>
        </TabsList>
        
        <ScrollArea className="flex-1 px-6">
          <TabsContent value="overview" className="mt-0 space-y-4">
            <div>
              <h4 className="text-sm font-semibold mb-2">Description</h4>
              <p className="text-sm text-muted-foreground">
                {topic.description || `Learn about ${topic.name} and its role in wealth management operations.`}
              </p>
            </div>
            
            {topic.keyPoints && topic.keyPoints.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Key Concepts</h4>
                <ul className="space-y-2">
                  {topic.keyPoints.map((point, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-start">
                      <span className="text-primary mr-2">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {connectedTopics.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Related Topics</h4>
                <div className="flex flex-wrap gap-2">
                  {connectedTopics.slice(0, 8).map((connectedTopic) => (
                    <Button
                      key={connectedTopic.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => onTopicClick(connectedTopic.id)}
                      data-testid={`badge-related-${connectedTopic.id}`}
                      aria-label={`Open ${connectedTopic.name}`}
                    >
                      {connectedTopic.name.length > 20 ? connectedTopic.name.substring(0, 17) + "..." : connectedTopic.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="subtopics" className="mt-0 space-y-4">
            <div>
              <h4 className="text-sm font-semibold mb-3">Explore Deeper</h4>
              {subtopicsList.length > 0 ? (
                <div className="space-y-2">
                  {subtopicsList.map((subtopic) => (
                    <button
                      key={subtopic.id}
                      type="button"
                      className="flex w-full items-center justify-between rounded-lg border border-border p-3 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      onClick={() => onTopicClick(subtopic.id)}
                      data-testid={`subtopic-${subtopic.id}`}
                      aria-label={`Open ${subtopic.name}`}
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium">{subtopic.name}</div>
                        {subtopic.evidenceCount && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {subtopic.evidenceCount} evidence sources
                          </div>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg text-center">
                  This is a fundamental concept with no subtopics. Explore related topics from the Overview tab.
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="learn" className="mt-0 space-y-4">
            <div>
              <h4 className="text-sm font-semibold mb-2">Deep Dive</h4>
              <p className="text-sm text-muted-foreground mb-3">
                {topic.description || `${topic.name} is a critical component in wealth management systems.`}
              </p>
              
              {topic.originalNodeData && (
                <div className="space-y-3">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h5 className="text-xs font-semibold mb-2">Technical Details</h5>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div><span className="font-medium">Type:</span> {topic.originalNodeData.type || 'N/A'}</div>
                      <div><span className="font-medium">ID:</span> {topic.originalNodeData.id || topic.id}</div>
                      {topic.originalNodeData.aliases && topic.originalNodeData.aliases.length > 0 && (
                        <div><span className="font-medium">Also known as:</span> {topic.originalNodeData.aliases.slice(0, 3).filter(Boolean).join(", ") || "N/A"}</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <p className="text-xs text-muted-foreground italic">
                      Educational content, case studies, and detailed explanations would be displayed here based on the knowledge graph evidence and documentation.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="practice" className="mt-0 space-y-4">
            <div>
              <h4 className="text-sm font-semibold mb-2">Test Your Knowledge</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Reinforce your learning with quizzes and practical exercises.
              </p>
              <div className="space-y-3">
                <Button className="w-full justify-start" variant="outline" data-testid="button-take-quiz">
                  <Trophy className="w-4 h-4 mr-2" />
                  Take Quiz on {topic.name}
                </Button>
                <Button className="w-full justify-start" variant="outline" data-testid="button-flashcards">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Study Flashcards
                </Button>
                {topic.relatedQuizzes && topic.relatedQuizzes > 0 && (
                  <div className="text-xs text-muted-foreground text-center pt-2">
                    {topic.relatedQuizzes} practice questions available
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </Card>
  );
}

export function SimplifiedTopicNetwork({ knowledgeGraphData }: SimplifiedTopicNetworkProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<TopicBubble | null>(null);
  const topicBubblesRef = useRef<TopicBubble[]>([]);

  // Build simplified topic structure with real connections
  const topicBubbles = useMemo(() => {
    if (!knowledgeGraphData?.nodes || !knowledgeGraphData?.edges) return [];

    const allNodes = knowledgeGraphData.nodes;
    const allEdges = knowledgeGraphData.edges;

    // Categorization function
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
      if (name.includes("compliance") || name.includes("regulation") || name.includes("sebi")) {
        return "Compliance & Regulations";
      }
      if (type.includes("report") || name.includes("report") || name.includes("document")) {
        return "Reports & Documents";
      }
      
      return "Other";
    };

    // Group nodes by category
    const categories: Record<string, any[]> = {};
    allNodes.forEach((node: any) => {
      const category = categorizeNode(node);
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(node);
    });

    delete categories["Other"];

    const bubbles: TopicBubble[] = [];
    const categoryNames = Object.keys(categories);
    const nodeIdToBubbleId = new Map<string, string>();

    // Create category bubbles
    categoryNames.forEach((category) => {
      const totalEvidence = categories[category].reduce((sum, n) => sum + (n.evidence_count || 0), 0);
      const catBubbleId = `cat-${category.toLowerCase().replace(/\s+/g, "-")}`;
      bubbles.push({
        id: catBubbleId,
        name: category,
        category,
        size: totalEvidence,
        type: "category",
        description: `Explore ${categories[category].length} concepts related to ${category.toLowerCase()}`,
        evidenceCount: totalEvidence,
        relatedQuizzes: Math.floor(categories[category].length / 2),
        connectedTopics: [],
        subtopics: [],
      });
    });

    // Create topic bubbles (top 4 from each category)
    categoryNames.forEach((category) => {
      const topNodes = categories[category]
        .sort((a, b) => (b.evidence_count || 0) - (a.evidence_count || 0))
        .slice(0, 4);

      topNodes.forEach((node, idx) => {
        const topicId = `topic-${category.toLowerCase().replace(/\s+/g, "-")}-${idx}`;
        const catBubbleId = `cat-${category.toLowerCase().replace(/\s+/g, "-")}`;
        
        // Map original node ID to this bubble ID
        nodeIdToBubbleId.set(node.id, topicId);
        
        bubbles.push({
          id: topicId,
          name: node.name.length > 30 ? node.name.substring(0, 27) + "..." : node.name,
          category,
          size: node.evidence_count || 10,
          type: "topic",
          description: `Learn about ${node.name} and how it fits into ${category}`,
          keyPoints: [
            `Type: ${node.type}`, 
            `Evidence sources: ${node.evidence_count || 0}`,
            "Core concept in wealth management"
          ],
          evidenceCount: node.evidence_count || 0,
          relatedQuizzes: Math.floor(Math.random() * 5) + 1,
          connectedTopics: [],
          subtopics: [],
          originalNodeData: node,
        });

        // Add to category's subtopics
        const catBubble = bubbles.find(b => b.id === catBubbleId);
        if (catBubble && !catBubble.subtopics?.includes(topicId)) {
          catBubble.subtopics?.push(topicId);
        }
      });
    });

    // Add subtopics for each topic based on connected nodes in knowledge graph
    categoryNames.forEach((category) => {
      const topNodes = categories[category]
        .sort((a, b) => (b.evidence_count || 0) - (a.evidence_count || 0))
        .slice(0, 4);

      topNodes.forEach((node, idx) => {
        const topicId = `topic-${category.toLowerCase().replace(/\s+/g, "-")}-${idx}`;
        const topicBubble = bubbles.find(b => b.id === topicId);
        if (!topicBubble) return;

        // Find all nodes connected to this node in the knowledge graph
        const connectedNodeIds = new Set<string>();
        allEdges.forEach((edge: any) => {
          if (edge.source_id === node.id) {
            connectedNodeIds.add(edge.target_id);
          } else if (edge.target_id === node.id) {
            connectedNodeIds.add(edge.source_id);
          }
        });

        // Find the actual nodes for these IDs
        const connectedNodes = Array.from(connectedNodeIds)
          .map(id => allNodes.find((n: any) => n.id === id))
          .filter(Boolean)
          .sort((a: any, b: any) => (b.evidence_count || 0) - (a.evidence_count || 0))
          .slice(0, 3); // Top 3 connected nodes as subtopics

        // Create subtopic entries for these connected nodes
        connectedNodes.forEach((connectedNode: any, subIdx) => {
          const subtopicId = `subtopic-${topicId}-${subIdx}`;
          
          // Only create if not already a bubble
          if (!nodeIdToBubbleId.has(connectedNode.id)) {
            nodeIdToBubbleId.set(connectedNode.id, subtopicId);
            
            bubbles.push({
              id: subtopicId,
              name: connectedNode.name.length > 30 ? connectedNode.name.substring(0, 27) + "..." : connectedNode.name,
              category,
              size: connectedNode.evidence_count || 5,
              type: "topic",
              description: `Related concept: ${connectedNode.name}`,
              keyPoints: [
                `Type: ${connectedNode.type}`,
                `Evidence sources: ${connectedNode.evidence_count || 0}`,
                `Connected to ${node.name}`
              ],
              evidenceCount: connectedNode.evidence_count || 0,
              relatedQuizzes: Math.floor(Math.random() * 3) + 1,
              connectedTopics: [],
              subtopics: [],
              originalNodeData: connectedNode,
            });
          }
          
          // Add to parent topic's subtopics
          const existingBubbleId = nodeIdToBubbleId.get(connectedNode.id);
          if (existingBubbleId && !topicBubble.subtopics?.includes(existingBubbleId)) {
            topicBubble.subtopics?.push(existingBubbleId);
          }
        });
      });
    });

    // Now add real connections from knowledge graph edges
    allEdges.forEach((edge: any) => {
      const sourceBubbleId = nodeIdToBubbleId.get(edge.source_id);
      const targetBubbleId = nodeIdToBubbleId.get(edge.target_id);
      
      if (sourceBubbleId && targetBubbleId && sourceBubbleId !== targetBubbleId) {
        const sourceBubble = bubbles.find(b => b.id === sourceBubbleId);
        const targetBubble = bubbles.find(b => b.id === targetBubbleId);
        
        if (sourceBubble && targetBubble) {
          // Add bidirectional connections
          if (!sourceBubble.connectedTopics?.includes(targetBubbleId)) {
            sourceBubble.connectedTopics?.push(targetBubbleId);
          }
          if (!targetBubble.connectedTopics?.includes(sourceBubbleId)) {
            targetBubble.connectedTopics?.push(sourceBubbleId);
          }
        }
      }
    });

    return bubbles;
  }, [knowledgeGraphData]);

  // Build graph with force-directed layout and real connections
  useEffect(() => {
    if (topicBubbles.length === 0) return;

    topicBubblesRef.current = topicBubbles;

    interface SimNode extends d3.SimulationNodeDatum {
      id: string;
      size: number;
      type: string;
    }

    const simNodes: SimNode[] = topicBubbles.map(b => ({
      id: b.id,
      size: b.size,
      type: b.type,
    }));

    // Create edges from real connections
    const simEdges: { source: string; target: string; type: string }[] = [];
    
    // Category to topic connections
    topicBubbles.forEach((bubble) => {
      if (bubble.type === "category" && bubble.subtopics) {
        bubble.subtopics.forEach((subtopicId) => {
          simEdges.push({ source: bubble.id, target: subtopicId, type: "hierarchy" });
        });
      }
    });

    // Topic to topic connections (real relationships)
    topicBubbles.forEach((bubble) => {
      if (bubble.type === "topic" && bubble.connectedTopics) {
        bubble.connectedTopics.forEach((connectedId) => {
          // Avoid duplicates
          if (!simEdges.some(e => 
            (e.source === bubble.id && e.target === connectedId) ||
            (e.source === connectedId && e.target === bubble.id)
          )) {
            simEdges.push({ source: bubble.id, target: connectedId, type: "relationship" });
          }
        });
      }
    });

    // Run force simulation
    const simulation = d3.forceSimulation(simNodes)
      .force("link", d3.forceLink(simEdges).id((d: any) => d.id).distance(120).strength(0.3))
      .force("charge", d3.forceManyBody().strength(-600))
      .force("center", d3.forceCenter(400, 300))
      .force("collision", d3.forceCollide().radius((d: any) => d.type === "category" ? 80 : 50));

    for (let i = 0; i < 300; i++) {
      simulation.tick();
    }

    // Create React Flow nodes
    const flowNodes: Node[] = simNodes.map(simNode => {
      const bubble = topicBubbles.find(b => b.id === simNode.id)!;
      return {
        id: simNode.id,
        type: "bubble",
        position: { x: simNode.x || 0, y: simNode.y || 0 },
        data: {
          id: bubble.id,
          label: bubble.name,
          category: bubble.category,
          type: bubble.type,
          size: bubble.size,
          evidenceCount: bubble.evidenceCount,
          onClick: () => handleBubbleClick(bubble.id),
        },
      };
    });

    // Create React Flow edges
    const flowEdges: Edge[] = simEdges.map((edge, idx) => {
      const isRelationship = edge.type === "relationship";
      return {
        id: `edge-${edge.source}-${edge.target}-${idx}`,
        source: edge.source as string,
        target: edge.target as string,
        type: "straight",
        animated: false,
        style: {
          stroke: isRelationship ? "#10b981" : "#999",
          strokeWidth: isRelationship ? 2 : 1.5,
          opacity: isRelationship ? 0.7 : 0.5,
        },
      };
    });

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [topicBubbles, setNodes, setEdges]);

  // Handle bubble click
  const handleBubbleClick = useCallback((bubbleId: string) => {
    const bubble = topicBubblesRef.current.find(b => b.id === bubbleId);
    if (bubble) {
      setSelectedTopic(bubble);
    }
  }, []);

  // Handle topic click from detail panel
  const handleTopicClickFromPanel = useCallback((topicId: string) => {
    const topic = topicBubblesRef.current.find(t => t.id === topicId);
    if (topic) {
      setSelectedTopic(topic);
    }
  }, []);

  // Handle search
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setNodes(nodes => nodes.map(n => ({ ...n, hidden: false })));
      return;
    }

    setNodes(nodes => nodes.map(node => ({
      ...node,
      hidden: !node.data.label.toLowerCase().includes(term.toLowerCase()),
    })));
  }, [setNodes]);

  const visibleNodeCount = nodes.filter(n => !n.hidden).length;
  const totalConnections = topicBubbles.reduce((sum, b) => sum + (b.connectedTopics?.length || 0), 0) / 2;

  return (
    <div className="relative w-full h-full flex">
      <div className={`flex-1 ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : ''}`}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.2}
          maxZoom={2}
          className="bg-background"
          data-testid="simplified-topic-network"
        >
          <Background />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              if (node.data.type === "category") return "#3b82f6";
              return "#94a3b8";
            }}
            maskColor="rgba(0, 0, 0, 0.1)"
          />
          
          <Panel position="top-left" className="bg-card/95 backdrop-blur-sm rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search topics..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-64 h-8"
                data-testid="input-search-topics"
              />
            </div>
            
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500/30 border-2 border-blue-500" />
                <span className="text-xs text-muted-foreground">Categories ({topicBubbles.filter(b => b.type === "category").length})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-400" />
                <span className="text-xs text-muted-foreground">Topics ({topicBubbles.filter(b => b.type === "topic").length})</span>
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground">
              <div>Showing {visibleNodeCount} of {topicBubbles.length} topics</div>
              <div className="mt-1">{Math.round(totalConnections)} real connections</div>
              <div className="mt-1 text-[10px]">Click bubbles to explore & learn</div>
            </div>
          </Panel>

          <Panel position="top-right">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              data-testid="button-fullscreen-toggle"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </Panel>
        </ReactFlow>
      </div>

      {selectedTopic && (
        <div className="h-full border-l flex-shrink-0" data-testid="topic-detail-panel">
          <TopicDetailPanel
            topic={selectedTopic}
            onClose={() => setSelectedTopic(null)}
            allTopics={topicBubbles}
            onTopicClick={handleTopicClickFromPanel}
          />
        </div>
      )}
    </div>
  );
}
