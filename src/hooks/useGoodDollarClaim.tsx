import { useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { createPublicClient, http, parseAbi } from 'viem';
import { celo } from 'viem/chains';

interface ClaimResult {
  success: boolean;
  transactionHash?: string;
  amount?: string;
  error?: string;
}

// GoodDollar contract addresses on Celo
const GOODDOLLAR_CONTRACT = '0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A';
const UBI_SCHEME_CONTRACT = '0xAACbaaB8571cbECEB46ba85B5981efDB8928545e';

const claimAbi = parseAbi([
  'function claim() external returns (uint256)',
  'function checkEntitlement() external view returns (uint256)',
  'function isClaimer(address) external view returns (bool)'
]);

export const useGoodDollarClaim = () => {
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const [claiming, setClaiming] = useState(false);

  const client = createPublicClient({
    chain: celo,
    transport: http()
  });

  const checkClaimEligibility = async (): Promise<{ canClaim: boolean; amount: string }> => {
    if (!authenticated || !wallets[0]) {
      return { canClaim: false, amount: '0' };
    }

    try {
      // Check if user is a claimer in the UBI scheme
      const isClaimer = await client.readContract({
        address: UBI_SCHEME_CONTRACT,
        abi: claimAbi,
        functionName: 'isClaimer',
        args: [wallets[0].address as `0x${string}`]
      });

      if (!isClaimer) {
        return { canClaim: false, amount: '0' };
      }

      // Check entitlement amount
      const entitlement = await client.readContract({
        address: UBI_SCHEME_CONTRACT,
        abi: claimAbi,
        functionName: 'checkEntitlement'
      });

      return {
        canClaim: Number(entitlement) > 0,
        amount: entitlement.toString()
      };

    } catch (error) {
      console.error('Error checking claim eligibility:', error);
      return { canClaim: false, amount: '0' };
    }
  };

  const claimGoodDollar = async (): Promise<ClaimResult> => {
    if (!authenticated || !wallets[0] || claiming) {
      return { success: false, error: 'Not authenticated or already claiming' };
    }

    setClaiming(true);

    try {
      // First switch to Celo network
      await wallets[0].switchChain(celo.id);

      // Check if user can claim
      const { canClaim, amount } = await checkClaimEligibility();
      
      if (!canClaim) {
        setClaiming(false);
        return { success: false, error: 'No G$ tokens available to claim' };
      }

      // Get the embedded wallet provider
      const provider = await wallets[0].getEthereumProvider();
      
      // Prepare transaction data
      const txData = {
        to: UBI_SCHEME_CONTRACT,
        data: '0x4e71d92d', // claim() function selector
        value: '0x0',
        from: wallets[0].address
      };

      // Sign and send transaction using provider
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [txData]
      });

      // Record successful claim in database
      await supabase.functions.invoke('gooddollar-claim', {
        body: {
          walletAddress: wallets[0].address,
          action: 'claim',
          transactionHash: txHash,
          amount: amount
        }
      });

      toast({
        title: "Claim Successful!",
        description: `Successfully claimed G$ tokens. Transaction: ${txHash}`,
      });

      setClaiming(false);
      return { 
        success: true, 
        transactionHash: txHash as string,
        amount: amount
      };

    } catch (error: any) {
      console.error('Claim failed:', error);
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