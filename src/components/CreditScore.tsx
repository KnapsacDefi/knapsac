import { Brain } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CreditScoreProps {
  score?: number;
}

const CreditScore = ({ score = 1 }: CreditScoreProps) => {
  // Normalize score to 0-100 range
  const normalizedScore = Math.max(0, Math.min(100, score));
  
  // Calculate the stroke offset for the progress circle
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (normalizedScore / 100) * circumference;
  
  // Determine score category and color
  const getScoreCategory = (score: number) => {
    if (score >= 80) return { category: "Excellent", color: "#10B981" }; // Green
    if (score >= 60) return { category: "Good", color: "#3B82F6" }; // Blue
    if (score >= 40) return { category: "Fair", color: "#F59E0B" }; // Orange
    if (score >= 20) return { category: "Poor", color: "#EF4444" }; // Red
    return { category: "Very Poor", color: "#DC2626" }; // Dark red
  };

  const { category, color } = getScoreCategory(normalizedScore);

  return (
    <section className="bg-card p-6 rounded-2xl shadow-lg border">
      <div className="text-center">
        {/* Header */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <Brain className="w-6 h-6 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Credit Score</h3>
        </div>

        {/* Circular Progress */}
        <div className="relative w-48 h-48 mx-auto mb-4">
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
            <span className="text-4xl font-bold text-foreground">{normalizedScore}</span>
            <span className="text-sm text-muted-foreground mt-1" style={{ color }}>
              {category}
            </span>
          </div>
        </div>

        {/* Title and Description */}
        <h4 className="text-xl font-semibold text-foreground mb-2">Credit Risk Index</h4>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
          Credit score based on financial history, payment behavior, and risk assessment.
        </p>

        {/* Disabled Update Button */}
        <Button 
          className="w-full max-w-xs"
          disabled
        >
          Update Index
        </Button>
      </div>
    </section>
  );
};

export default CreditScore;