import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, ArrowLeft, ArrowRight } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface QuizQuestion {
  id: number;
  category: string;
  topic: string;
  difficulty: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string;
  questionType: string;
  createdAt: string;
}

interface QuizAssessmentProps {
  topic: string;
  onBack: () => void;
}

export default function QuizAssessment({ topic, onBack }: QuizAssessmentProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { data: questions, isLoading } = useQuery<QuizQuestion[]>({
    queryKey: ["/api/quiz/questions", topic],
    queryFn: async () => {
      const response = await fetch(`/api/quiz/questions/${encodeURIComponent(topic)}`);
      if (!response.ok) throw new Error("Failed to fetch questions");
      return response.json();
    },
  });

  const submitQuizMutation = useMutation({
    mutationFn: async (data: {
      topic: string;
      category: string;
      score: number;
      totalQuestions: number;
      correctAnswers: number;
    }) => {
      return apiRequest("/api/quiz/submit", "POST", data);
    },
    onSuccess: () => {
      // Invalidate mastery and quiz history queries to update the status bar and quiz cards
      queryClient.invalidateQueries({ queryKey: ["/api/mastery"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quiz/history"] });
    },
  });

  // Submit quiz results when showing results for the first time
  useEffect(() => {
    console.log("🔍 useEffect triggered:", { showResults, submitted, questionsLength: questions?.length });
    if (showResults && !submitted && questions && questions.length > 0) {
      const score = calculateScore();
      const category = questions[0].category; // All questions have the same category
      
      console.log("📤 Submitting quiz:", {
        topic,
        category,
        score: Math.round(score.percentage),
        totalQuestions: questions.length,
        correctAnswers: score.correct,
      });
      
      submitQuizMutation.mutate({
        topic,
        category,
        score: Math.round(score.percentage),
        totalQuestions: questions.length,
        correctAnswers: score.correct,
      });
      
      setSubmitted(true);
      console.log("✅ Marked as submitted");
    }
  }, [showResults, submitted, questions, topic, selectedAnswers]);

  const calculateScore = () => {
    if (!questions || questions.length === 0) {
      return { correct: 0, total: 0, percentage: 0 };
    }
    let correct = 0;
    questions.forEach((q, index) => {
      const userAnswer = selectedAnswers[index];
      const correctAnswer = q.correctAnswer.toLowerCase();
      if (userAnswer && userAnswer.toLowerCase() === correctAnswer) {
        correct++;
      }
    });
    return { correct, total: questions.length, percentage: (correct / questions.length) * 100 };
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Skeleton className="h-8 w-64 mb-6" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Button variant="ghost" onClick={onBack} className="mb-4" data-testid="button-back">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Quizzes
        </Button>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No questions available for this topic.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const selectedAnswer = selectedAnswers[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswers((prev) => ({ ...prev, [currentQuestionIndex]: answer }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      setShowResults(true);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  if (showResults) {
    const score = calculateScore();
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="border-2 border-primary/20">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl mb-2">Quiz Complete!</CardTitle>
            <div className="text-6xl font-bold text-primary mb-4">
              {score.percentage.toFixed(0)}%
            </div>
            <p className="text-lg text-muted-foreground">
              You answered {score.correct} out of {score.total} questions correctly
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-muted">
              <h3 className="font-semibold mb-3">Your Answers:</h3>
              <div className="space-y-3">
                {questions.map((q, index) => {
                  const userAnswer = selectedAnswers[index];
                  const correctAnswerKey = q.correctAnswer.toLowerCase();
                  const isCorrect = userAnswer && userAnswer.toLowerCase() === correctAnswerKey;
                  
                  const getOptionText = (key: string) => {
                    switch(key.toLowerCase()) {
                      case 'a': return q.optionA;
                      case 'b': return q.optionB;
                      case 'c': return q.optionC;
                      case 'd': return q.optionD;
                      default: return key;
                    }
                  };
                  
                  return (
                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-background">
                      <div className="flex-shrink-0 mt-0.5">
                        {isCorrect ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium mb-1">
                          Question {index + 1}: {q.questionText}
                        </p>
                        {!isCorrect && (
                          <div className="text-xs space-y-1">
                            <p className="text-red-600">
                              Your answer: {userAnswer ? `${userAnswer.toUpperCase()}. ${getOptionText(userAnswer)}` : "Not answered"}
                            </p>
                            <p className="text-green-600">
                              Correct answer: {correctAnswerKey.toUpperCase()}. {getOptionText(correctAnswerKey)}
                            </p>
                            {q.explanation && (
                              <p className="text-muted-foreground mt-2">{q.explanation}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={onBack} variant="outline" className="flex-1" data-testid="button-back-to-quizzes">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Quizzes
              </Button>
              <Button
                onClick={() => {
                  setCurrentQuestionIndex(0);
                  setSelectedAnswers({});
                  setShowResults(false);
                  setSubmitted(false);
                }}
                className="flex-1"
                data-testid="button-retake"
              >
                Retake Quiz
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const options = [
    { label: "A", value: currentQuestion.optionA },
    { label: "B", value: currentQuestion.optionB },
    { label: "C", value: currentQuestion.optionC },
    { label: "D", value: currentQuestion.optionD },
  ];

  // Map difficulty to numeric level (1-4 scale)
  const getDifficultyLevel = (difficulty: string): number => {
    const difficultyMap: Record<string, number> = {
      'Easy': 1,
      'Medium': 2,
      'Hard': 3,
      'Very Hard': 4,
      '1': 1,
      '2': 2,
      '3': 3,
      '4': 4,
    };
    return difficultyMap[difficulty] || parseInt(difficulty) || 2;
  };

  const difficultyLevel = getDifficultyLevel(currentQuestion.difficulty);
  const difficultyColor = difficultyLevel === 1 ? 'text-green-600 bg-green-100 dark:bg-green-900/30' :
                           difficultyLevel === 2 ? 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30' :
                           difficultyLevel === 3 ? 'text-orange-600 bg-orange-100 dark:bg-orange-900/30' :
                           'text-red-600 bg-red-100 dark:bg-red-900/30';

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <Button variant="ghost" onClick={onBack} size="sm" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <span className="text-sm text-muted-foreground">
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${difficultyColor}`} data-testid="difficulty-indicator">
                {difficultyLevel}
              </div>
              <span className="text-xs text-muted-foreground">
                Difficulty: {currentQuestion.difficulty} (Level {difficultyLevel}/4)
              </span>
            </div>
            <span className="text-xs text-muted-foreground">{topic}</span>
          </div>
          <CardTitle className="text-lg leading-relaxed">{currentQuestion.questionText}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {options.map((option) => (
            <button
              key={option.label}
              onClick={() => handleAnswerSelect(option.label)}
              className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                selectedAnswer === option.label
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              }`}
              data-testid={`option-${option.label.toLowerCase()}`}
            >
              <div className="flex items-start gap-3">
                <span className="font-semibold text-primary">{option.label}.</span>
                <span className="flex-1">{option.value}</span>
              </div>
            </button>
          ))}

          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              data-testid="button-previous"
            >
              Previous
            </Button>
            <Button
              onClick={handleNext}
              disabled={!selectedAnswer}
              data-testid="button-next"
            >
              {currentQuestionIndex === questions.length - 1 ? "Finish" : "Next"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
