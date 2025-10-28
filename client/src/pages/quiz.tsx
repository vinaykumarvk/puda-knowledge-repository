import { Brain, BookCheck, Layers, GraduationCap, FileText, Shield, TrendingUp, Users, Target, Sparkles, Award, BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface QuizCategory {
  category: string;
  questionCount: number;
  topics: string;
  easyCount: number;
  mediumCount: number;
  hardCount: number;
}

// Map category names to appropriate icons
const categoryIcons: Record<string, any> = {
  "Order Management": FileText,
  "Wealth Management Fundamentals": BookCheck,
  "Investment Products & Strategies": TrendingUp,
  "Client Relationship Management": Users,
  "Regulatory & Compliance": Shield,
};

// Determine difficulty level based on question distribution
function getDifficultyLevel(easy: number, medium: number, hard: number): string {
  if (hard > easy && hard > medium) return "Advanced";
  if (medium > easy) return "Intermediate";
  return "Beginner";
}

// Estimate time (assume 1 minute per question)
function getEstimatedTime(questionCount: number): string {
  const minutes = Math.round(questionCount * 0.7); // ~40 seconds per question
  return `${minutes} min`;
}

export default function QuizPage() {
  // Fetch quiz categories from database
  const { data: categories, isLoading, error } = useQuery<QuizCategory[]>({
    queryKey: ["/api/quiz/categories"],
  });

  const flashcardDecks = [
    {
      name: "Quick Concepts Review",
      description: "Rapid-fire review of key wealth management terms",
      icon: Sparkles,
      cardCount: 50,
      category: "All Topics",
      lastStudied: "Never"
    },
    {
      name: "Investment Terminology",
      description: "Master essential investment vocabulary",
      icon: Target,
      cardCount: 75,
      category: "Investments",
      lastStudied: "2 days ago"
    },
    {
      name: "Regulatory Definitions",
      description: "Key compliance and regulatory terms",
      icon: Award,
      cardCount: 60,
      category: "Compliance",
      lastStudied: "1 week ago"
    },
    {
      name: "Financial Ratios & Metrics",
      description: "Common financial calculations and ratios",
      icon: BarChart3,
      cardCount: 40,
      category: "Analysis",
      lastStudied: "Never"
    }
  ];

  return (
    <div className="flex-1 flex flex-col bg-background">
      <header className="border-b border-border bg-card/30 backdrop-blur-sm px-6 py-2.5">
        <div className="flex items-center gap-2.5">
          <Brain className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-foreground" data-testid="text-quiz-title">
              Quiz & Assessment
            </h1>
            <p className="text-xs text-muted-foreground">
              Test knowledge retention and enhance learning
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-6xl mx-auto">
          <Tabs defaultValue="structured" className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-6">
              <TabsTrigger value="structured" className="gap-2" data-testid="tab-structured">
                <Layers className="w-4 h-4" />
                Structured Quiz
              </TabsTrigger>
              <TabsTrigger value="flashcards" className="gap-2" data-testid="tab-flashcards">
                <GraduationCap className="w-4 h-4" />
                Flashcards
              </TabsTrigger>
            </TabsList>

            <TabsContent value="structured" className="mt-0">
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold mb-2">Knowledge Assessment</h2>
                <p className="text-sm text-muted-foreground">
                  {isLoading ? "Loading..." : `${categories?.reduce((sum, cat) => sum + cat.questionCount, 0) || 0}+ questions`} across {categories?.length || 0} categories • Track your progress and mastery
                </p>
              </div>

              {isLoading && (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardHeader className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex gap-3 flex-1">
                            <Skeleton className="w-10 h-10 rounded-lg" />
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-4 w-1/3" />
                              <Skeleton className="h-3 w-2/3" />
                              <Skeleton className="h-3 w-1/2" />
                            </div>
                          </div>
                          <Skeleton className="h-9 w-16" />
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}

              {error && (
                <div className="text-center py-8">
                  <p className="text-destructive">Failed to load quiz categories</p>
                </div>
              )}

              {categories && categories.length > 0 && (
                <div className="space-y-3">
                  {categories.map((category) => {
                    const Icon = categoryIcons[category.category] || FileText;
                    const topics = category.topics.split('||').slice(0, 4); // Show up to 4 topics
                    const difficulty = getDifficultyLevel(category.easyCount, category.mediumCount, category.hardCount);
                    const estimatedTime = getEstimatedTime(category.questionCount);

                    return (
                      <Card
                        key={category.category}
                        className="hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer"
                        data-testid={`card-quiz-${category.category.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <CardHeader className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex gap-3 flex-1">
                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <Icon className="w-5 h-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <CardTitle className="text-base mb-1">{category.category}</CardTitle>
                                <CardDescription className="text-xs mb-2">
                                  Comprehensive {category.category.toLowerCase()} knowledge assessment
                                </CardDescription>
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                  {topics.map((topic) => (
                                    <span
                                      key={topic}
                                      className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                                    >
                                      {topic}
                                    </span>
                                  ))}
                                </div>
                                <div className="flex gap-3 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <BookCheck className="w-3 h-3" />
                                    {category.questionCount} Questions
                                  </span>
                                  <span>•</span>
                                  <span>{difficulty}</span>
                                  <span>•</span>
                                  <span>{estimatedTime}</span>
                                  <span>•</span>
                                  <span className="text-green-600">Easy: {category.easyCount}</span>
                                  <span className="text-yellow-600">Medium: {category.mediumCount}</span>
                                  <span className="text-red-600">Hard: {category.hardCount}</span>
                                </div>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              data-testid={`button-start-${category.category.toLowerCase().replace(/\s+/g, '-')}`}
                            >
                              Start
                            </Button>
                          </div>
                        </CardHeader>
                      </Card>
                    );
                  })}
                </div>
              )}

              <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Target className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm mb-1">How Structured Quizzes Work</h3>
                    <p className="text-xs text-muted-foreground">
                      Select a category to begin a timed assessment. Questions are randomly selected from our question bank. 
                      Track your score, review incorrect answers, and monitor your progress over time.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="flashcards" className="mt-0">
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold mb-2">Self-Assessment Flashcards</h2>
                <p className="text-sm text-muted-foreground">
                  Master key concepts through active recall • Study at your own pace
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {flashcardDecks.map((deck) => {
                  const Icon = deck.icon;
                  return (
                    <Card
                      key={deck.name}
                      className="hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer"
                      data-testid={`card-flashcard-${deck.name.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <CardHeader className="p-4 space-y-2.5">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Icon className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base mb-1">{deck.name}</CardTitle>
                            <CardDescription className="text-xs">
                              {deck.description}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex gap-2 text-muted-foreground">
                            <span className="px-2 py-0.5 rounded-full bg-muted">
                              {deck.cardCount} cards
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-muted">
                              {deck.category}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-border">
                          <span className="text-xs text-muted-foreground">
                            Last studied: {deck.lastStudied}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            data-testid={`button-study-${deck.name.toLowerCase().replace(/\s+/g, '-')}`}
                          >
                            Study
                          </Button>
                        </div>
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>

              <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm mb-1">How Flashcards Work</h3>
                    <p className="text-xs text-muted-foreground">
                      Click on any deck to start studying. Each card shows a question or term on the front. 
                      Think of your answer, then flip the card to check. Mark whether you knew it to track your mastery.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
