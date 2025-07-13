import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle, Clock, AlertCircle } from 'lucide-react';
// import { useNetworkManager } from '@/hooks/useNetworkManager';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const GoodDollarClaim = () => {
  const navigate = useNavigate();
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const [claimStatus, setClaimStatus] = useState<'available' | 'claimed' | 'cooldown'>('available');
  const [isLoading, setIsLoading] = useState(false);
  const [estimatedAmount, setEstimatedAmount] = useState('100'); // G$ amount
  const [nextClaimTime, setNextClaimTime] = useState<Date | null>(null);

  // Auto-switch to Celo network when entering this page
  // useNetworkManager('celo', authenticated);

  useEffect(() => {
    if (!authenticated) {
      navigate('/');
      return;
    }

    // Check claim status
    checkClaimStatus();
  }, [authenticated, navigate, wallets]);

  const checkClaimStatus = async () => {
    if (!wallets || wallets.length === 0) return;

    try {
      const { data, error } = await supabase.functions.invoke('gooddollar-claim', {
        body: { 
          walletAddress: wallets[0].address,
          action: 'checkStatus'
        }
      });

      if (error) {
        console.error('Error checking claim status:', error);
        return;
      }

      if (data.canClaim) {
        setClaimStatus('available');
      } else {
        setClaimStatus('cooldown');
        if (data.nextClaimTime) {
          setNextClaimTime(new Date(data.nextClaimTime));
        }
      }
    } catch (error) {
      console.error('Error checking claim status:', error);
    }
  };

  const handleClaim = async () => {
    if (!wallets || wallets.length === 0) {
      toast({
        title: "No Wallet Connected",
        description: "Please connect a wallet to claim G$ tokens.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Call our edge function to process the claim
      const { data, error } = await supabase.functions.invoke('gooddollar-claim', {
        body: { 
          walletAddress: wallets[0].address,
          action: 'claim'
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.success) {
        setClaimStatus('claimed');
        
        toast({
          title: "Claim Successful!",
          description: `You've successfully claimed ${data.amount || estimatedAmount} G$ tokens.`,
        });

        // Redirect back to wallet page after successful claim
        setTimeout(() => {
          navigate('/wallet');
        }, 2000);
      } else {
        throw new Error(data.message || 'Claim failed');
      }

    } catch (error) {
      console.error('Claim failed:', error);
      toast({
        title: "Claim Failed",
        description: error instanceof Error ? error.message : "Failed to claim G$ tokens. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimeRemaining = (targetTime: Date) => {
    const now = new Date();
    const diff = targetTime.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const getStatusBadge = () => {
    switch (claimStatus) {
      case 'available':
        return <Badge variant="default" className="bg-green-100 text-green-800">Available</Badge>;
      case 'claimed':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Claimed</Badge>;
      case 'cooldown':
        return <Badge variant="secondary">Cooldown</Badge>;
    }
  };

  const getStatusIcon = () => {
    switch (claimStatus) {
      case 'available':
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      case 'claimed':
        return <CheckCircle className="h-6 w-6 text-blue-600" />;
      case 'cooldown':
        return <Clock className="h-6 w-6 text-orange-600" />;
    }
  };

  if (!authenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/wallet')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Claim GoodDollar</h1>
        </div>

        {/* Network Notice */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-muted-foreground">
                Connected to Celo Network
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Claim Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon()}
                Daily G$ Claim
              </CardTitle>
              {getStatusBadge()}
            </div>
            <CardDescription>
              Claim your daily allocation of GoodDollar (G$) tokens
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Estimated Amount */}
            <div className="text-center p-6 bg-muted rounded-lg">
              <div className="text-3xl font-bold text-primary">
                {estimatedAmount} G$
              </div>
              <div className="text-sm text-muted-foreground">
                Estimated daily claim
              </div>
            </div>

            {/* Status Information */}
            {claimStatus === 'cooldown' && nextClaimTime && (
              <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <span className="text-sm text-orange-800">
                  Next claim available in {formatTimeRemaining(nextClaimTime)}
                </span>
              </div>
            )}

            {claimStatus === 'claimed' && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-800">
                  Successfully claimed today's G$ tokens!
                </span>
              </div>
            )}

            {/* Claim Button */}
            <Button 
              onClick={handleClaim}
              disabled={claimStatus !== 'available' || isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? 'Claiming...' : 
               claimStatus === 'available' ? 'Claim G$ Tokens' :
               claimStatus === 'claimed' ? 'Already Claimed Today' :
               'Claim Not Available'}
            </Button>

            {/* Information */}
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Daily claims reset every 24 hours</p>
              <p>• Claims are processed on the Celo network</p>
              <p>• Verification handled through secure backend</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GoodDollarClaim;