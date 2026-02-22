import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

interface MasteryData {
  overallScore: number;
  currentLevel: string;
  quizPerformanceScore: number;
  topicCoverageScore: number;
  retentionScore: number;
  topicsMastered: number;
  totalQuizzesTaken: number;
}

export function MasteryBar() {
  const { data: mastery, isLoading } = useQuery<MasteryData>({
    queryKey: ["/api/mastery"],
    refetchInterval: false,
  });

  if (isLoading) {
    return <Skeleton className="hidden h-9 w-32 rounded-full sm:block" />;
  }

  if (!mastery) {
    return null;
  }

  const { overallScore, currentLevel } = mastery;

  // Determine color based on score
  const getColor = (score: number) => {
    if (score >= 76) return "from-green-600 to-emerald-500";
    if (score >= 51) return "from-yellow-500 to-amber-400";
    if (score >= 26) return "from-orange-500 to-orange-400";
    return "from-red-600 to-red-500";
  };

  const getTextColor = (score: number) => {
    if (score >= 76) return "text-green-600 dark:text-green-400";
    if (score >= 51) return "text-yellow-600 dark:text-yellow-400";
    if (score >= 26) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  };

  const gradient = getColor(overallScore);
  const textColor = getTextColor(overallScore);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div 
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border hover:border-primary/40 transition-all cursor-pointer group"
          data-testid="mastery-bar-container"
        >
          <Trophy className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
          
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold ${textColor}`}>
                {overallScore}%
              </span>
              <span className="text-[10px] text-muted-foreground">
                {currentLevel}
              </span>
            </div>
            
            {/* Mini Progress Bar */}
            <div className="w-24 h-1 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${gradient} transition-all duration-700 ease-out`}
                style={{ width: `${overallScore}%` }}
                data-testid="mastery-progress-fill"
              />
            </div>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <div className="space-y-2">
          <div className="font-semibold text-sm">Urban Administration Knowledge Mastery</div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quiz Performance:</span>
              <span className="font-medium">{mastery.quizPerformanceScore}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Topic Coverage:</span>
              <span className="font-medium">{mastery.topicCoverageScore}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Retention:</span>
              <span className="font-medium">{mastery.retentionScore}%</span>
            </div>
            <div className="pt-1 border-t border-border/50 flex justify-between">
              <span className="text-muted-foreground">Topics Mastered:</span>
              <span className="font-medium">{mastery.topicsMastered}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quizzes Taken:</span>
              <span className="font-medium">{mastery.totalQuizzesTaken}</span>
            </div>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
