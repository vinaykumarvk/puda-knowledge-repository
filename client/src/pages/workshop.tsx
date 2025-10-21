import { Wrench, Calculator, FileText, BarChart } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function WorkshopPage() {
  const tools = [
    {
      name: "Calculator",
      description: "Financial calculations and analysis",
      icon: Calculator,
      comingSoon: true
    },
    {
      name: "Document Builder",
      description: "Generate custom documents and reports",
      icon: FileText,
      comingSoon: true
    },
    {
      name: "Analytics Dashboard",
      description: "Visualize wealth management data",
      icon: BarChart,
      comingSoon: true
    }
  ];

  return (
    <div className="flex-1 flex flex-col h-screen bg-background">
      <header className="border-b border-border bg-card/30 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center gap-3">
          <Wrench className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-workshop-title">
              Workshop
            </h1>
            <p className="text-sm text-muted-foreground">
              Interactive tools and utilities for wealth management
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Card
                  key={tool.name}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  data-testid={`card-tool-${tool.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      {tool.comingSoon && (
                        <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                          Coming Soon
                        </span>
                      )}
                    </div>
                    <CardTitle>{tool.name}</CardTitle>
                    <CardDescription>{tool.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      This tool will help you with {tool.description.toLowerCase()}.
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
