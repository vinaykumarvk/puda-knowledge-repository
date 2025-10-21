import { Wrench, FileText, Upload, Network, Presentation, Clipboard, BookOpen } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function WorkshopPage() {
  const templates = [
    {
      name: "New Report",
      description: "Generate comprehensive financial or market analysis reports.",
      icon: FileText,
    },
    {
      name: "Client Proposal",
      description: "Craft compelling proposals for new clients or projects.",
      icon: Upload,
    },
    {
      name: "Strategic Memo",
      description: "Compose internal memos for strategic initiatives or announcements.",
      icon: Network,
    },
    {
      name: "Presentation Deck",
      description: "Create visually engaging presentations for meetings or conferences.",
      icon: Presentation,
    },
    {
      name: "RFP Response",
      description: "Develop detailed responses to Request for Proposals efficiently.",
      icon: Clipboard,
    },
    {
      name: "Case Study",
      description: "Document successful projects and client outcomes.",
      icon: BookOpen,
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
              Pre-developed templates for wealth management professionals
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => {
              const Icon = template.icon;
              return (
                <Card
                  key={template.name}
                  className="hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer bg-card"
                  data-testid={`card-template-${template.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <CardHeader className="space-y-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold">{template.name}</CardTitle>
                      <CardDescription className="mt-2 text-sm leading-relaxed">
                        {template.description}
                      </CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
