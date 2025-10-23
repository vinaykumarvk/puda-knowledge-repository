import { useState, useEffect } from "react";
import { Map, Globe, BookMarked, Database, Network } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KnowledgeMindmap } from "@/components/knowledge-mindmap";

export default function AtlasPage() {
  const [knowledgeGraph, setKnowledgeGraph] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load the knowledge graph data
    const loadKnowledgeGraph = async () => {
      try {
        const response = await fetch("/attached_assets/master_knowledge_graph (7)_1761244211425.json");
        const data = await response.json();
        setKnowledgeGraph(data);
      } catch (error) {
        console.error("Failed to load knowledge graph:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadKnowledgeGraph();
  }, []);

  const resources = [
    {
      category: "Knowledge Base",
      items: ["Market Analysis Reports", "Investment Guidelines", "Compliance Documents", "Best Practices"]
    },
    {
      category: "Regulatory",
      items: ["SEC Regulations", "FINRA Rules", "Tax Guidelines", "Compliance Frameworks"]
    },
    {
      category: "Products",
      items: ["Mutual Funds", "ETFs", "Bonds", "Alternative Investments"]
    }
  ];

  return (
    <div className="flex-1 flex flex-col bg-background">
      <header className="border-b border-border bg-card/30 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center gap-3">
          <Map className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-atlas-title">
              Atlas
            </h1>
            <p className="text-sm text-muted-foreground">
              Navigate the complete knowledge map and resource library
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-full mx-auto">
          <Tabs defaultValue="mindmap" className="w-full">
            <TabsList className="mb-6" data-testid="tabs-atlas">
              <TabsTrigger value="mindmap" data-testid="tab-mindmap">
                <Network className="w-4 h-4 mr-2" />
                Knowledge Mindmap
              </TabsTrigger>
              <TabsTrigger value="overview" data-testid="tab-overview">
                <Globe className="w-4 h-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="resources" data-testid="tab-resources">
                <BookMarked className="w-4 h-4 mr-2" />
                Resources
              </TabsTrigger>
              <TabsTrigger value="data" data-testid="tab-data">
                <Database className="w-4 h-4 mr-2" />
                Data Sources
              </TabsTrigger>
            </TabsList>

            <TabsContent value="mindmap" className="space-y-6">
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle>Interactive Knowledge Graph</CardTitle>
                  <CardDescription>
                    Explore the wealth management knowledge base with {knowledgeGraph?.metadata?.consolidation_stats?.consolidated_nodes || 0} interconnected concepts
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="h-[calc(100vh-280px)] min-h-[600px]" data-testid="mindmap-container">
                    {isLoading ? (
                      <div className="h-full flex items-center justify-center bg-muted">
                        <div className="text-center space-y-3">
                          <Network className="w-16 h-16 text-muted-foreground mx-auto animate-pulse" />
                          <p className="text-muted-foreground">Loading knowledge graph...</p>
                        </div>
                      </div>
                    ) : knowledgeGraph ? (
                      <KnowledgeMindmap knowledgeGraphData={knowledgeGraph} />
                    ) : (
                      <div className="h-full flex items-center justify-center bg-muted">
                        <div className="text-center space-y-3">
                          <Network className="w-16 h-16 text-destructive mx-auto" />
                          <p className="text-destructive">Failed to load knowledge graph</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="overview" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Knowledge Map Statistics</CardTitle>
                  <CardDescription>
                    Overview of the consolidated knowledge base
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {knowledgeGraph?.metadata && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 rounded-lg border border-border bg-card/50">
                        <div className="text-2xl font-bold text-primary">
                          {knowledgeGraph.metadata.consolidation_stats.consolidated_nodes}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Total Nodes</div>
                      </div>
                      <div className="p-4 rounded-lg border border-border bg-card/50">
                        <div className="text-2xl font-bold text-primary">
                          {knowledgeGraph.metadata.consolidation_stats.consolidated_edges}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Relationships</div>
                      </div>
                      <div className="p-4 rounded-lg border border-border bg-card/50">
                        <div className="text-2xl font-bold text-primary">
                          {knowledgeGraph.metadata.total_source_documents}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Source Documents</div>
                      </div>
                      <div className="p-4 rounded-lg border border-border bg-card/50">
                        <div className="text-2xl font-bold text-primary">
                          {knowledgeGraph.metadata.consolidation_stats.duplicates_merged}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Duplicates Merged</div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="resources" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {resources.map((resource) => (
                  <Card key={resource.category} data-testid={`card-resource-${resource.category.toLowerCase().replace(/\s+/g, '-')}`}>
                    <CardHeader>
                      <CardTitle className="text-lg">{resource.category}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {resource.items.map((item) => (
                          <li key={item} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="data" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Connected Data Sources</CardTitle>
                  <CardDescription>
                    Information repositories powering the knowledge agent
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {["Vector Database", "Knowledge Graph", "Document Repository", "Market Data Feeds"].map((source) => (
                      <div
                        key={source}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border"
                        data-testid={`data-source-${source.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-sm font-medium">{source}</span>
                        <span className="text-xs text-muted-foreground ml-auto">Connected</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
