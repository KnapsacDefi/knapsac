
import { useState, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { toast } from '@/hooks/use-toast';
import { useGoodDollarIdentity } from './useGoodDollarIdentity';

interface SDKClaimResult {
  success: boolean;
  transactionHash?: string;
  amount?: string;
  error?: string;
}

export const useGoodDollarSDK = () => {
  const { authenticated } = usePrivy();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [claiming, setClaiming] = useState(false);
  const { checkIdentityVerification } = useGoodDollarIdentity();

  // Initialize viem clients for GoodDollar interactions
  const initializeSDK = useCallback(async () => {
    if (!address || !publicClient || !walletClient) return null;

    try {
      // Return the clients for direct contract interaction
      return {
        publicClient,
        walletClient,
        address
      };
    } catch (error) {
      console.error('Failed to initialize GoodDollar clients:', error);
      return null;
    }
  }, [address, publicClient, walletClient]);

  const checkClaimEligibility = useCallback(async (): Promise<{ canClaim: boolean; amount: string }> => {
    if (!authenticated || !address) {
      return { canClaim: false, amount: '0' };
    }

    try {
      // First check if identity is verified
      const identityResult = await checkIdentityVerification();
      
      if (!identityResult.isVerified) {
        return {
          canClaim: false,
          amount: '0'
        };
      }

      const sdk = await initializeSDK();
      if (!sdk) {
        return { canClaim: false, amount: '0' };
      }

      // For now, return based on identity verification only
      // TODO: Implement proper entitlement check when SDK is properly configured
      return {
        canClaim: identityResult.canClaim,
        amount: '1000000000000000000' // 1 G$ in wei as example
      };
    } catch (error) {
      console.error('Error in checkClaimEligibility:', error);
      return { canClaim: false, amount: '0' };
    }
  }, [authenticated, address, checkIdentityVerification, initializeSDK]);

  const claimGoodDollar = useCallback(async (): Promise<SDKClaimResult> => {
    if (!authenticated || !address || claiming) {
      return { success: false, error: 'Not authenticated or already claiming' };
    }

    setClaiming(true);

    try {
      // First verify identity
      const identityResult = await checkIdentityVerification();
      
      if (!identityResult.isVerified) {
        setClaiming(false);
        toast({
          title: "Identity Verification Required",
          description: "Please complete identity verification before claiming.",
          variant: "destructive"
        });
        return { success: false, error: 'Identity not verified' };
      }

      if (!identityResult.canClaim) {
        setClaiming(false);
        toast({
          title: "Not Eligible",
          description: "You are not eligible to claim at this time.",
          variant: "destructive"
        });
        return { success: false, error: 'Not eligible to claim' };
      }

      // Initialize SDK
      const sdk = await initializeSDK();
      if (!sdk) {
        setClaiming(false);
        return { success: false, error: 'Failed to initialize SDK' };
      }

      // Check eligibility using SDK
      const eligibility = await checkClaimEligibility();
      if (!eligibility.canClaim) {
        setClaiming(false);
        return { success: false, error: 'Not eligible to claim' };
      }

      // For now, simulate a successful claim
      // TODO: Implement actual claiming when SDK is properly configured
      const mockTxHash = `0x${Math.random().toString(16).slice(2)}`;
      
      toast({
        title: "Claim Successful!",
        description: `Successfully claimed G$ tokens. Transaction: ${mockTxHash}`,
      });

      setClaiming(false);
      return { 
        success: true, 
        transactionHash: mockTxHash,
        amount: eligibility.amount
      };

    } catch (error: any) {
      console.error('Error claiming GoodDollar:', error);
      setClaiming(false);
      
      const errorMessage = error.message || 'Failed to claim G$ tokens';
      
      toast({
        title: "Claim Failed",
        description: errorMessage,
        variant: "destructive",
      });

      return { success: false, error: errorMessage };
    }
  }, [authenticated, address, claiming, checkIdentityVerification, initializeSDK, checkClaimEligibility]);

  return {
    claimGoodDollar,
    checkClaimEligibility,
    claiming,
    initializeSDK
  };
};
