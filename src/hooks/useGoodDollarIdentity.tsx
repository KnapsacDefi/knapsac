import { useState, useEffect } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface IdentityStatus {
  isVerified: boolean;
  whitelistedAddress?: string;
  canClaim: boolean;
  loading: boolean;
}

export const useGoodDollarIdentity = () => {
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const [identityStatus, setIdentityStatus] = useState<IdentityStatus>({
    isVerified: false,
    canClaim: false,
    loading: true
  });

  useEffect(() => {
    if (!authenticated || !wallets[0]) {
      setIdentityStatus({ isVerified: false, canClaim: false, loading: false });
      return;
    }

    checkIdentityVerification();
  }, [authenticated, wallets]);

  const checkIdentityVerification = async () => {
    if (!wallets[0]) return;

    try {
      setIdentityStatus(prev => ({ ...prev, loading: true }));
      
      const walletAddress = wallets[0].address;
      
      // Call Supabase edge function to check identity status
      const { data, error } = await supabase.functions.invoke('gooddollar-identity-check', {
        body: { walletAddress }
      });

      if (error) {
        console.error('Identity check failed:', error);
        setIdentityStatus({ isVerified: false, canClaim: false, loading: false });
        return;
      }

      setIdentityStatus({
        isVerified: data.isVerified || false,
        whitelistedAddress: data.whitelistedAddress,
        canClaim: data.canClaim || false,
        loading: false
      });

    } catch (error) {
      console.error('Error checking identity:', error);
      setIdentityStatus({ isVerified: false, canClaim: false, loading: false });
    }
  };

  const startIdentityVerification = async () => {
    if (!wallets[0]) return;

    try {
      // Open GoodDollar identity verification flow
      const verificationUrl = `https://wallet.gooddollar.org/AppNavigation/Dashboard/FaceVerification?wallet=${wallets[0].address}`;
      
      toast({
        title: "Identity Verification Required",
        description: "Redirecting to GoodDollar for face verification...",
      });

      // Open in new window/tab
      window.open(verificationUrl, '_blank');
      
      // Show instructions to user
      toast({
        title: "Complete Verification",
        description: "Complete face verification in GoodDollar app, then return here to claim G$.",
      });

    } catch (error) {
      console.error('Error starting verification:', error);
      toast({
        title: "Verification Error",
        description: "Failed to start identity verification process.",
        variant: "destructive",
      });
    }
  };

  return {
    identityStatus,
    checkIdentityVerification,
    startIdentityVerification
  };
};