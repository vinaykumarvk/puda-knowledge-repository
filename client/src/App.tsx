import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/auth-context";
import ProtectedRoute from "@/components/protected-route";
import { MainNavSidebar } from "@/components/main-nav-sidebar";
import { MobileNavDrawer } from "@/components/mobile-nav-drawer";
import { TopHeader } from "@/components/top-header";
import ChatbotPage from "@/pages/chatbot";
import WorkshopPage from "@/pages/workshop";
import QuizPage from "@/pages/quiz";
import AtlasPage from "@/pages/atlas";
import RfpPage from "@/pages/rfp";
import LoginPage from "@/pages/login";
import NotFound from "@/pages/not-found";
import type { UserMastery } from "@shared/schema";

function ProtectedLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Fetch mastery data for header stats
  const { data: masteryData } = useQuery<UserMastery>({
    queryKey: ["/api/mastery"],
  });

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
        <Switch>
          <Route path="/" component={ChatbotPage} />
          <Route path="/workshop" component={WorkshopPage} />
          <Route path="/quiz" component={QuizPage} />
          <Route path="/atlas" component={AtlasPage} />
          <Route path="/rfp" component={RfpPage} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </div>
  );
}

function Router() {
  // TEMPORARY: Skip authentication due to database connectivity issues
  return (
    <ProtectedLayout />
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <ThemeProvider>
            <Toaster />
            <Router />
          </ThemeProvider>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
