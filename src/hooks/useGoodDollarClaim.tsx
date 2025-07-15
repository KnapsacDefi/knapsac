import { useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNetworkManager } from './useNetworkManager';
import { useGoodDollarIdentity } from './useGoodDollarIdentity';

interface ClaimResult {
  success: boolean;
  transactionHash?: string;
  amount?: string;
  error?: string;
}

// GoodDollar UBI contract on Celo mainnet
const UBI_SCHEME_CONTRACT = '0xD7aC544F8A570C4d8764c3AAbCF6870CBD960D0D';

export const useGoodDollarClaim = () => {
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const [claiming, setClaiming] = useState(false);
  const { checkIdentityVerification } = useGoodDollarIdentity();
  
  // Use network manager to ensure we're on Celo
  useNetworkManager('celo', true);

  const checkClaimEligibility = async (): Promise<{ canClaim: boolean; amount: string }> => {
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

      // Check eligibility using GoodDollar contracts via edge function
      const { data, error } = await supabase.functions.invoke('gooddollar-claim', {
        body: { 
          action: 'checkEligibility',
          walletAddress: wallets[0].address 
        }
      });

      if (error) {
        console.error('Error checking claim eligibility:', error);
        return { canClaim: false, amount: '0' };
      }

      return {
        canClaim: data.canClaim && identityResult.canClaim,
        amount: data.amount || '0'
      };
    } catch (error) {
      console.error('Error in checkClaimEligibility:', error);
      return { canClaim: false, amount: '0' };
    }
  };

  const claimGoodDollar = async (): Promise<ClaimResult> => {
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
      
      // Check if user is eligible for claiming
      const eligibility = await checkClaimEligibility();
      if (!eligibility.canClaim) {
        setClaiming(false);
        return { success: false, error: 'Not eligible to claim' };
      }

      // Use GoodDollar's UBI claiming contract
      const txData = {
        to: UBI_SCHEME_CONTRACT,
        data: '0x4e71d92d', // claim() function selector
        value: '0x0'
      };

      // Get the Ethereum provider and send transaction
      const provider = await wallets[0].getEthereumProvider();
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: wallets[0].address,
          to: txData.to,
          data: txData.data,
          value: txData.value
        }]
      });

      // Record the claim in our database
      const { error: dbError } = await supabase.functions.invoke('gooddollar-claim', {
        body: {
          action: 'recordClaim',
          walletAddress: wallets[0].address,
          transactionHash: txHash,
          amount: eligibility.amount
        }
      });

      if (dbError) {
        console.error('Error recording claim:', dbError);
      }

      toast({
        title: "Claim Successful!",
        description: `Successfully claimed G$ tokens. Transaction: ${txHash}`,
      });

      setClaiming(false);
      return { 
        success: true, 
        transactionHash: txHash,
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
  };

  return {
    claimGoodDollar,
    checkClaimEligibility,
    claiming
  };
};