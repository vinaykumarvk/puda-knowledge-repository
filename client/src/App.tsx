import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { MainNavSidebar } from "@/components/main-nav-sidebar";
import { TopHeader } from "@/components/top-header";
import ChatbotPage from "@/pages/chatbot";
import WorkshopPage from "@/pages/workshop";
import QuizPage from "@/pages/quiz";
import AtlasPage from "@/pages/atlas";
import RfpPage from "@/pages/rfp";
import NotFound from "@/pages/not-found";
import type { UserMastery } from "@shared/schema";

function Router() {
  // Fetch mastery data for header stats
  const { data: masteryData } = useQuery<UserMastery>({
    queryKey: ["/api/mastery"],
  });

  const handleSearch = (query: string) => {
    console.log("Global search:", query);
    // Future: Implement global search functionality
  };

  return (
    <div className="flex flex-col h-screen">
      <TopHeader 
        questionsAsked={0}
        quizzesCompleted={masteryData?.totalQuizzesTaken || 0}
        onSearch={handleSearch}
      />
      <div className="flex flex-1 overflow-hidden">
        <MainNavSidebar />
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <Toaster />
          <Router />
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
