import { useState, useCallback } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNetworkManager } from './useNetworkManager';

export interface IdentityVerificationResult {
  isVerified: boolean;
  verificationUrl?: string;
  error?: string;
  canClaim: boolean;
  whitelistedAddress?: string;
}

export interface IdentityCheckResult {
  isVerified: boolean;
  canClaim: boolean;
  whitelistedAddress?: string;
  error?: string;
}

export const useGoodDollarIdentity = () => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const { user } = usePrivy();
  const { wallets } = useWallets();
  
  // Ensure we're on Celo network for GoodDollar operations
  useNetworkManager('celo', true);

  const checkIdentityVerification = useCallback(async (): Promise<IdentityCheckResult> => {
    if (!user || !wallets[0]) {
      return { 
        isVerified: false, 
        canClaim: false, 
        error: 'Wallet not connected' 
      };
    }

    setIsChecking(true);
    
    try {
      const walletAddress = wallets[0].address;
      
      // Call our Supabase edge function for identity verification
      const { data, error } = await supabase.functions.invoke('gooddollar-identity-check', {
        body: { walletAddress }
      });

      if (error) {
        console.error('Identity check error:', error);
        return { 
          isVerified: false, 
          canClaim: false, 
          error: error.message 
        };
      }

      return {
        isVerified: data.isVerified,
        canClaim: data.canClaim,
        whitelistedAddress: data.whitelistedAddress
      };
      
    } catch (error) {
      console.error('Failed to check identity verification:', error);
      return { 
        isVerified: false, 
        canClaim: false, 
        error: 'Failed to check verification status' 
      };
    } finally {
      setIsChecking(false);
    }
  }, [user, wallets]);

  const startIdentityVerification = useCallback(async (): Promise<IdentityVerificationResult> => {
    if (!user || !wallets[0]) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet to start verification.",
        variant: "destructive"
      });
      return { 
        isVerified: false, 
        canClaim: false, 
        error: 'Wallet not connected' 
      };
    }

    setIsVerifying(true);

    try {
      const walletAddress = wallets[0].address;
      
      // First check if already verified
      const currentStatus = await checkIdentityVerification();
      if (currentStatus.isVerified) {
        toast({
          title: "Already Verified",
          description: "Your identity is already verified with GoodDollar.",
        });
        return {
          isVerified: true,
          canClaim: currentStatus.canClaim,
          whitelistedAddress: currentStatus.whitelistedAddress
        };
      }

      // Start new verification process through embedded modal
      toast({
        title: "Identity Verification Starting",
        description: "Complete the face verification process in the modal that will open.",
      });

      // Open verification modal instead of redirecting
      setShowVerificationModal(true);
      
      return {
        isVerified: false,
        canClaim: false
      };
      
    } catch (error) {
      console.error('Failed to start identity verification:', error);
      toast({
        title: "Verification Failed",
        description: "Failed to start identity verification process.",
        variant: "destructive"
      });
      return { 
        isVerified: false, 
        canClaim: false, 
        error: 'Failed to start verification' 
      };
    } finally {
      setIsVerifying(false);
    }
  }, [user, wallets, checkIdentityVerification]);

  const handleVerificationComplete = async () => {
    setShowVerificationModal(false);
    // Check verification status after completion
    await checkIdentityVerification();
  };

  const handleModalClose = () => {
    setShowVerificationModal(false);
    setIsVerifying(false);
  };

  return {
    checkIdentityVerification,
    startIdentityVerification,
    isVerifying,
    isChecking,
    showVerificationModal,
    handleVerificationComplete,
    handleModalClose
  };
};