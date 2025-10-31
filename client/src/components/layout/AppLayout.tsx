import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { useUser, useLogout } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { 
  Home, 
  PlusCircle, 
  DollarSign, 
  CheckSquare, 
  Briefcase, 
  FileText, 
  BarChart3, 
  Users, 
  Table, 
  PieChart,
  Bell,
  Settings,
  Menu,
  LogOut,
  Target,
  Shield,
  Clock
} from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    // Initialize from localStorage, default to false
    const saved = localStorage.getItem('sidebarOpen');
    return saved ? JSON.parse(saved) : false;
  });
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Save sidebar state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('sidebarOpen', JSON.stringify(isSidebarOpen));
  }, [isSidebarOpen]);
  const { data: user } = useUser();
  const logout = useLogout();

  const { data: taskCount = 0 } = useQuery<number>({
    queryKey: ["/api/tasks/count"],
    queryFn: async () => {
      const response = await fetch("/api/tasks", { credentials: "include" });
      const tasks = await response.json();
      return tasks.filter((task: any) => task.status === 'pending').length;
    },
  });

  // Dashboard navigation functions
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const isDashboard = location === '/';
  const showQuickActions = user && ['analyst', 'admin'].includes(user.role);

  const { data: notifications = [] } = useQuery({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const response = await fetch("/api/notifications", { credentials: "include" });
      return response.json();
    },
  });

  const unreadNotifications = notifications.filter((n: any) => !n.isRead).length;

  // Define all available navigation items with role restrictions
  const allNavigationItems = [
    { href: "/", label: "Dashboard", icon: Home, roles: ["all"] },
    { href: "/new-investment", label: "New Investment", icon: PlusCircle, roles: ["analyst", "admin"] },
    { href: "/cash-requests", label: "Cash Requests", icon: DollarSign, roles: ["analyst", "admin"] },
    { href: "/my-tasks", label: "My Tasks", icon: CheckSquare, badge: taskCount, roles: ["all"] },
    { href: "/investments", label: "My Investments", icon: Briefcase, roles: ["all"] },

    { href: "/templates", label: "Templates", icon: FileText, roles: ["analyst", "admin"] },
  ];

  // Filter navigation items based on user role
  const navigationItems = allNavigationItems.filter(item => {
    if (item.roles.includes("all")) return true;
    if (!user?.role) return false;
    const shouldShow = item.roles.includes(user.role);
    return shouldShow;
  });



  const adminItems = [
    { href: "/user-management", label: "User Management", icon: Users },
    { href: "/approval-chains", label: "Approval Chains", icon: Table },
    { href: "/reports", label: "Reports", icon: PieChart },
  ];

  const handleLogout = () => {
    logout.mutate();
  };

  // Handle ESC key and click outside to close sidebar
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (isSidebarOpen && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setIsSidebarOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSidebarOpen]);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo & Brand */}
      <div className="flex items-center justify-between p-6 border-b">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">ABCBank</h1>
            <p className="text-sm text-muted-foreground">Investment Portal</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setIsSidebarOpen(false)}
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? "default" : "ghost"}
                className="w-full justify-start"
              >
                <Icon className="mr-3 h-4 w-4" />
                {item.label}
                {item.badge && item.badge > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {item.badge}
                  </Badge>
                )}
              </Button>
            </Link>
          );
        })}
        
        <div className="my-4 border-t" />
        
        {/* Admin Section */}
        {user?.role === 'admin' && (
          <>
            <div className="px-4 py-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Administration
              </p>
            </div>
            
            {adminItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className="w-full justify-start"
                  >
                    <Icon className="mr-3 h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t">
        <div className="flex items-center space-x-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src="" />
            <AvatarFallback>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background animate-fade-in">
      {/* Sidebar Overlay - Slides from left */}
      {isSidebarOpen && (
        <div 
          ref={sidebarRef}
          className="fixed left-0 top-0 h-full w-72 bg-card shadow-xl z-40 animate-slide-in-left"
        >
          <SidebarContent />
        </div>
      )}

      {/* Main Content - Dynamically adjusts when sidebar is open */}
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
        isSidebarOpen ? 'ml-72' : 'ml-0'
      }`}>
        {/* Top Bar */}
        <header className="bg-card shadow-sm border-b border-border animate-slide-up">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Clickable Logo to open sidebar - hidden when sidebar is open */}
                {!isSidebarOpen && (
                  <Button 
                    variant="ghost" 
                    onClick={() => setIsSidebarOpen(true)}
                    className="flex items-center space-x-3 hover:bg-accent p-2 rounded-lg"
                  >
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                      <BarChart3 className="h-5 w-5 text-white" />
                    </div>
                    <div className="text-left">
                      <h1 className="text-lg font-semibold">ABCBank</h1>
                      <p className="text-xs text-muted-foreground">Investment Portal</p>
                    </div>
                  </Button>
                )}
                
                {/* Simple menu button when sidebar is open */}
                {isSidebarOpen && (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setIsSidebarOpen(false)}
                    className="hover:bg-accent"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                )}
                
                <h2 className="text-2xl font-semibold text-gray-900">
                  {location === '/' ? 'Dashboard' : 
                   location === '/new-investment' ? 'New Investment' :
                   location === '/cash-requests' ? 'Cash Requests' :
                   location === '/my-tasks' ? 'My Tasks' :
                   location === '/investments' ? 'My Investments' :
                   'Investment Portal'}
                </h2>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Dashboard Navigation Icons - Only show on dashboard */}
                {isDashboard && (
                  <>
                    <div className="hidden md:flex items-center space-x-2 px-4 py-2 bg-muted rounded-lg">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => scrollToSection('overview')}
                        title="Overview"
                      >
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => scrollToSection('proposal-summary')}
                        title="Proposal Summary"
                      >
                        <Target className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => scrollToSection('decision-support')}
                        title="Decision Support"
                      >
                        <Shield className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => scrollToSection('analytics')}
                        title="Analytics"
                      >
                        <PieChart className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => scrollToSection('proposals')}
                        title="Proposals"
                      >
                        <Briefcase className="h-4 w-4" />
                      </Button>
                      {showQuickActions && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => scrollToSection('quick-actions')}
                          title="Quick Actions"
                        >
                          <PlusCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => scrollToSection('tasks')}
                        title="Tasks"
                      >
                        <Clock className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}

                {/* Notifications */}
                <NotificationDropdown />
                
                {/* Theme Toggle */}
                <ThemeToggle />
                
                {/* User Profile Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative flex flex-col items-center p-2 h-auto rounded-lg hover:bg-accent">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src="" alt={user?.firstName || "User"} />
                        <AvatarFallback className="bg-primary text-primary-foreground font-medium">
                          {user?.firstName?.[0]}{user?.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col items-center mt-1">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {user?.firstName} {user?.lastName}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                          {user?.role}
                        </span>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-1 leading-none">
                        <p className="font-medium">{user?.firstName} {user?.lastName}</p>
                        <p className="w-[200px] truncate text-sm text-muted-foreground">
                          {user?.email}
                        </p>
                        <Badge variant="outline" className="w-fit text-xs capitalize">
                          {user?.role}
                        </Badge>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={handleLogout}
                      className="text-red-600 focus:text-red-600 focus:bg-red-50"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
