import { useState } from "react";
import { Route, Switch, useLocation } from "wouter";
import { LayoutDashboard, TrendingUp, Briefcase, CheckSquare, FileText, Menu, X, ChevronLeft, ChevronRight, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@/lib/auth";
import DashboardPage from "@/pages/Dashboard";
import NewInvestmentPage from "@/pages/NewInvestment";
import MyInvestmentsPage from "@/pages/MyInvestments";
import MyTasksPage from "@/pages/MyTasks";
import TemplatesPage from "@/pages/Templates";

export default function InvestmentPortal() {
  const [location, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const user = useUser();

  const navItems = [
    {
      name: "Dashboard",
      icon: LayoutDashboard,
      path: "/investment-portal",
      description: "Overview & Analytics"
    },
    {
      name: "New Report",
      icon: TrendingUp,
      path: "/investment-portal/new",
      description: "Create Report"
    },
    {
      name: "My Reports",
      icon: Briefcase,
      path: "/investment-portal/investments",
      description: "Track Reports"
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
      description: "Report Templates"
    }
  ];

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="flex h-full bg-background items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-primary/10 p-3">
                <LogIn className="w-8 h-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Login Required</CardTitle>
            <CardDescription className="text-base mt-2">
              Please login to access the Report Portal
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              The Report Portal requires authentication to create and manage reports. Click the user icon in the top-right corner to login.
            </p>
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-xs font-semibold text-foreground mb-2">Local Account:</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>• <span className="font-mono">user123</span> / <span className="font-mono">password123</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-background">
      {/* Sidebar - Desktop */}
      <div className={`hidden md:flex md:flex-col bg-card border-r border-border transition-all duration-300 ${
        isSidebarCollapsed ? 'md:w-16' : 'md:w-64'
      }`}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          {!isSidebarCollapsed && (
            <div className="flex-1">
              <h2 className="text-lg font-bold text-foreground">Report Portal</h2>
              <p className="text-xs text-muted-foreground mt-1">Document Generation System</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="flex-shrink-0"
            data-testid="button-toggle-sidebar"
            title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            
            return (
              <button
                key={item.path}
                onClick={() => setLocation(item.path)}
                className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                title={isSidebarCollapsed ? item.name : ''}
              >
                <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                {!isSidebarCollapsed && (
                  <div className="text-left">
                    <div className="font-medium text-sm">{item.name}</div>
                    <div className={`text-xs ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                      {item.description}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {!isSidebarCollapsed && (
          <div className="p-3 border-t border-border">
            <div className="text-xs text-muted-foreground text-center">
              Report Management System
            </div>
          </div>
        )}
      </div>

      {/* Mobile Header & Menu */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Report Portal</h2>
            <p className="text-xs text-muted-foreground">Document Generation System</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            title={isMobileMenuOpen ? "Close menu" : "Open menu"}
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
                  className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
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
      <div className="flex-1 w-full min-w-0 overflow-auto md:mt-0 mt-20">
        {location === "/investment-portal" && <DashboardPage />}
        {location === "/investment-portal/new" && <NewInvestmentPage />}
        {location === "/investment-portal/investments" && <MyInvestmentsPage />}
        {location === "/investment-portal/tasks" && <MyTasksPage />}
        {location === "/investment-portal/templates" && <TemplatesPage />}
      </div>
    </div>
  );
}
