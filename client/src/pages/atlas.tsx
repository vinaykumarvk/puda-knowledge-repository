import { Map, Globe, BookMarked, Database } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AtlasPage() {
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
    <div className="flex-1 flex flex-col h-screen bg-background">
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
        <div className="max-w-6xl mx-auto">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="mb-6" data-testid="tabs-atlas">
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

            <TabsContent value="overview" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Knowledge Map</CardTitle>
                  <CardDescription>
                    Visual representation of the wealth management knowledge base
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px] rounded-lg bg-muted flex items-center justify-center">
                    <div className="text-center space-y-3">
                      <Map className="w-16 h-16 text-muted-foreground mx-auto" />
                      <p className="text-muted-foreground">
                        Interactive knowledge map coming soon
                      </p>
                    </div>
                  </div>
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
