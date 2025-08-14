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
            <Card key={entry.id} className="overflow-hidden transition-all duration-200 hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl font-bold tracking-tight">
                      {entry.lend_amount} {entry.lend_token}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Lending Position
                    </p>
                  </div>
                  <Badge 
                    variant={entry.is_eligible ? "default" : "secondary"}
                    className={entry.is_eligible 
                      ? "bg-hsl(var(--success)) text-hsl(var(--success-foreground)) hover:bg-hsl(var(--success))/90" 
                      : "bg-hsl(var(--warning-muted)) text-hsl(var(--warning-muted-foreground)) border-hsl(var(--warning))/20"
                    }
                  >
                    {entry.is_eligible ? "Ready to Claim" : "Locked"}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Key metrics section */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-hsl(var(--success))" />
                      <span className="text-sm text-muted-foreground">Monthly Interest</span>
                    </div>
                    <p className="text-lg font-semibold text-hsl(var(--success))">
                      {entry.lending_pool.monthly_interest}%
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Lending Period</span>
                    </div>
                    <p className="text-lg font-semibold">
                      {entry.lend_period} days
                    </p>
                  </div>
                </div>

                {/* Details section */}
                <div className="space-y-3 pt-2 border-t border-border/50">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {entry.is_eligible ? "Eligible Since" : "Eligible From"}
                      </span>
                    </div>
                    <span className="font-medium">
                      {entry.eligible_date ? new Date(entry.eligible_date).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Blockchain</span>
                    </div>
                    <span className="font-medium capitalize">{entry.chain}</span>
                  </div>
                </div>

                {/* Claimable amount section */}
                {entry.is_eligible && (
                  <div className="bg-hsl(var(--success-muted)) border border-hsl(var(--success))/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-hsl(var(--success-muted-foreground))">
                          Available to Claim
                        </p>
                        <p className="text-xs text-hsl(var(--success-muted-foreground))/70 mt-1">
                          Principal + Interest Earned
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-hsl(var(--success))">
                          {entry.claimable_amount.toFixed(4)}
                        </p>
                        <p className="text-sm text-hsl(var(--success-muted-foreground))">
                          {entry.lend_token}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action button */}
                <Button 
                  onClick={() => handleClaim(entry)}
                  disabled={!entry.is_eligible}
                  variant={entry.is_eligible ? "default" : "outline"}
                  className="w-full h-11 font-semibold"
                  size="lg"
                >
                  {entry.is_eligible ? "Claim Rewards" : "Not Yet Eligible"}
                </Button>

                {/* Claim status */}
                {entry.payment_status === 'completed' && (
                  <div className="flex items-center gap-2 text-xs text-hsl(var(--success)) bg-hsl(var(--success-muted)) rounded-md px-3 py-2">
                    <div className="w-1.5 h-1.5 bg-hsl(var(--success)) rounded-full"></div>
                    <span>
                      Claimed on {entry.claim_date ? new Date(entry.claim_date).toLocaleDateString() : 'N/A'}
                    </span>
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