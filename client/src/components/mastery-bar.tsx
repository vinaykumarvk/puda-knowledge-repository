import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";

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
    refetchInterval: false, // Only refetch manually after quiz completion
  });

  if (isLoading || !mastery) {
    return null;
  }

  const { overallScore, currentLevel } = mastery;

  // Determine color based on score
  const getColor = (score: number) => {
    if (score >= 76) return "from-green-600 to-emerald-500"; // Advanced/Expert
    if (score >= 51) return "from-yellow-500 to-amber-400"; // Intermediate
    if (score >= 26) return "from-orange-500 to-orange-400"; // Learning
    return "from-red-600 to-red-500"; // Novice
  };

  // Determine background track color based on score
  const getTrackColor = (score: number) => {
    if (score >= 76) return "bg-green-900/20";
    if (score >= 51) return "bg-yellow-900/20";
    if (score >= 26) return "bg-orange-900/20";
    return "bg-red-900/20";
  };

  const gradient = getColor(overallScore);
  const trackColor = getTrackColor(overallScore);

  return (
    <div 
      className="w-full bg-card/50 border-b border-border/40 px-6 py-2.5"
      data-testid="mastery-bar-container"
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">
            Wealth Knowledge Mastery: {overallScore}% - {currentLevel}
          </span>
        </div>
        <button
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          data-testid="mastery-breakdown-button"
          title="View detailed breakdown"
        >
          Details
        </button>
      </div>
      
      {/* Progress Bar */}
      <div className="relative">
        {/* Track */}
        <div className={`h-2.5 ${trackColor} rounded-full overflow-hidden`}>
          {/* Fill */}
          <div
            className={`h-full bg-gradient-to-r ${gradient} transition-all duration-700 ease-out`}
            style={{ width: `${overallScore}%` }}
            data-testid="mastery-progress-fill"
          />
        </div>
        
        {/* Milestone Markers */}
        <div className="absolute top-0 left-0 right-0 h-2.5 flex justify-between pointer-events-none">
          <div className="w-px bg-border/30 h-full" style={{ marginLeft: "25%" }} />
          <div className="w-px bg-border/30 h-full" style={{ marginLeft: "0%" }} />
          <div className="w-px bg-border/30 h-full" style={{ marginLeft: "0%" }} />
          <div className="w-px bg-border/30 h-full" style={{ marginLeft: "-1px" }} />
        </div>
      </div>
      
      {/* Labels */}
      <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
        <span>Novice</span>
        <span>Learning</span>
        <span>Intermediate</span>
        <span>Advanced</span>
        <span>Expert</span>
      </div>
    </div>
  );
}
