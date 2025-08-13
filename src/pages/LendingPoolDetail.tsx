import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Target, TrendingUp, Users, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLendingPools } from '@/hooks/useLendingPools';
import { useAuth } from '@/contexts/AuthContext';
import BottomNavigation from '@/components/BottomNavigation';

const LendingPoolDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { authenticated } = useAuth();
  const { lendingPools, isLoading } = useLendingPools();
  const [lendingPeriod, setLendingPeriod] = useState<number[]>([30]);
  const [lendAmount, setLendAmount] = useState<string>('');

  const pool = lendingPools.find(p => p.id === id);

  useEffect(() => {
    if (pool) {
      setLendingPeriod([pool.min_lend_period]);
    }
  }, [pool]);


  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="p-4 text-center">
          <p className="text-muted-foreground">Please log in to view lending details</p>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="sticky top-0 z-10 bg-background border-b">
          <div className="flex items-center gap-4 p-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/wallet')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">Loading...</h1>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  if (!pool) {
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
  const monthlyInterest = pool.monthly_interest;
  const periodsInMonths = selectedPeriod / 30;
  const estimatedInterest = monthlyInterest * periodsInMonths;
  const isClosingSoon = new Date(pool.closing_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const handleProceed = () => {
    navigate(`/lending/${pool.id}/tokens`, { 
      state: { 
        pool,
        selectedPeriod,
        lendAmount 
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
                min={pool.min_lend_period}
                max={pool.max_lend_period}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{pool.min_lend_period} days</span>
                <span>{pool.max_lend_period} days</span>
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
        >
          Proceed to Token Selection
        </Button>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default LendingPoolDetail;