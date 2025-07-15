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
      
      // Call Supabase edge function to check identity status with GoodDollar contracts
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
      // Use GoodDollar's official identity verification flow
      const verificationUrl = `https://wallet.gooddollar.org/AppNavigation/Dashboard/FaceVerification?redirectTo=${encodeURIComponent(window.location.origin)}&wallet=${wallets[0].address}`;
      
      toast({
        title: "Identity Verification Required",
        description: "Redirecting to GoodDollar for face verification...",
      });

      // Open in new window/tab with proper redirect handling
      const popup = window.open(verificationUrl, 'gooddollar-verification', 'width=500,height=700');
      
      // Listen for verification completion
      const handleMessage = (event: MessageEvent) => {
        if (event.origin === 'https://wallet.gooddollar.org' && event.data.type === 'VERIFICATION_COMPLETE') {
          popup?.close();
          checkIdentityVerification(); // Refresh verification status
          toast({
            title: "Verification Complete",
            description: "Identity verification completed successfully!",
          });
          window.removeEventListener('message', handleMessage);
        }
      };
      
      window.addEventListener('message', handleMessage);
      
      // Fallback instructions
      setTimeout(() => {
        toast({
          title: "Complete Verification",
          description: "Complete face verification in GoodDollar app, then return here to refresh your status.",
        });
      }, 2000);

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