
import { useState, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { toast } from '@/hooks/use-toast';
import { useGoodDollarIdentity } from './useGoodDollarIdentity';
import { ClaimSDK, IdentitySDK } from '@goodsdks/citizen-sdk';

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

  // Initialize ClaimSDK with actual GoodDollar SDK
  const initializeSDK = useCallback(async () => {
    if (!address || !publicClient || !walletClient) return null;

    try {
      // Create IdentitySDK instance
      const identitySDK = new IdentitySDK(publicClient, walletClient, 'production');
      
      const claimSDK = new ClaimSDK({
        account: address,
        publicClient,
        walletClient,
        identitySDK,
        env: 'production',
      });
      
      return claimSDK;
    } catch (error) {
      console.error('Failed to initialize GoodDollar ClaimSDK:', error);
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

      const claimSDK = await initializeSDK();
      if (!claimSDK) {
        return { canClaim: false, amount: '0' };
      }

      // Use actual SDK to check entitlement
      const entitlement = await claimSDK.checkEntitlement(publicClient);
      const canClaim = entitlement > 0n;
      
      return {
        canClaim,
        amount: entitlement.toString()
      };
    } catch (error) {
      console.error('Error in checkClaimEligibility:', error);
      return { canClaim: false, amount: '0' };
    }
  }, [authenticated, address, checkIdentityVerification, initializeSDK, publicClient]);

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
      const claimSDK = await initializeSDK();
      if (!claimSDK) {
        setClaiming(false);
        return { success: false, error: 'Failed to initialize SDK' };
      }

      // Check eligibility using SDK
      const eligibility = await checkClaimEligibility();
      if (!eligibility.canClaim) {
        setClaiming(false);
        return { success: false, error: 'Not eligible to claim' };
      }

      // Use actual SDK to claim UBI
      const receipt = await claimSDK.claim();
      
      toast({
        title: "Claim Successful!",
        description: `Successfully claimed G$ tokens. Transaction: ${receipt.transactionHash}`,
      });

      setClaiming(false);
      return { 
        success: true, 
        transactionHash: receipt.transactionHash,
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
