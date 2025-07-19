
import { useCallback, useState } from 'react';
import { ClaimSDK, IdentitySDK } from '@goodsdks/citizen-sdk';
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
  const [identityLoading, setIdentityLoading] = useState(false);

  // Initialize IdentitySDK manually like the working version
  const initializeIdentitySDK = useCallback(async () => {
    if (!address || !publicClient || !walletClient) return null;

    try {
      const identitySDK = new IdentitySDK(publicClient, walletClient, 'production');
      return identitySDK;
    } catch (error) {
      console.error('Failed to initialize GoodDollar IdentitySDK:', error);
      return null;
    }
  }, [address, publicClient, walletClient]);

  // Check identity verification using IdentitySDK
  const checkIdentityVerification = useCallback(async () => {
    if (!address) {
      return { isVerified: false, canClaim: false };
    }

    setIdentityLoading(true);
    try {
      const identitySDK = await initializeIdentitySDK();
      if (!identitySDK) {
        setIdentityLoading(false);
        return { isVerified: false, canClaim: false };
      }

      // Use IdentitySDK to check if user is whitelisted
      const result = await identitySDK.getWhitelistedRoot(address);
      setIdentityLoading(false);
      
      return {
        isVerified: result.isWhitelisted,
        canClaim: result.isWhitelisted,
        whitelistedAddress: result.isWhitelisted ? address : undefined
      };
    } catch (error) {
      console.error('Error checking identity verification:', error);
      setIdentityLoading(false);
      return { isVerified: false, canClaim: false };
    }
  }, [address, initializeIdentitySDK]);

  // Check claim eligibility using ClaimSDK
  const checkClaimEligibility = useCallback(async () => {
    if (!address || !publicClient || !walletClient) {
      return { canClaim: false, amount: '0' };
    }

    try {
      // First verify identity
      const identityResult = await checkIdentityVerification();
      if (!identityResult.isVerified) {
        return { canClaim: false, amount: '0' };
      }

      // Initialize ClaimSDK with IdentitySDK
      const identitySDK = await initializeIdentitySDK();
      if (!identitySDK) {
        return { canClaim: false, amount: '0' };
      }

      const claimSDK = new ClaimSDK({
        account: address,
        publicClient,
        walletClient,
        identitySDK,
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
  }, [address, publicClient, walletClient, checkIdentityVerification, initializeIdentitySDK]);

  // Claim UBI using ClaimSDK
  const claimGoodDollar = useCallback(async (): Promise<ClaimResult> => {
    if (!address || !publicClient || !walletClient) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      // First verify identity
      const identityResult = await checkIdentityVerification();
      if (!identityResult.isVerified) {
        toast({
          title: "Identity Verification Required",
          description: "Please complete identity verification before claiming.",
          variant: "destructive"
        });
        return { success: false, error: 'Identity not verified' };
      }

      // Initialize IdentitySDK and ClaimSDK
      const identitySDK = await initializeIdentitySDK();
      if (!identitySDK) {
        return { success: false, error: 'Failed to initialize IdentitySDK' };
      }

      const claimSDK = new ClaimSDK({
        account: address,
        publicClient,
        walletClient,
        identitySDK,
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
  }, [address, publicClient, walletClient, checkIdentityVerification, initializeIdentitySDK, checkClaimEligibility]);

  return {
    // Identity verification
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
