import { useState } from "react";
import { Route, Switch, useLocation } from "wouter";
import { LayoutDashboard, TrendingUp, Briefcase, CheckSquare, FileText, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardPage from "@/pages/Dashboard";
import NewInvestmentPage from "@/pages/NewInvestment";
import MyInvestmentsPage from "@/pages/MyInvestments";
import MyTasksPage from "@/pages/MyTasks";
import TemplatesPage from "@/pages/Templates";

export default function InvestmentPortal() {
  const [location, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    {
      name: "Dashboard",
      icon: LayoutDashboard,
      path: "/investment-portal",
      description: "Overview & Analytics"
    },
    {
      name: "New Investment",
      icon: TrendingUp,
      path: "/investment-portal/new",
      description: "Create Proposal"
    },
    {
      name: "My Investments",
      icon: Briefcase,
      path: "/investment-portal/investments",
      description: "Track Requests"
    },
    {
      name: "My Tasks",
      icon: CheckSquare,
      path: "/investment-portal/tasks",
      description: "Approvals & Actions"
    },
    {
      name: "Templates",
      icon: FileText,
      path: "/investment-portal/templates",
      description: "Proposal Templates"
    }
  ];

  return (
    <div className="flex h-full bg-background">
      {/* Sidebar - Desktop */}
      <div className="hidden md:flex md:w-64 md:flex-col bg-card border-r border-border">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Investment Portal</h2>
          <p className="text-xs text-muted-foreground mt-1">Document Generation System</p>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            
            return (
              <button
                key={item.path}
                onClick={() => setLocation(item.path)}
                className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
                data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="text-left">
                  <div className="font-medium text-sm">{item.name}</div>
                  <div className={`text-xs ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                    {item.description}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border">
          <div className="text-xs text-muted-foreground text-center">
            Investment Management System
          </div>
        </div>
      </div>

      {/* Mobile Header & Menu */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Investment Portal</h2>
            <p className="text-xs text-muted-foreground">Document System</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        {isMobileMenuOpen && (
          <nav className="border-t border-border p-3 space-y-1 bg-card">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    setLocation(item.path);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div className="text-left">
                    <div className="font-medium text-sm">{item.name}</div>
                    <div className={`text-xs ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                      {item.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden md:mt-0 mt-20">
        {location === "/investment-portal" && <DashboardPage />}
        {location === "/investment-portal/new" && <NewInvestmentPage />}
        {location === "/investment-portal/investments" && <MyInvestmentsPage />}
        {location === "/investment-portal/tasks" && <MyTasksPage />}
        {location === "/investment-portal/templates" && <TemplatesPage />}
      </div>
    </div>
  );
}
