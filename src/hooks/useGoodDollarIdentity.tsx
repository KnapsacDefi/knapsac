
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
  const { user } = usePrivy();
  const { wallets } = useWallets();
  
  const { 
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
      // Use the simplified Wagmi-integrated identity check
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

    try {
      const walletAddress = wallets[0].address;
      console.log('📋 Starting verification for wallet:', walletAddress);
      
      // Check if already verified
      const identityCheck = await checkIdentityVerification();
      if (identityCheck.isVerified) {
        console.log('✅ Already verified');
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

      // Direct user to GoodDollar web app for verification in new tab
      console.log('🔗 Opening GoodDollar web app for verification...');
      openVerificationInNewTab();
      
      setIsVerifying(false);
      return {
        isVerified: false,
        canClaim: false
      };
      
    } catch (error) {
      console.error('❌ Failed to start identity verification:', error);
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
  }, [user, wallets, checkIdentityVerification]);

  const openVerificationInNewTab = useCallback(() => {
    if (!wallets[0]) return;
    
    const walletAddress = wallets[0].address;
    const verificationUrl = `https://wallet.gooddollar.org/?screen=FaceVerification&web3Provider=WalletConnect&address=${walletAddress}&redirect=${encodeURIComponent(window.location.origin + '/wallet')}`;
    
    console.log('🔗 Opening verification in new tab:', verificationUrl);
    window.open(verificationUrl, '_blank');
    
    toast({
      title: "Verification Opened",
      description: "Complete the verification in the new tab, then return to check your status.",
    });
  }, [wallets]);

  return {
    checkIdentityVerification,
    startIdentityVerification,
    isVerifying,
    isChecking: identityLoading,
    openVerificationInNewTab,
    identityLoading
  };
};
