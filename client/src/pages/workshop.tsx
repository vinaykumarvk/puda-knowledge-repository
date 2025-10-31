import { Wrench, FileEdit, FolderOpen, ListChecks, Clipboard, Shield, ScanSearch, LayoutDashboard, TrendingUp, Briefcase, CheckSquare, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";

export default function WorkshopPage() {
  const [, setLocation] = useLocation();
  const templates = [
    {
      name: "Investment Portal",
      description: "Complete investment management system with proposals, approvals, and tracking",
      icon: Briefcase,
      route: "/investment-portal",
    },
    {
      name: "RFP Generator",
      description: "Develop detailed responses to Request for Proposals efficiently",
      icon: Clipboard,
      route: "/rfp",
    },
    {
      name: "Solution Document Workplace",
      description: "Upload, read, edit, and work with solution documents",
      icon: FolderOpen,
    },
    {
      name: "Test Case Scenarios Creator",
      description: "Generate test cases using previously created documents",
      icon: ListChecks,
    },
    {
      name: "Market Regulation Checker",
      description: "Check compliance with CIBIL, AMCs, SEBI, and other regulatory bodies",
      icon: Shield,
    },
    {
      name: "Gap Finder",
      description: "Identify gaps between existing products and RFP requirements",
      icon: ScanSearch,
    }
  ];

  return (
    <div className="flex-1 flex flex-col bg-background">
      <header className="border-b border-border bg-card/30 backdrop-blur-sm px-6 py-2.5">
        <div className="flex items-center gap-2.5">
          <Wrench className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-foreground" data-testid="text-launchpad-title">
              Launchpad
            </h1>
            <p className="text-xs text-muted-foreground">
              Pre-developed templates for wealth management professionals
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => {
              const Icon = template.icon;
              const hasRoute = 'route' in template;
              return (
                <Card
                  key={template.name}
                  className={`hover:shadow-lg hover:border-primary/50 transition-all ${hasRoute ? 'cursor-pointer' : 'cursor-default opacity-60'} bg-card`}
                  onClick={() => {
                    if (hasRoute && template.route) {
                      setLocation(template.route);
                    }
                  }}
                  data-testid={`card-template-${template.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <CardHeader className="space-y-2.5 p-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">{template.name}</CardTitle>
                      <CardDescription className="mt-1.5 text-sm leading-snug">
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
