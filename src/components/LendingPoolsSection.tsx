import { TrendingUp, Briefcase } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useLendingPools } from "@/hooks/useLendingPools";

interface LendingPoolsSectionProps {
  userProfile?: any;
}

const LendingPoolsSection = ({ userProfile }: LendingPoolsSectionProps) => {
  const navigate = useNavigate();
  const { lendingPools, isLoading: poolsLoading } = useLendingPools();

  const isLender = userProfile?.profile_type === 'Lender';
  const hasSignedTerms = userProfile?.signed_terms_hash && userProfile.signed_terms_hash.trim() !== '';

  // Only render for Lenders with signed terms who have available pools
  if (!isLender || !hasSignedTerms || poolsLoading || lendingPools.length === 0) {
    return null;
  }

  return (
    <section className="bg-card p-6 rounded-2xl shadow-lg border">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Available Lending Pools
        </h3>
        <div className="space-y-3">
          {lendingPools.slice(0, 3).map((pool) => (
            <Card key={pool.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary" />
                    <span className="font-medium">${pool.target_amount.toLocaleString()}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-green-600">
                      {pool.monthly_interest}% monthly
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {pool.min_lend_period}-{pool.max_lend_period} days
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Funding Progress</span>
                    <span>{pool.funding_progress.toFixed(0)}%</span>
                  </div>
                  <Progress value={pool.funding_progress} className="h-1.5" />
                </div>
                <Button 
                  size="sm" 
                  className="w-full mt-3"
                  onClick={() => navigate(`/lending-pool/${pool.id}`)}
                >
                  Lend Now
                </Button>
              </CardContent>
            </Card>
          ))}
          {lendingPools.length > 3 && (
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => navigate('/wallet')}
            >
              View All Pools ({lendingPools.length})
            </Button>
          )}
        </div>
      </div>
    </section>
  );
};

export default LendingPoolsSection;