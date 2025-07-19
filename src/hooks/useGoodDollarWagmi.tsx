
import { useCallback } from 'react';
import { useIdentitySDK } from '@goodsdks/identity-sdk/wagmi-sdk';
import { ClaimSDK } from '@goodsdks/identity-sdk/viem-claim-sdk';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { toast } from '@/hooks/use-toast';

interface ClaimResult {
  success: boolean;
  transactionHash?: string;
  amount?: string;
  error?: string;
}

export const useGoodDollarWagmi = () => {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  
  // Use the official Wagmi-integrated identity SDK
  const { 
    isWhitelisted, 
    checkWhitelist, 
    isLoading: identityLoading 
  } = useIdentitySDK({
    address,
    chainId: 42220, // Celo mainnet
  });

  // Check identity verification using the official hook
  const checkIdentityVerification = useCallback(async () => {
    if (!address) {
      return { isVerified: false, canClaim: false };
    }

    try {
      const result = await checkWhitelist();
      return {
        isVerified: result.isWhitelisted,
        canClaim: result.isWhitelisted,
        whitelistedAddress: result.isWhitelisted ? address : undefined
      };
    } catch (error) {
      console.error('Error checking identity verification:', error);
      return { isVerified: false, canClaim: false };
    }
  }, [address, checkWhitelist]);

  // Check claim eligibility using the official SDK
  const checkClaimEligibility = useCallback(async () => {
    if (!address || !publicClient || !walletClient) {
      return { canClaim: false, amount: '0' };
    }

    try {
      // First verify identity
      if (!isWhitelisted) {
        return { canClaim: false, amount: '0' };
      }

      // Initialize ClaimSDK with Wagmi integration
      const claimSDK = new ClaimSDK({
        account: address,
        publicClient,
        walletClient,
        env: 'production',
      });

      // Check entitlement
      const entitlement = await claimSDK.checkEntitlement(publicClient);
      const canClaim = entitlement > 0n;
      
      return {
        canClaim,
        amount: entitlement.toString()
      };
    } catch (error) {
      console.error('Error checking claim eligibility:', error);
      return { canClaim: false, amount: '0' };
    }
  }, [address, publicClient, walletClient, isWhitelisted]);

  // Claim UBI using the official SDK
  const claimGoodDollar = useCallback(async (): Promise<ClaimResult> => {
    if (!address || !publicClient || !walletClient) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      // Verify identity first
      if (!isWhitelisted) {
        toast({
          title: "Identity Verification Required",
          description: "Please complete identity verification before claiming.",
          variant: "destructive"
        });
        return { success: false, error: 'Identity not verified' };
      }

      // Initialize ClaimSDK
      const claimSDK = new ClaimSDK({
        account: address,
        publicClient,
        walletClient,
        env: 'production',
      });

      // Check eligibility
      const eligibility = await checkClaimEligibility();
      if (!eligibility.canClaim) {
        return { success: false, error: 'Not eligible to claim' };
      }

      // Perform the claim
      const receipt = await claimSDK.claim();
      
      toast({
        title: "Claim Successful!",
        description: `Successfully claimed G$ tokens. Transaction: ${receipt.transactionHash}`,
      });

      return { 
        success: true, 
        transactionHash: receipt.transactionHash,
        amount: eligibility.amount
      };

    } catch (error: any) {
      console.error('Error claiming GoodDollar:', error);
      
      const errorMessage = error.message || 'Failed to claim G$ tokens';
      
      toast({
        title: "Claim Failed",
        description: errorMessage,
        variant: "destructive",
      });

      return { success: false, error: errorMessage };
    }
  }, [address, publicClient, walletClient, isWhitelisted, checkClaimEligibility]);

  return {
    // Identity verification
    isWhitelisted,
    checkIdentityVerification,
    identityLoading,
    
    // Claim functionality
    checkClaimEligibility,
    claimGoodDollar,
    
    // Utilities
    address,
    isConnected: !!address
  };
};
