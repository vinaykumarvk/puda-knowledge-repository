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
    name: "Launchpad",
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

interface MainNavSidebarProps {
  className?: string;
}

export function MainNavSidebar({ className }: MainNavSidebarProps = {}) {
  const [location] = useLocation();

  return (
    <nav
      className={`w-20 border-r border-border bg-card flex flex-col items-center py-6 gap-6 ${className || ''}`}
      aria-label="Primary"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location === item.path;
        
        return (
          <Link
            key={item.path}
            href={item.path}
            className={cn(
              "flex flex-col items-center gap-2 rounded-lg p-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            data-testid={`nav-${item.name.toLowerCase()}`}
            title={item.description}
            aria-label={item.name}
          >
            <Icon className="w-6 h-6" />
            <span className="text-xs font-normal">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
