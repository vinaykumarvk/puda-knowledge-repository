import { Link, useLocation } from "wouter";
import { Compass, Wrench, Brain, Map } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    name: "Conversation",
    path: "/",
    icon: Compass,
    description: "Chat with the knowledge agent"
  },
  {
    name: "Workshop",
    path: "/workshop",
    icon: Wrench,
    description: "Interactive tools and utilities"
  },
  {
    name: "Quiz",
    path: "/quiz",
    icon: Brain,
    description: "Test your knowledge"
  },
  {
    name: "Atlas",
    path: "/atlas",
    icon: Map,
    description: "Knowledge map and resources"
  }
];

export function MainNavSidebar() {
  const [location] = useLocation();

  return (
    <div className="w-20 border-r border-border bg-card flex flex-col items-center py-6 gap-6">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location === item.path;
        
        return (
          <Link key={item.path} href={item.path}>
            <div
              className={cn(
                "flex flex-col items-center gap-2 p-3 rounded-lg transition-all cursor-pointer group",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              data-testid={`nav-${item.name.toLowerCase()}`}
              title={item.description}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs font-normal">{item.name}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
