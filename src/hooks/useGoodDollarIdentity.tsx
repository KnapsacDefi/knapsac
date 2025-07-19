
import { useState, useCallback } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { toast } from '@/hooks/use-toast';
import { useNetworkManager } from './useNetworkManager';
import { useGoodDollarWagmi } from './useGoodDollarWagmi';

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
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const { user } = usePrivy();
  const { wallets } = useWallets();
  
  const { 
    isWhitelisted, 
    checkIdentityVerification: wagmiCheckIdentity,
    identityLoading 
  } = useGoodDollarWagmi();
  
  // Ensure we're on Celo network for GoodDollar operations
  useNetworkManager('celo', true);

  const checkIdentityVerification = useCallback(async (): Promise<IdentityCheckResult> => {
    console.log('🔍 Starting identity verification check...');
    
    if (!user || !wallets[0]) {
      console.log('❌ No user or wallet found');
      return { 
        isVerified: false, 
        canClaim: false, 
        error: 'Wallet not connected' 
      };
    }

    try {
      // Use the Wagmi-integrated identity check
      const result = await wagmiCheckIdentity();
      console.log('✅ Identity check result:', result);
      
      return result;
      
    } catch (error) {
      console.error('❌ Failed to check identity verification:', error);
      return { 
        isVerified: false, 
        canClaim: false, 
        error: 'Failed to check verification status' 
      };
    }
  }, [user, wallets, wagmiCheckIdentity]);

  const startIdentityVerification = useCallback(async (): Promise<IdentityVerificationResult> => {
    console.log('🚀 Starting identity verification process...');
    
    if (!user || !wallets[0]) {
      console.log('❌ No user or wallet for verification');
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
    setVerificationError(null);

    try {
      const walletAddress = wallets[0].address;
      console.log('📋 Starting verification for wallet:', walletAddress);
      
      // Check if already verified using Wagmi hook
      if (isWhitelisted) {
        console.log('✅ Already verified via Wagmi hook');
        toast({
          title: "Already Verified",
          description: "Your identity is already verified with GoodDollar.",
        });
        setIsVerifying(false);
        return {
          isVerified: true,
          canClaim: true,
          whitelistedAddress: walletAddress
        };
      }

      // Start new verification process through embedded modal
      console.log('🔄 Opening verification modal...');
      toast({
        title: "Opening Verification",
        description: "Opening GoodDollar face verification modal...",
      });

      setShowVerificationModal(true);
      console.log('✅ Modal state set to true, isVerifying remains true');
      
      return {
        isVerified: false,
        canClaim: false
      };
      
    } catch (error) {
      console.error('❌ Failed to start identity verification:', error);
      setVerificationError(error instanceof Error ? error.message : 'Unknown error');
      setIsVerifying(false);
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
    }
  }, [user, wallets, isWhitelisted]);

  const handleVerificationComplete = async () => {
    console.log('✅ Verification completed, closing modal...');
    setShowVerificationModal(false);
    setIsVerifying(false);
    setVerificationError(null);
    
    // Check verification status after completion
    const result = await checkIdentityVerification();
    if (result.isVerified) {
      toast({
        title: "Verification Successful!",
        description: "Your identity has been verified with GoodDollar.",
      });
    }
  };

  const handleModalClose = () => {
    console.log('🔄 Modal closed by user');
    setShowVerificationModal(false);
    setIsVerifying(false);
    setVerificationError(null);
  };

  const openVerificationInNewTab = () => {
    if (!wallets[0]) return;
    
    const walletAddress = wallets[0].address;
    const verificationUrl = `https://wallet.gooddollar.org/?screen=FaceVerification&web3Provider=WalletConnect&address=${walletAddress}&redirect=${encodeURIComponent(window.location.origin + '/wallet')}`;
    
    console.log('🔗 Opening verification in new tab:', verificationUrl);
    window.open(verificationUrl, '_blank');
    
    toast({
      title: "Verification Opened",
      description: "Complete the verification in the new tab, then return to check your status.",
    });
    
    setIsVerifying(false);
  };

  return {
    checkIdentityVerification,
    startIdentityVerification,
    isVerifying,
    isChecking: identityLoading,
    showVerificationModal,
    verificationError,
    handleVerificationComplete,
    handleModalClose,
    openVerificationInNewTab,
    
    // Direct access to Wagmi state
    isWhitelisted,
    identityLoading
  };
};
