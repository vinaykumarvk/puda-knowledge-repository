import { Brain, BookCheck, Layers, GraduationCap, TrendingUp, Shield, Globe, Users, Target, Sparkles, Award, BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function QuizMockupPage() {
  const structuredQuizCategories = [
    {
      name: "Wealth Management Fundamentals",
      description: "Core principles and foundational concepts",
      icon: BookCheck,
      questionCount: 85,
      topics: ["Portfolio Theory", "Asset Allocation", "Risk Management"],
      difficulty: "Beginner",
      estimatedTime: "25 min"
    },
    {
      name: "Investment Products & Strategies",
      description: "Advanced investment vehicles and approaches",
      icon: TrendingUp,
      questionCount: 120,
      topics: ["Equities", "Fixed Income", "Alternatives", "Derivatives"],
      difficulty: "Intermediate",
      estimatedTime: "35 min"
    },
    {
      name: "Client Relationship Management",
      description: "Client onboarding, communication, and service",
      icon: Users,
      questionCount: 95,
      topics: ["KYC", "Suitability", "Communication", "Compliance"],
      difficulty: "Intermediate",
      estimatedTime: "30 min"
    },
    {
      name: "Regulatory & Compliance",
      description: "Financial regulations and compliance requirements",
      icon: Shield,
      questionCount: 110,
      topics: ["Securities Law", "AML", "Fiduciary Standards", "Ethics"],
      difficulty: "Advanced",
      estimatedTime: "40 min"
    },
    {
      name: "Global Markets & Economics",
      description: "International markets and economic principles",
      icon: Globe,
      questionCount: 90,
      topics: ["Macro Economics", "Currency Markets", "Geopolitics"],
      difficulty: "Advanced",
      estimatedTime: "30 min"
    }
  ];

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
    <div className="flex-1 flex flex-col h-screen bg-background">
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
          <Tabs defaultValue="flashcards" className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-6">
              <TabsTrigger value="structured" className="gap-2">
                <Layers className="w-4 h-4" />
                Structured Quiz
              </TabsTrigger>
              <TabsTrigger value="flashcards" className="gap-2">
                <GraduationCap className="w-4 h-4" />
                Flashcards
              </TabsTrigger>
            </TabsList>

            <TabsContent value="structured" className="mt-0">
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold mb-2">Knowledge Assessment</h2>
                <p className="text-sm text-muted-foreground">
                  500+ questions across 5 categories • Track your progress and mastery
                </p>
              </div>

              <div className="space-y-3">
                {structuredQuizCategories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <Card
                      key={category.name}
                      className="hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer"
                      data-testid={`card-quiz-${category.name.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <CardHeader className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex gap-3 flex-1">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Icon className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base mb-1">{category.name}</CardTitle>
                              <CardDescription className="text-xs mb-2">
                                {category.description}
                              </CardDescription>
                              <div className="flex flex-wrap gap-1.5 mb-2">
                                {category.topics.map((topic) => (
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
                                <span>{category.difficulty}</span>
                                <span>•</span>
                                <span>{category.estimatedTime}</span>
                              </div>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            data-testid={`button-start-${category.name.toLowerCase().replace(/\s+/g, '-')}`}
                          >
                            Start
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
                    <Target className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm mb-1">How Structured Quizzes Work</h3>
                    <p className="text-xs text-muted-foreground">
                      Select a category to begin a timed assessment. Questions are randomly selected from our bank of 500+ questions. 
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
