import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { MainNavSidebar } from "@/components/main-nav-sidebar";
import ChatbotPage from "@/pages/chatbot";
import WorkshopPage from "@/pages/workshop";
import QuizPage from "@/pages/quiz";
import AtlasPage from "@/pages/atlas";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <div className="flex h-screen">
      <MainNavSidebar />
      <Switch>
        <Route path="/" component={ChatbotPage} />
        <Route path="/workshop" component={WorkshopPage} />
        <Route path="/quiz" component={QuizPage} />
        <Route path="/atlas" component={AtlasPage} />
        <Route component={NotFound} />
      </Switch>
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
