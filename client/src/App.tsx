import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import ProtectedRoute from "@/components/protected-route";
import { MainNavSidebar } from "@/components/main-nav-sidebar";
import { MobileNavDrawer } from "@/components/mobile-nav-drawer";
import { TopHeader } from "@/components/top-header";
import { UxGateAuditor } from "@/components/ux-gate-auditor";
import ChatbotPage from "@/pages/chatbot";
import WorkshopPage from "@/pages/workshop";
import QuizPage from "@/pages/quiz";
import AtlasPage from "@/pages/atlas";
import RfpPage from "@/pages/rfp";
import LoginPage from "@/pages/login";
import NotFound from "@/pages/not-found";
import InvestmentPortal from "@/pages/InvestmentPortal";
import type { UserMastery } from "@shared/schema";

function ProtectedLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Fetch mastery data for header stats (optional - don't fail if it errors)
  const { data: masteryData, error: masteryError } = useQuery<UserMastery>({
    queryKey: ["/api/mastery"],
    retry: false,
    refetchOnWindowFocus: false,
    throwOnError: false, // Don't throw errors - just return undefined
    queryFn: async () => {
      try {
        const res = await fetch("/api/mastery", { credentials: "include" });
        if (!res.ok) {
          // Return undefined instead of throwing
          return undefined;
        }
        return await res.json();
      } catch (error) {
        // Silently handle errors - mastery data is optional
        console.debug("Mastery data not available:", error);
        return undefined;
      }
    },
  });

  // Log errors but don't let them crash the component
  if (masteryError) {
    console.debug("Mastery query error (non-blocking):", masteryError);
  }

  const handleSearch = (query: string) => {
    console.log("Global search:", query);
    // Future: Implement global search functionality
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex flex-col h-screen">
      <TopHeader 
        questionsAsked={0}
        quizzesCompleted={masteryData?.totalQuizzesTaken || 0}
        onSearch={handleSearch}
        onMenuClick={toggleMobileMenu}
      />
      <div className="flex flex-1 overflow-hidden">
        <MainNavSidebar className="hidden md:flex" />
        <MobileNavDrawer isOpen={isMobileMenuOpen} onClose={closeMobileMenu} />
        <main className="flex flex-1 min-h-0 flex-col overflow-hidden">
          <Switch>
            <Route path="/" component={ChatbotPage} />
            <Route path="/workshop" component={WorkshopPage} />
            <Route path="/quiz" component={QuizPage} />
            <Route path="/atlas" component={AtlasPage} />
            <Route path="/rfp" component={RfpPage} />
            <Route path="/investment-portal" component={InvestmentPortal} />
            <Route path="/investment-portal/new" component={InvestmentPortal} />
            <Route path="/investment-portal/investments" component={InvestmentPortal} />
            <Route path="/investment-portal/tasks" component={InvestmentPortal} />
            <Route path="/investment-portal/templates" component={InvestmentPortal} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route><ProtectedLayout /></Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <ThemeProvider>
            <Toaster />
            <UxGateAuditor />
            <Router />
          </ThemeProvider>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
