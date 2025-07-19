
import { useState, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { toast } from '@/hooks/use-toast';
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
  const [checking, setChecking] = useState(false);

  // Initialize IdentitySDK
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

  // Initialize ClaimSDK
  const initializeClaimSDK = useCallback(async () => {
    if (!address || !publicClient || !walletClient) return null;

    try {
      const identitySDK = await initializeIdentitySDK();
      if (!identitySDK) return null;

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
  }, [address, publicClient, walletClient, initializeIdentitySDK]);

  // Check if user is verified using IdentitySDK
  const checkIdentityVerification = useCallback(async (): Promise<{ isVerified: boolean; canClaim: boolean }> => {
    if (!authenticated || !address) {
      return { isVerified: false, canClaim: false };
    }

    try {
      const identitySDK = await initializeIdentitySDK();
      if (!identitySDK) {
        return { isVerified: false, canClaim: false };
      }

      // Use IdentitySDK to check if user is whitelisted
      const result = await identitySDK.getWhitelistedRoot(address);
      
      return {
        isVerified: result.isWhitelisted,
        canClaim: result.isWhitelisted
      };
    } catch (error) {
      console.error('Error checking identity verification:', error);
      return { isVerified: false, canClaim: false };
    }
  }, [authenticated, address, initializeIdentitySDK]);

  // Check claim eligibility using ClaimSDK
  const checkClaimEligibility = useCallback(async (): Promise<{ canClaim: boolean; amount: string }> => {
    if (!authenticated || !address) {
      return { canClaim: false, amount: '0' };
    }

    setChecking(true);
    
    try {
      // First check if identity is verified
      const identityResult = await checkIdentityVerification();
      
      if (!identityResult.isVerified) {
        setChecking(false);
        return {
          canClaim: false,
          amount: '0'
        };
      }

      const claimSDK = await initializeClaimSDK();
      if (!claimSDK || !publicClient) {
        setChecking(false);
        return { canClaim: false, amount: '0' };
      }

      // Use ClaimSDK to check entitlement
      const entitlement = await claimSDK.checkEntitlement(publicClient);
      const canClaim = entitlement > 0n;
      
      setChecking(false);
      return {
        canClaim,
        amount: entitlement.toString()
      };
    } catch (error) {
      console.error('Error in checkClaimEligibility:', error);
      setChecking(false);
      return { canClaim: false, amount: '0' };
    }
  }, [authenticated, address, checkIdentityVerification, initializeClaimSDK, publicClient]);

  // Claim UBI using ClaimSDK
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

      // Initialize ClaimSDK
      const claimSDK = await initializeClaimSDK();
      if (!claimSDK) {
        setClaiming(false);
        return { success: false, error: 'Failed to initialize ClaimSDK' };
      }

      // Check eligibility using ClaimSDK
      const eligibility = await checkClaimEligibility();
      if (!eligibility.canClaim) {
        setClaiming(false);
        return { success: false, error: 'Not eligible to claim' };
      }

      // Use ClaimSDK to claim UBI
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
  }, [authenticated, address, claiming, checkIdentityVerification, initializeClaimSDK, checkClaimEligibility]);

  return {
    claimGoodDollar,
    checkClaimEligibility,
    checkIdentityVerification,
    claiming,
    checking,
    initializeClaimSDK,
    initializeIdentitySDK
  };
};
