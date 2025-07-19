
import { useState, useCallback } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { createPublicClient, createWalletClient, custom, http } from 'viem';
import { celo } from 'viem/chains';
import { CitizenSDK } from '@goodsdks/citizen-sdk';
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
  const { wallets } = useWallets();
  const [claiming, setClaiming] = useState(false);
  const { checkIdentityVerification } = useGoodDollarIdentity();

  // Initialize the CitizenSDK
  const initializeSDK = useCallback(async () => {
    if (!wallets[0]) return null;

    try {
      // Create viem clients
      const publicClient = createPublicClient({
        chain: celo,
        transport: http('https://forno.celo.org'),
      });

      const provider = await wallets[0].getEthereumProvider();
      const walletClient = createWalletClient({
        chain: celo,
        transport: custom(provider),
        account: wallets[0].address as `0x${string}`,
      });

      // Initialize the GoodDollar CitizenSDK
      const sdk = new CitizenSDK({
        publicClient,
        walletClient,
        network: 'celo', // or 'fuse' based on your needs
      });

      return sdk;
    } catch (error) {
      console.error('Failed to initialize GoodDollar SDK:', error);
      return null;
    }
  }, [wallets]);

  const checkClaimEligibility = useCallback(async (): Promise<{ canClaim: boolean; amount: string }> => {
    if (!authenticated || !wallets[0]) {
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

      // Use SDK to check eligibility
      const eligibility = await sdk.checkClaimEligibility(wallets[0].address as `0x${string}`);
      
      return {
        canClaim: eligibility.canClaim && identityResult.canClaim,
        amount: eligibility.amount?.toString() || '0'
      };
    } catch (error) {
      console.error('Error in checkClaimEligibility:', error);
      return { canClaim: false, amount: '0' };
    }
  }, [authenticated, wallets, checkIdentityVerification, initializeSDK]);

  const claimGoodDollar = useCallback(async (): Promise<SDKClaimResult> => {
    if (!authenticated || !wallets[0] || claiming) {
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

      // Switch to Celo network if needed
      await wallets[0].switchChain(42220); // Celo mainnet
      
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

      // Use SDK to claim
      const claimResult = await sdk.claim();

      if (claimResult.success && claimResult.transactionHash) {
        toast({
          title: "Claim Successful!",
          description: `Successfully claimed G$ tokens. Transaction: ${claimResult.transactionHash}`,
        });

        setClaiming(false);
        return { 
          success: true, 
          transactionHash: claimResult.transactionHash,
          amount: eligibility.amount
        };
      } else {
        throw new Error(claimResult.error || 'Claim failed');
      }

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
  }, [authenticated, wallets, claiming, checkIdentityVerification, initializeSDK, checkClaimEligibility]);

  return {
    claimGoodDollar,
    checkClaimEligibility,
    claiming,
    initializeSDK
  };
};
