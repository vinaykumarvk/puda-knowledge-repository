import { useState } from "react";
import { Brain, BookCheck, Layers, GraduationCap, FileText, Shield, TrendingUp, Users, Target, Sparkles, Award, BarChart3, ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import QuizAssessment from "@/components/quiz-assessment";

interface QuizTopic {
  category: string;
  topic: string;
  questionCount: number;
  easyCount: number;
  mediumCount: number;
  hardCount: number;
}

const categoryIcons: Record<string, any> = {
  "Order Management": FileText,
  "Urban Administration Fundamentals": BookCheck,
  "Investment Products & Strategies": TrendingUp,
  "Client Relationship Management": Users,
  "Regulatory & Compliance": Shield,
};

function getDifficultyLevel(easy: number, medium: number, hard: number): string {
  if (hard > easy && hard > medium) return "Advanced";
  if (medium > easy) return "Intermediate";
  return "Beginner";
}

function getEstimatedTime(questionCount: number): string {
  const minutes = Math.round(questionCount * 0.7);
  return `${minutes} min`;
}

export default function QuizPage() {
  const [activeQuizTopic, setActiveQuizTopic] = useState<string | null>(null);

  const { data: topics, isLoading, error } = useQuery<QuizTopic[]>({
    queryKey: ["/api/quiz/categories"],
  });

  const { data: quizHistory } = useQuery<Array<{
    topic: string;
    category: string;
    bestScore: number;
    totalAttempts: number;
    lastAttemptDate: Date;
    averageScore: number;
  }>>({
    queryKey: ["/api/quiz/history"],
  });

  const flashcardDecks = [
    {
      name: "Quick Concepts Review",
      description: "Rapid-fire review of key urban administration terms",
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

  // Group topics by category
  const categorizedTopics = topics?.reduce((acc, topic) => {
    if (!acc[topic.category]) {
      acc[topic.category] = [];
    }
    acc[topic.category].push(topic);
    return acc;
  }, {} as Record<string, QuizTopic[]>) || {};

  // Create a lookup map for quiz history by topic
  const historyByTopic = quizHistory?.reduce((acc, history) => {
    acc[history.topic] = history;
    return acc;
  }, {} as Record<string, typeof quizHistory[0]>) || {};

  if (activeQuizTopic) {
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
        <div className="flex-1 overflow-auto">
          <QuizAssessment topic={activeQuizTopic} onBack={() => setActiveQuizTopic(null)} />
        </div>
      </div>
    );
  }

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
                  {isLoading ? "Loading..." : `${topics?.reduce((sum, t) => sum + t.questionCount, 0) || 0} questions`} across {topics?.length || 0} topics • Track your progress and mastery
                </p>
              </div>

              {isLoading && (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <Card key={i}>
                      <CardHeader className="p-4">
                        <Skeleton className="h-6 w-1/3 mb-2" />
                        <Skeleton className="h-4 w-1/2" />
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}

              {error && (
                <div className="text-center py-8">
                  <p className="text-destructive">Failed to load quiz topics</p>
                </div>
              )}

              {Object.keys(categorizedTopics).length > 0 && (
                <div className="space-y-4">
                  {Object.entries(categorizedTopics).map(([category, categoryTopics]) => {
                    const Icon = categoryIcons[category] || FileText;
                    const totalQuestions = categoryTopics.reduce((sum, t) => sum + t.questionCount, 0);
                    const totalEasy = categoryTopics.reduce((sum, t) => sum + t.easyCount, 0);
                    const totalMedium = categoryTopics.reduce((sum, t) => sum + t.mediumCount, 0);
                    const totalHard = categoryTopics.reduce((sum, t) => sum + t.hardCount, 0);

                    return (
                      <Card key={category} className="border-2">
                        <Accordion type="single" collapsible defaultValue={category}>
                          <AccordionItem value={category} className="border-none">
                            <AccordionTrigger 
                              className="px-4 py-3 hover:no-underline hover:bg-muted/50"
                              data-testid={`accordion-${category.toLowerCase().replace(/\s+/g, '-')}`}
                            >
                              <div className="flex items-center gap-3 flex-1 text-left">
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <Icon className="w-5 h-5 text-primary" />
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-semibold text-base mb-1">{category}</h3>
                                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <BookCheck className="w-3 h-3" />
                                      {categoryTopics.length} Topics
                                    </span>
                                    <span>•</span>
                                    <span>{totalQuestions} Questions</span>
                                    <span>•</span>
                                    <span className="text-green-600">Easy: {totalEasy}</span>
                                    <span className="text-yellow-600">Medium: {totalMedium}</span>
                                    <span className="text-red-600">Hard: {totalHard}</span>
                                  </div>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4 pt-2">
                              <div className="space-y-2 pl-2">
                                {categoryTopics.map((topic) => {
                                  const difficulty = getDifficultyLevel(topic.easyCount, topic.mediumCount, topic.hardCount);
                                  const estimatedTime = getEstimatedTime(topic.questionCount);

                                  const history = historyByTopic[topic.topic];
                                  
                                  // Determine performance badge color
                                  const getPerformanceBadge = (score: number | undefined) => {
                                    if (!score) return null;
                                    if (score >= 80) return { color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700', label: '🏆 Excellent' };
                                    if (score >= 70) return { color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700', label: '✓ Passed' };
                                    if (score >= 50) return { color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700', label: '⚠️ Review' };
                                    return { color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700', label: '📚 Practice' };
                                  };

                                  const badge = getPerformanceBadge(history?.bestScore);
                                  
                                  return (
                                    <div
                                      key={topic.topic}
                                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-all"
                                      data-testid={`card-quiz-${topic.topic.toLowerCase().replace(/\s+/g, '-')}`}
                                    >
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                          <h4 className="font-medium text-sm">{topic.topic}</h4>
                                          {badge && (
                                            <span className={`text-xs px-2 py-0.5 rounded-full border ${badge.color} font-medium`} data-testid={`badge-performance-${topic.topic.toLowerCase().replace(/\s+/g, '-')}`}>
                                              {badge.label}
                                            </span>
                                          )}
                                        </div>
                                        {history && (
                                          <div className="flex items-center gap-3 mb-1.5 flex-wrap" data-testid={`stats-${topic.topic.toLowerCase().replace(/\s+/g, '-')}`}>
                                            <span className="text-xs font-semibold text-primary">
                                              Best: {history.bestScore}%
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                              Avg: {history.averageScore}%
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                              {history.totalAttempts} {history.totalAttempts === 1 ? 'attempt' : 'attempts'}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                              Last: {new Date(history.lastAttemptDate).toLocaleDateString()}
                                            </span>
                                          </div>
                                        )}
                                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                          <span>{topic.questionCount} Questions</span>
                                          <span>•</span>
                                          <span>{difficulty}</span>
                                          <span>•</span>
                                          <span>{estimatedTime}</span>
                                        </div>
                                      </div>
                                      <Button
                                        size="sm"
                                        onClick={() => setActiveQuizTopic(topic.topic)}
                                        data-testid={`button-start-${topic.topic.toLowerCase().replace(/\s+/g, '-')}`}
                                      >
                                        {history ? 'Retake' : 'Start'}
                                      </Button>
                                    </div>
                                  );
                                })}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
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
                      Expand a category to see available topics. Select a topic to begin your assessment. Questions are presented one at a time. 
                      Track your score, review incorrect answers, and retake quizzes to improve your knowledge.
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
