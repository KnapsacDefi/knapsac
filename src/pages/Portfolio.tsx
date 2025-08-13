import { ArrowLeft, Calendar, Clock, TrendingUp, Wallet, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePortfolio } from '@/hooks/usePortfolio';
import { useAuth } from '@/contexts/AuthContext';
import BottomNavigation from '@/components/BottomNavigation';
import PortfolioEntrySkeleton from '@/components/skeletons/PortfolioEntrySkeleton';

const Portfolio = () => {
  const navigate = useNavigate();
  const { authenticated } = useAuth();
  const { portfolio, isLoading, isRefreshing, error, lastUpdated, refreshPortfolio } = usePortfolio();

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="sticky top-0 z-10 bg-background border-b">
          <div className="flex items-center gap-4 p-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/wallet')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">Portfolio</h1>
          </div>
        </div>
        <div className="p-4">
          <Alert>
            <AlertDescription>
              Please log in to view your lending portfolio.
            </AlertDescription>
          </Alert>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  const handleClaim = (portfolioEntry: any) => {
    navigate(`/claim/${portfolioEntry.id}`);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/wallet')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">My Portfolio</h1>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={refreshPortfolio}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {lastUpdated && !isLoading && (
          <div className="text-xs text-muted-foreground text-center">
            Last updated: {lastUpdated}
            {isRefreshing && " • Refreshing..."}
          </div>
        )}
        
        {error && (
          <Alert>
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <PortfolioEntrySkeleton key={i} />
            ))}
          </div>
        ) : portfolio.length === 0 ? (
          <div className="text-center py-12">
            <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Lending Positions</h3>
            <p className="text-muted-foreground mb-4">
              You haven't lent to any pools yet. Start lending to build your portfolio.
            </p>
            <Button onClick={() => navigate('/wallet')}>
              Explore Lending Pools
            </Button>
          </div>
        ) : (
          portfolio.map((entry) => (
            <Card key={entry.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {entry.lend_amount} {entry.lend_token}
                  </CardTitle>
                  <Badge 
                    variant={entry.is_eligible ? "default" : "secondary"}
                  >
                    {entry.is_eligible ? "Claimable" : "Locked"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="text-muted-foreground">Interest:</span>
                    <span className="font-medium">{entry.lending_pool.monthly_interest}%/month</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Period:</span>
                    <span className="font-medium">{entry.lend_period} days</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {entry.is_eligible ? "Eligible:" : "Eligible from:"}
                    </span>
                    <span className="font-medium">
                      {new Date(entry.eligible_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Chain:</span>
                    <span className="font-medium capitalize">{entry.chain}</span>
                  </div>
                </div>

                {entry.is_eligible && (
                  <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-green-700">Claimable Amount:</span>
                      <span className="font-bold text-green-700">
                        {entry.claimable_amount.toFixed(4)} {entry.lend_token}
                      </span>
                    </div>
                  </div>
                )}

                <Button 
                  onClick={() => handleClaim(entry)}
                  disabled={!entry.is_eligible}
                  variant={entry.is_eligible ? "default" : "outline"}
                  className="w-full"
                >
                  {entry.is_eligible ? "Claim Rewards" : "Not Yet Eligible"}
                </Button>

                {entry.payment_status === 'completed' && (
                  <div className="text-xs text-muted-foreground">
                    ✓ Claimed on {entry.claim_date ? new Date(entry.claim_date).toLocaleDateString() : 'N/A'}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Portfolio;