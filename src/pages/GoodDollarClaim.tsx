
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle, Clock, AlertCircle, ShieldCheck, UserCheck } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useGoodDollarIdentity } from '@/hooks/useGoodDollarIdentity';
import { useGoodDollarClaim } from '@/hooks/useGoodDollarClaim';
import { useGoodDollarSDK } from '@/hooks/useGoodDollarSDK';
import { GoodDollarVerificationModal } from '@/components/GoodDollarVerificationModal';
import { GoodDollarTestButtons } from '@/components/GoodDollarTestButtons';

const GoodDollarClaim = (): JSX.Element => {
  const navigate = useNavigate();
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  
  const [claimStatus, setClaimStatus] = useState<'available' | 'claimed' | 'cooldown' | 'loading' | 'not-eligible' | 'not-verified'>('loading');
  const [estimatedAmount, setEstimatedAmount] = useState<string>('');
  const [nextClaimTime, setNextClaimTime] = useState<Date | null>(null);

  const { 
    checkIdentityVerification, 
    startIdentityVerification, 
    isVerifying, 
    isChecking,
    showVerificationModal,
    handleVerificationComplete,
    handleModalClose
  } = useGoodDollarIdentity();
  
  const [identityStatus, setIdentityStatus] = useState({ isVerified: false, loading: true });
  const { claimGoodDollar, checkClaimEligibility, claiming } = useGoodDollarClaim();
  const { checkIdentityVerification: sdkCheckIdentity } = useGoodDollarSDK();

  useEffect(() => {
    if (!authenticated) {
      navigate('/');
      return;
    }
    
    if (wallets.length > 0) {
      checkIdentityAndClaimStatus();
    }
  }, [authenticated, wallets, navigate]);

  const checkIdentityAndClaimStatus = async (): Promise<void> => {
    if (!wallets[0]) return;

    try {
      // Use the improved SDK-based identity check
      const identity = await sdkCheckIdentity();
      setIdentityStatus({
        isVerified: identity.isVerified,
        loading: false
      });

      // Then check claim status based on the actual identity result
      await checkClaimStatus(identity.isVerified);
    } catch (error) {
      console.error('Error checking identity and claim status:', error);
      setIdentityStatus({ isVerified: false, loading: false });
      setClaimStatus('not-verified');
    }
  };

  const checkClaimStatus = async (isIdentityVerified?: boolean): Promise<void> => {
    if (!wallets[0]) return;

    try {
      setClaimStatus('loading');

      // Use the passed parameter or current state
      const verified = isIdentityVerified !== undefined ? isIdentityVerified : identityStatus.isVerified;
      
      // First check identity verification
      if (!verified) {
        setClaimStatus('not-verified');
        return;
      }

      // Check claim eligibility from GoodDollar contracts
      const { canClaim, amount } = await checkClaimEligibility();

      if (canClaim) {
        setClaimStatus('available');
        setEstimatedAmount(amount);
      } else {
        // Check if there's a cooldown period from previous claims
        const walletAddress = wallets[0].address;
        const { data } = await supabase.functions.invoke('gooddollar-claim', {
          body: { 
            walletAddress,
            action: 'checkStatus'
          }
        });

        if (data?.nextClaimTime) {
          setNextClaimTime(new Date(data.nextClaimTime));
          setClaimStatus('cooldown');
        } else {
          setClaimStatus('not-eligible');
        }
      }
    } catch (error) {
      console.error('Error in checkClaimStatus:', error);
      setClaimStatus('not-eligible');
    }
  };

  const handleClaim = async (): Promise<void> => {
    if (!identityStatus.isVerified) {
      toast({
        title: "Identity Verification Required",
        description: "Please complete identity verification before claiming G$ tokens.",
        variant: "destructive",
      });
      return;
    }

    const result = await claimGoodDollar();
    
    if (result.success) {
      setClaimStatus('claimed');
      toast({
        title: "Claim Successful!",
        description: `Successfully claimed G$ tokens! TX: ${result.transactionHash}`,
      });
      
      // Redirect to wallet after successful claim
      setTimeout(() => {
        navigate('/wallet');
      }, 3000);
    } else {
      setClaimStatus('not-eligible');
    }
  };

  const formatTimeRemaining = (targetTime: Date): string => {
    const now = new Date();
    const diff = targetTime.getTime() - now.getTime();
    
    if (diff <= 0) return "Available now";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  const getStatusBadge = (): JSX.Element => {
    switch (claimStatus) {
      case 'available':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Available</Badge>;
      case 'claimed':
        return <Badge variant="default" className="bg-blue-500"><CheckCircle className="w-3 h-3 mr-1" />Claimed</Badge>;
      case 'cooldown':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Cooldown</Badge>;
      case 'not-verified':
        return <Badge variant="destructive"><ShieldCheck className="w-3 h-3 mr-1" />Not Verified</Badge>;
      case 'loading':
        return <Badge variant="outline">Loading...</Badge>;
      default:
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Not Eligible</Badge>;
    }
  };

  const getStatusIcon = (): JSX.Element => {
    switch (claimStatus) {
      case 'available':
        return <CheckCircle className="w-16 h-16 text-green-500" />;
      case 'claimed':
        return <CheckCircle className="w-16 h-16 text-blue-500" />;
      case 'cooldown':
        return <Clock className="w-16 h-16 text-yellow-500" />;
      case 'not-verified':
        return <ShieldCheck className="w-16 h-16 text-red-500" />;
      case 'loading':
        return <Clock className="w-16 h-16 text-gray-400 animate-spin" />;
      default:
        return <AlertCircle className="w-16 h-16 text-red-500" />;
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

        {/* Identity Status Card */}
        {!identityStatus.loading && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                {identityStatus.isVerified ? (
                  <>
                    <div className="h-3 w-3 bg-green-500 rounded-full" />
                    <span className="text-sm text-green-600 font-medium">Identity Verified</span>
                  </>
                ) : (
                  <>
                    <div className="h-3 w-3 bg-red-500 rounded-full" />
                    <span className="text-sm text-red-600 font-medium">Identity Not Verified</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Claim Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3">
                {getStatusIcon()}
                <div>
                  <div>GoodDollar Claim</div>
                  <div className="text-sm font-normal text-muted-foreground">
                    Daily UBI tokens
                  </div>
                </div>
              </CardTitle>
              {getStatusBadge()}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {!identityStatus.isVerified && !identityStatus.loading && (
                <div className="text-center space-y-4">
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <UserCheck className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                    <h3 className="font-semibold text-yellow-800">Identity Verification Required</h3>
                    <p className="text-sm text-yellow-700 mt-2">
                      You must complete GoodDollar's identity verification (face verification) before claiming G$ tokens.
                    </p>
                  </div>
                  <Button 
                    onClick={startIdentityVerification}
                    disabled={isVerifying}
                    className="w-full bg-yellow-500 hover:bg-yellow-600"
                  >
                    {isVerifying ? 'Opening Verification...' : 'Start Identity Verification'}
                  </Button>
                  <Button 
                    onClick={() => checkIdentityAndClaimStatus()}
                    disabled={isChecking}
                    variant="outline"
                    className="w-full"
                  >
                    {isChecking ? 'Checking Status...' : 'Check Verification Status'}
                  </Button>
                </div>
              )}

              {identityStatus.isVerified && claimStatus === 'available' && (
                <Button 
                  onClick={handleClaim} 
                  disabled={claiming}
                  className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700"
                >
                  {claiming ? 'Claiming G$ Tokens...' : `Claim ${estimatedAmount} G$ Tokens`}
                </Button>
              )}

              {claimStatus === 'claimed' && (
                <div className="text-center space-y-4">
                  <p className="text-green-600 font-semibold">Claim successful!</p>
                  <p className="text-sm text-gray-600">Redirecting to wallet...</p>
                </div>
              )}

              {claimStatus === 'cooldown' && nextClaimTime && (
                <div className="text-center space-y-4">
                  <p className="text-yellow-600 font-semibold">Next claim available in:</p>
                  <p className="text-lg font-mono">{formatTimeRemaining(nextClaimTime)}</p>
                </div>
              )}

              {claimStatus === 'not-eligible' && identityStatus.isVerified && (
                <div className="text-center space-y-4">
                  <p className="text-red-600 font-semibold">No G$ tokens available to claim at this time.</p>
                  <p className="text-sm text-gray-600">Please check back later for your next claim.</p>
                </div>
              )}

              {claimStatus === 'loading' && (
                <div className="text-center">
                  <p className="text-gray-600">Checking claim status...</p>
                </div>
              )}
            </div>

            {/* Information */}
            <div className="mt-6 pt-4 border-t">
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Identity verification required for all claims</p>
                <p>• Claims processed on Celo network</p>
                <p>• Daily claim amounts determined by GoodDollar protocol</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Buttons for Development */}
        <GoodDollarTestButtons />
      </div>

      {/* Verification Modal */}
      {wallets[0] && (
        <GoodDollarVerificationModal
          isOpen={showVerificationModal}
          onClose={handleModalClose}
          onVerificationComplete={handleVerificationComplete}
          walletAddress={wallets[0].address}
        />
      )}
    </div>
  );
};

export default GoodDollarClaim;
