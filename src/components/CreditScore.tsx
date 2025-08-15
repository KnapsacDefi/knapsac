import { Brain, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCreditScore } from "@/hooks/useCreditScore";
import { useToast } from "@/hooks/use-toast";

interface CreditScoreProps {
  walletAddress?: string;
}

const CreditScore = ({ walletAddress }: CreditScoreProps) => {
  const { score, loading, error, refresh, lastUpdated } = useCreditScore(walletAddress);
  const { toast } = useToast();
  
  const handleScoreClick = () => {
    if (displayScore < 500) {
      toast({
        title: "Credit Score Too Low",
        description: "You need a credit score of 500 or above for this feature.",
        variant: "destructive"
      });
    }
  };
  
  // Display score (1-1000 range)
  const displayScore = score || 1;
  
  // Normalize score to 0-100 range for the progress circle
  const normalizedScore = Math.max(0, Math.min(100, (displayScore / 1000) * 100));
  
  // Calculate the stroke offset for the progress circle
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (normalizedScore / 100) * circumference;
  
  // Determine score category and color (based on 1-1000 scale)
  const getScoreCategory = (score: number) => {
    if (score >= 800) return { category: "Excellent", color: "#10B981" }; // Green
    if (score >= 600) return { category: "Good", color: "#3B82F6" }; // Blue
    if (score >= 400) return { category: "Fair", color: "#F59E0B" }; // Orange
    if (score >= 200) return { category: "Poor", color: "#EF4444" }; // Red
    return { category: "Very Poor", color: "#DC2626" }; // Dark red
  };

  const { category, color } = getScoreCategory(displayScore);

  // Show loading skeleton
  if (loading && score === null) {
    return (
      <section className="bg-card p-6 rounded-2xl shadow-lg border">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Skeleton className="h-6 w-6" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="w-48 h-48 mx-auto mb-4">
            <Skeleton className="w-full h-full rounded-full" />
          </div>
          <Skeleton className="h-6 w-32 mx-auto mb-2" />
          <Skeleton className="h-4 w-48 mx-auto mb-6" />
          <Skeleton className="h-10 w-full max-w-xs mx-auto" />
        </div>
      </section>
    );
  }

  return (
    <section className="bg-card p-6 rounded-2xl shadow-lg border">
      <div className="text-center">
        {/* Header */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <Brain className="w-6 h-6 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Credit Score</h3>
        </div>

        {/* Error State */}
        {error && (
          <div className="text-center mb-4 p-3 bg-destructive/10 text-destructive rounded-lg">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Circular Progress */}
        <div className="relative w-48 h-48 mx-auto mb-4 cursor-pointer" onClick={handleScoreClick}>
          <svg
            className="w-full h-full transform -rotate-90"
            viewBox="0 0 200 200"
          >
            {/* Background circle */}
            <circle
              cx="100"
              cy="100"
              r={radius}
              stroke="hsl(var(--muted))"
              strokeWidth="8"
              fill="none"
            />
            
            {/* Progress circle with gradient */}
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="25%" stopColor="#3B82F6" />
                <stop offset="50%" stopColor="#8B5CF6" />
                <stop offset="75%" stopColor="#EC4899" />
                <stop offset="100%" stopColor="#EF4444" />
              </linearGradient>
            </defs>
            
            <circle
              cx="100"
              cy="100"
              r={radius}
              stroke="url(#scoreGradient)"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeOffset}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          
          {/* Score display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold text-foreground">{displayScore}</span>
            <span className="text-sm text-muted-foreground mt-1" style={{ color }}>
              {category}
            </span>
          </div>
        </div>

        {/* Title and Description */}
        <h4 className="text-xl font-semibold text-foreground mb-2">Credit Risk Index</h4>
        <p className="text-sm text-muted-foreground mb-2 max-w-xs mx-auto">
          Credit score based on financial history, payment behavior, and risk assessment.
        </p>
        
        {/* Last updated info */}
        {lastUpdated && (
          <p className="text-xs text-muted-foreground mb-6">
            Last updated: {new Date(lastUpdated).toLocaleString()}
          </p>
        )}

        {/* Update Button */}
        <Button 
          className="w-full max-w-xs"
          onClick={refresh}
          disabled={loading || !walletAddress}
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Updating...
            </>
          ) : (
            'Update Index'
          )}
        </Button>
      </div>
    </section>
  );
};

export default CreditScore;