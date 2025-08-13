import { ArrowLeft, Calendar, Clock, TrendingUp, Wallet, Shield, AlertCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLendingTransaction } from '@/hooks/useLendingTransaction';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';

const LendingConfirmation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [isAgreed, setIsAgreed] = useState(false);
  
  const { pool, token, amount, lendingPeriod, balance } = location.state || {};

  const {
    handleLend,
    isProcessing,
    step,
    isCorrectNetwork,
    currentChain,
    isValidating,
    isSwitching,
    switchError,
    retryNetworkSwitch
  } = useLendingTransaction({
    pool,
    token,
    amount,
    lendingPeriod,
    balance,
    onSuccess: () => {
      toast({
        title: "Lending Successful",
        description: "Your lending transaction has been completed successfully!"
      });
      navigate('/portfolio');
    }
  });

  if (!pool || !token || !amount || !lendingPeriod) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="sticky top-0 z-10 bg-background border-b">
          <div className="flex items-center gap-4 p-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/wallet')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">Confirmation</h1>
          </div>
        </div>
        <div className="p-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Missing lending details. Please go back and select your lending options.
            </AlertDescription>
          </Alert>
          <Button onClick={() => navigate('/wallet')} className="w-full mt-4">
            Back to Wallet
          </Button>
        </div>
      </div>
    );
  }

  const projectedReturn = parseFloat(amount) * (1 + (pool.monthly_interest / 100) * (lendingPeriod / 30));
  const interestEarned = projectedReturn - parseFloat(amount);

  // Clear any caches on mount to ensure fresh data
  useEffect(() => {
    // Force refresh network status and any cached balance data
    if (typeof window !== 'undefined') {
      // Clear any relevant localStorage caches
      const keysToRemove = Object.keys(localStorage).filter(key => 
        key.includes('portfolio') || key.includes('wallet') || key.includes('balance')
      );
      keysToRemove.forEach(key => localStorage.removeItem(key));
    }
  }, []);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center gap-4 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Confirm Lending</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Network Status */}
        {!isCorrectNetwork && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {isValidating ? (
                "Validating network..."
              ) : isSwitching ? (
                "Switching to correct network..."
              ) : switchError ? (
                <>
                  Failed to switch to {token.chain} network. 
                  <Button variant="link" size="sm" onClick={retryNetworkSwitch} className="p-0 h-auto ml-1">
                    Try again
                  </Button>
                </>
              ) : (
                `Please switch to ${token.chain} network to continue`
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Lending Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Lending Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-semibold text-lg">{amount} {token.symbol}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Network</span>
              <Badge variant="outline" className="capitalize">{token.chain}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Lending Period</span>
              <span className="font-medium">{lendingPeriod} days</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Monthly Interest</span>
              <span className="font-medium text-green-600">{pool.monthly_interest}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Returns Projection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Projected Returns
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Principal Amount</span>
              <span className="font-medium">{amount} {token.symbol}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Interest Earned</span>
              <span className="font-medium text-green-600">+{interestEarned.toFixed(4)} {token.symbol}</span>
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total Return</span>
                <span className="font-bold text-lg">{projectedReturn.toFixed(4)} {token.symbol}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pool Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Pool Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Target Amount</span>
              <span className="font-medium">{pool.target_amount} {token.symbol}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Closing Date</span>
              <span className="font-medium">{new Date(pool.closing_date).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Period Range</span>
              <span className="font-medium">{pool.min_lend_period}-{pool.max_lend_period} days</span>
            </div>
          </CardContent>
        </Card>

        {/* Terms Agreement */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Terms & Conditions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="agreement"
                  checked={isAgreed}
                  onChange={(e) => setIsAgreed(e.target.checked)}
                  className="mt-1"
                />
                <label htmlFor="agreement" className="text-sm text-muted-foreground leading-relaxed">
                  I understand that this is a lending transaction and I agree to lend my tokens for the specified period. 
                  The projected returns are estimates and actual returns may vary. I understand the risks involved in DeFi lending.
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transaction Status */}
        {step === 'confirming' && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Please confirm the transaction in your wallet to complete the lending process.
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={handleLend}
            disabled={!isAgreed || isProcessing || !isCorrectNetwork || isValidating || isSwitching}
            className="w-full"
            size="lg"
          >
            {isProcessing ? (
              step === 'confirming' ? "Confirming Transaction..." : "Processing..."
            ) : (
              "Confirm Lending"
            )}
          </Button>
          
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            disabled={isProcessing}
            className="w-full"
          >
            Back
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LendingConfirmation;