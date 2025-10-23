import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { MainNavSidebar } from "@/components/main-nav-sidebar";
import { TopHeader } from "@/components/top-header";
import { MasteryBar } from "@/components/mastery-bar";
import ChatbotPage from "@/pages/chatbot";
import WorkshopPage from "@/pages/workshop";
import QuizPage from "@/pages/quiz";
import AtlasPage from "@/pages/atlas";
import NotFound from "@/pages/not-found";

function Router() {
  const [questionsAsked, setQuestionsAsked] = useState(0);
  const [quizzesCompleted, setQuizzesCompleted] = useState(0);

  const handleSearch = (query: string) => {
    console.log("Global search:", query);
    // Future: Implement global search functionality
  };

  return (
    <div className="flex flex-col h-screen">
      <TopHeader 
        questionsAsked={questionsAsked}
        quizzesCompleted={quizzesCompleted}
        onSearch={handleSearch}
      />
      <MasteryBar />
      <div className="flex flex-1 overflow-hidden">
        <MainNavSidebar />
        <Switch>
          <Route path="/" component={ChatbotPage} />
          <Route path="/workshop" component={WorkshopPage} />
          <Route path="/quiz" component={QuizPage} />
          <Route path="/atlas" component={AtlasPage} />
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
