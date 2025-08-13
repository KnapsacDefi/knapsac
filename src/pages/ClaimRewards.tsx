import { ArrowLeft, Wallet, TrendingUp, CheckCircle, Clock } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { usePortfolio } from '@/hooks/usePortfolio';
import { useClaimRewards } from '@/hooks/useClaimRewards';
import { useAuth } from '@/contexts/AuthContext';

const ClaimRewards = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { authenticated } = useAuth();
  const { portfolio, isLoading: isLoadingPortfolio } = usePortfolio();
  
  const portfolioEntry = portfolio.find(entry => entry.id === id);
  
  const {
    claimRewards,
    isProcessing,
    step
  } = useClaimRewards({
    portfolioEntry,
    onSuccess: () => {
      navigate('/portfolio');
    }
  });

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="sticky top-0 z-10 bg-background border-b">
          <div className="flex items-center gap-4 p-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/portfolio')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">Claim Rewards</h1>
          </div>
        </div>
        <div className="p-4">
          <Alert>
            <AlertDescription>
              Please log in to claim your rewards.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (isLoadingPortfolio) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="sticky top-0 z-10 bg-background border-b">
          <div className="flex items-center gap-4 p-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/portfolio')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">Claim Rewards</h1>
          </div>
        </div>
        <div className="p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!portfolioEntry) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="sticky top-0 z-10 bg-background border-b">
          <div className="flex items-center gap-4 p-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/portfolio')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">Claim Rewards</h1>
          </div>
        </div>
        <div className="p-4">
          <Alert>
            <AlertDescription>
              Portfolio entry not found. Please check your portfolio and try again.
            </AlertDescription>
          </Alert>
          <Button onClick={() => navigate('/portfolio')} className="w-full mt-4">
            Back to Portfolio
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center gap-4 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/portfolio')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Claim Rewards</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Status Badge */}
        <div className="flex justify-center">
          <Badge 
            variant={portfolioEntry.is_eligible ? "default" : "secondary"}
            className="text-lg px-4 py-2"
          >
            {portfolioEntry.payment_status === 'completed' ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Already Claimed
              </>
            ) : portfolioEntry.is_eligible ? (
              <>
                <TrendingUp className="h-4 w-4 mr-2" />
                Ready to Claim
              </>
            ) : (
              <>
                <Clock className="h-4 w-4 mr-2" />
                Not Yet Eligible
              </>
            )}
          </Badge>
        </div>

        {/* Lending Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Lending Position
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Principal Amount</span>
              <span className="font-semibold">{portfolioEntry.lend_amount} {portfolioEntry.lend_token}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Interest Rate</span>
              <span className="font-medium text-green-600">{portfolioEntry.lending_pool.monthly_interest}%/month</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Lending Period</span>
              <span className="font-medium">{portfolioEntry.lend_period} days</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Network</span>
              <Badge variant="outline" className="capitalize">{portfolioEntry.chain}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Claimable Amount */}
        {portfolioEntry.is_eligible && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Claimable Rewards
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-green-50 dark:bg-green-950/20 p-6 rounded-lg border border-green-200 dark:border-green-800">
                <div className="text-center">
                  <div className="text-sm text-green-700 dark:text-green-300 mb-2">Total Claimable Amount</div>
                  <div className="text-3xl font-bold text-green-700 dark:text-green-300">
                    {portfolioEntry.claimable_amount.toFixed(4)} {portfolioEntry.lend_token}
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-400 mt-2">
                    Interest earned: {(portfolioEntry.claimable_amount - portfolioEntry.lend_amount).toFixed(4)} {portfolioEntry.lend_token}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Eligibility Information */}
        <Card>
          <CardHeader>
            <CardTitle>Eligibility Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">
                {portfolioEntry.is_eligible ? "Eligible Since" : "Eligible From"}
              </span>
              <span className="font-medium">
                {new Date(portfolioEntry.eligible_date).toLocaleDateString()}
              </span>
            </div>
            {portfolioEntry.claim_date && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Claimed On</span>
                <span className="font-medium">
                  {new Date(portfolioEntry.claim_date).toLocaleDateString()}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transaction Status */}
        {step === 'confirming' && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Please confirm the transaction in your wallet to claim your rewards.
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {portfolioEntry.payment_status === 'completed' ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Rewards have already been claimed successfully.
              </AlertDescription>
            </Alert>
          ) : portfolioEntry.is_eligible ? (
            <>
              <Button
                onClick={() => navigate(`/claim/${portfolioEntry.id}/withdraw`)}
                disabled={isProcessing}
                className="w-full"
                size="lg"
              >
                Withdraw to Mobile Money
              </Button>
              <Button
                variant="outline"
                onClick={claimRewards}
                disabled={isProcessing}
                className="w-full"
                size="lg"
              >
                {isProcessing ? (
                  step === 'confirming' ? "Confirming Transaction..." : "Processing Claim..."
                ) : (
                  `Direct Claim ${portfolioEntry.claimable_amount.toFixed(4)} ${portfolioEntry.lend_token}`
                )}
              </Button>
            </>
          ) : (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                This position is not yet eligible for claiming. Please wait until {new Date(portfolioEntry.eligible_date).toLocaleDateString()}.
              </AlertDescription>
            </Alert>
          )}
          
          <Button
            variant="outline"
            onClick={() => navigate('/portfolio')}
            disabled={isProcessing}
            className="w-full"
          >
            Back to Portfolio
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ClaimRewards;