import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Target, TrendingUp, Users, DollarSign, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLendingPoolDetail } from '@/hooks/useLendingPoolDetail';
import { useAuth } from '@/contexts/AuthContext';
import BottomNavigation from '@/components/BottomNavigation';
import LendingPoolDetailSkeleton from '@/components/skeletons/LendingPoolDetailSkeleton';

const LendingPoolDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    ready, 
    authenticated, 
    walletsLoading, 
    hasConnectedWallet, 
    isStable 
  } = useAuth();
  const { lendingPool: pool, basicPool, isLoading, isFundingLoading } = useLendingPoolDetail(id);
  const [lendingPeriod, setLendingPeriod] = useState<number[]>([30]);
  const [lendAmount, setLendAmount] = useState<string>('');

  useEffect(() => {
    const activePool = pool || basicPool;
    if (activePool) {
      setLendingPeriod([activePool.min_lend_period]);
    }
  }, [pool, basicPool]);

  // Calculate system readiness
  const systemReady = ready && authenticated && !walletsLoading && hasConnectedWallet && isStable;
  const hasValidAmount = lendAmount && parseFloat(lendAmount) > 0;
  const canProceed = systemReady && hasValidAmount && (pool || basicPool);

  // Determine button state and message
  const getButtonState = () => {
    if (!ready) return { disabled: true, text: 'Loading authentication...', loading: true };
    if (!authenticated) return { disabled: true, text: 'Please log in', loading: false };
    if (walletsLoading) return { disabled: true, text: 'Connecting Wallet...', loading: true };
    if (!hasConnectedWallet) return { disabled: true, text: 'Please connect wallet', loading: false };
    if (!isStable) return { disabled: true, text: 'Initializing...', loading: true };
    if (isLoading) return { disabled: true, text: 'Loading pool data...', loading: true };
    if (!hasValidAmount) return { disabled: true, text: 'Enter amount to proceed', loading: false };
    return { disabled: false, text: 'Proceed to Token Selection', loading: false };
  };

  const buttonState = getButtonState();

  if (isLoading) {
    return <LendingPoolDetailSkeleton />;
  }

  const activePool = pool || basicPool;
  
  if (!activePool) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="sticky top-0 z-10 bg-background border-b">
          <div className="flex items-center gap-4 p-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/wallet')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">Pool Not Found</h1>
          </div>
        </div>
        <div className="p-4">
          <Alert>
            <AlertDescription>
              The lending pool you're looking for could not be found.
            </AlertDescription>
          </Alert>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  const selectedPeriod = lendingPeriod[0];
  const monthlyInterest = activePool.monthly_interest;
  const periodsInMonths = selectedPeriod / 30;
  const estimatedInterest = monthlyInterest * periodsInMonths;
  const isClosingSoon = new Date(activePool.closing_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const handleProceed = () => {
    console.log('Proceeding with lendAmount:', lendAmount);
    
    if (!lendAmount || parseFloat(lendAmount) <= 0) {
      alert('Please enter a valid lending amount');
      return;
    }
    
    navigate(`/lending/${activePool.id}/tokens`, { 
      state: { 
        pool: pool || activePool,
        selectedPeriod,
        lendAmount: parseFloat(lendAmount) // Convert to number
      } 
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center gap-4 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/wallet')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Lending Details</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {isClosingSoon && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              This lending pool closes soon! Don't miss this opportunity.
            </AlertDescription>
          </Alert>
        )}

        {/* Pool Info Card - Shows basic info immediately */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Pool Overview</CardTitle>
              <Badge variant="secondary">{activePool.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Target Amount</p>
                <p className="text-xl font-semibold">${activePool.target_amount.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Monthly Interest</p>
                <p className="text-xl font-semibold text-green-600">{activePool.monthly_interest}%</p>
              </div>
            </div>
            
            {pool && !isFundingLoading ? (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Funding Progress</span>
                  <span>{pool.funding_progress.toFixed(1)}%</span>
                </div>
                <Progress value={pool.funding_progress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  ${pool.total_lent?.toLocaleString() || '0'} of ${activePool.target_amount.toLocaleString()} raised
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Funding Progress</span>
                  <span className="text-muted-foreground">Loading...</span>
                </div>
                <div className="h-2 bg-muted rounded-full animate-pulse" />
                <p className="text-xs text-muted-foreground">Loading funding details...</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Lend Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="lend-amount" className="font-bold">
                Amount to Lend
              </Label>
              <Input
                id="lend-amount"
                type="number"
                placeholder="Enter amount (e.g., 100)"
                value={lendAmount}
                onChange={(e) => setLendAmount(e.target.value)}
                min="0"
                step="0.01"
                className="text-lg"
              />
              <p className="text-xs text-muted-foreground">
                Enter the amount you want to lend to this pool
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Lending Period</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">Lending Period</span>
                <span className="text-lg font-semibold">{selectedPeriod} days</span>
              </div>
              <Slider
                value={lendingPeriod}
                onValueChange={setLendingPeriod}
                min={activePool.min_lend_period}
                max={activePool.max_lend_period}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{activePool.min_lend_period} days</span>
                <span>{activePool.max_lend_period} days</span>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h3 className="font-semibold">Interest Calculation</h3>
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Selected Period:</span>
                  <span className="font-medium">{selectedPeriod} days ({periodsInMonths.toFixed(1)} months)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Monthly Interest Rate:</span>
                  <span className="font-medium">{monthlyInterest}%</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span className="text-sm font-semibold">Estimated Total Interest:</span>
                  <span className="font-bold">{estimatedInterest.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between text-primary">
                  <span className="text-sm font-semibold">Estimated Total Return:</span>
                  <span className="font-bold">
                    ${lendAmount ? (parseFloat(lendAmount) * (1 + estimatedInterest / 100)).toFixed(2) : '0'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                * Interest is calculated based on the actual lending period and may vary
              </p>
            </div>
          </CardContent>
        </Card>

        <Button 
          onClick={handleProceed}
          className="w-full h-12"
          size="lg"
          disabled={buttonState.disabled}
        >
          {buttonState.loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {buttonState.text}
        </Button>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default LendingPoolDetail;