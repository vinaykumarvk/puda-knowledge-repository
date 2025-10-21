import { Brain, Trophy, Target, BookOpen } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function QuizPage() {
  const quizCategories = [
    {
      name: "Wealth Management Basics",
      description: "Test your foundational knowledge",
      icon: BookOpen,
      difficulty: "Beginner",
      questions: 15
    },
    {
      name: "Investment Strategies",
      description: "Advanced portfolio management concepts",
      icon: Target,
      difficulty: "Intermediate",
      questions: 20
    },
    {
      name: "Financial Products",
      description: "Deep dive into financial instruments",
      icon: Trophy,
      difficulty: "Advanced",
      questions: 25
    }
  ];

  return (
    <div className="flex-1 flex flex-col h-screen bg-background">
      <header className="border-b border-border bg-card/30 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center gap-3">
          <Brain className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-quiz-title">
              Quiz
            </h1>
            <p className="text-sm text-muted-foreground">
              Test and enhance your wealth management knowledge
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold mb-3">Choose Your Challenge</h2>
            <p className="text-muted-foreground">
              Select a quiz category to test your knowledge and track your progress
            </p>
          </div>

          <div className="space-y-4">
            {quizCategories.map((category) => {
              const Icon = category.icon;
              return (
                <Card
                  key={category.name}
                  className="hover:shadow-lg transition-all"
                  data-testid={`card-quiz-${category.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="mb-2">{category.name}</CardTitle>
                          <CardDescription>{category.description}</CardDescription>
                          <div className="flex gap-3 mt-3">
                            <span className="text-xs px-2 py-1 rounded-full bg-muted">
                              {category.difficulty}
                            </span>
                            <span className="text-xs px-2 py-1 rounded-full bg-muted">
                              {category.questions} Questions
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        data-testid={`button-start-quiz-${category.name.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        Start Quiz
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Trophy className="w-4 h-4" />
                      <span>Coming soon - Interactive quizzes with instant feedback</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
