import { useState, useEffect } from "react";
import { Brain, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { QuizQuestion } from "@/types/quiz";

interface QuizMessageProps {
  questions: QuizQuestion[];
  threadId: number;
  shouldSaveResults?: boolean; // If false, skip saving to database
}

export function QuizMessage({ questions, threadId, shouldSaveResults = true }: QuizMessageProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const submitQuizMutation = useMutation({
    mutationFn: async (results: any[]) => {
      const response = await apiRequest("POST", "/api/quiz/submit", {
        threadId,
        results,
      });
      return await response.json();
    },
    onSuccess: (data: any) => {
      // Mark as successfully submitted only after API confirms success
      setSubmitted(true);
      
      // Invalidate mastery query to trigger refresh
      queryClient.invalidateQueries({ queryKey: ["/api/mastery"] });
      
      toast({
        title: "🎉 Quiz Results Saved!",
        description: `Your mastery increased to ${data.mastery.overallScore}% (${data.mastery.currentLevel})`,
      });
    },
    onError: (error: Error) => {
      console.error("Failed to submit quiz:", error);
      
      // Reset submitted flag to allow retry
      setSubmitted(false);
      
      toast({
        variant: "destructive",
        title: "Failed to save results",
        description: "Your quiz results couldn't be saved. Please try again.",
      });
    },
  });

  const handleAnswerSelect = (questionIndex: number, answer: string) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
    setRevealedAnswers(prev => ({
      ...prev,
      [questionIndex]: true
    }));
  };

  const correctCount = questions.reduce((count, question, index) => {
    if (revealedAnswers[index] && selectedAnswers[index] === question.correctAnswer) {
      return count + 1;
    }
    return count;
  }, 0);

  const totalAnswered = Object.keys(revealedAnswers).length;
  const allAnswered = totalAnswered === questions.length;

  // Submit quiz results when all questions are answered (only if shouldSaveResults is true)
  useEffect(() => {
    if (allAnswered && !submitted && !submitQuizMutation.isPending && shouldSaveResults) {
      const results = questions.map((question, index) => ({
        questionText: question.question,
        userAnswer: selectedAnswers[index],
        correctAnswer: question.correctAnswer,
        isCorrect: selectedAnswers[index] === question.correctAnswer,
      }));

      submitQuizMutation.mutate(results);
    } else if (allAnswered && !submitted && !shouldSaveResults) {
      // Mark as submitted without saving to database
      setSubmitted(true);
    }
  }, [allAnswered, submitted, questions, selectedAnswers, submitQuizMutation, shouldSaveResults]);

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">📝 Flash Quiz - Test Your Knowledge</CardTitle>
        </div>
        <CardDescription>
          Based on the topics we've discussed. Select your answers to see immediate feedback!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {questions.map((question, questionIndex) => {
          const isRevealed = revealedAnswers[questionIndex];
          const selectedAnswer = selectedAnswers[questionIndex];
          const isCorrect = selectedAnswer === question.correctAnswer;

          return (
            <div
              key={questionIndex}
              className="p-4 rounded-lg bg-background border border-border"
              data-testid={`quiz-question-${questionIndex}`}
            >
              <h4 className="font-semibold mb-3 text-sm">
                {questionIndex + 1}. {question.question}
              </h4>
              
              <div className="space-y-2 mb-3">
                {Object.entries(question.options).map(([optionKey, optionText]) => {
                  const isSelected = selectedAnswer === optionKey;
                  const isCorrectOption = optionKey === question.correctAnswer;
                  
                  let buttonVariant: "outline" | "default" | "destructive" | "secondary" = "outline";
                  let extraClasses = "";
                  
                  if (isRevealed) {
                    if (isCorrectOption) {
                      buttonVariant = "default";
                      extraClasses = "bg-green-500 hover:bg-green-600 text-white border-green-500";
                    } else if (isSelected && !isCorrect) {
                      buttonVariant = "destructive";
                    }
                  } else if (isSelected) {
                    buttonVariant = "secondary";
                  }

                  return (
                    <Button
                      key={optionKey}
                      variant={buttonVariant}
                      className={`w-full justify-start text-left h-auto py-3 ${extraClasses}`}
                      onClick={() => !isRevealed && handleAnswerSelect(questionIndex, optionKey)}
                      disabled={isRevealed}
                      data-testid={`quiz-option-${questionIndex}-${optionKey}`}
                    >
                      <span className="font-bold mr-2">{optionKey}.</span>
                      <span className="flex-1">{optionText}</span>
                      {isRevealed && isCorrectOption && (
                        <CheckCircle2 className="w-4 h-4 ml-2" />
                      )}
                      {isRevealed && isSelected && !isCorrect && (
                        <XCircle className="w-4 h-4 ml-2" />
                      )}
                    </Button>
                  );
                })}
              </div>

              {isRevealed && (
                <div className={`p-3 rounded-md text-sm ${
                  isCorrect 
                    ? "bg-green-50 dark:bg-green-950/20 text-green-900 dark:text-green-100 border border-green-200 dark:border-green-900" 
                    : "bg-red-50 dark:bg-red-950/20 text-red-900 dark:text-red-100 border border-red-200 dark:border-red-900"
                }`}>
                  <div className="flex items-start gap-2">
                    {isCorrect ? (
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    )}
                    <div>
                      <p className="font-semibold mb-1">
                        {isCorrect ? "Correct!" : `Incorrect. The correct answer is ${question.correctAnswer}.`}
                      </p>
                      <p className="text-xs opacity-90">{question.explanation}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {allAnswered && (
          <div className="mt-4 p-4 rounded-lg bg-primary/10 border border-primary/20 text-center">
            <p className="text-lg font-semibold">
              🎉 Quiz Complete! You scored {correctCount}/{questions.length}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {correctCount === questions.length 
                ? "Perfect score! You've mastered these concepts!" 
                : correctCount >= questions.length * 0.7 
                  ? "Great job! You have a solid understanding." 
                  : "Good effort! Review the explanations to strengthen your knowledge."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
