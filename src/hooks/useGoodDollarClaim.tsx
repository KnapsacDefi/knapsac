
import { useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNetworkManager } from './useNetworkManager';
import { useGoodDollarSDK } from './useGoodDollarSDK';

interface ClaimResult {
  success: boolean;
  transactionHash?: string;
  amount?: string;
  error?: string;
}

export const useGoodDollarClaim = () => {
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const [claiming, setClaiming] = useState(false);
  const { 
    claimGoodDollar: sdkClaim, 
    checkClaimEligibility: sdkCheckEligibility,
    checkIdentityVerification: sdkCheckIdentity
  } = useGoodDollarSDK();
  
  // Use network manager to ensure we're on Celo
  useNetworkManager('celo', true);

  const checkClaimEligibility = async (): Promise<{ canClaim: boolean; amount: string }> => {
    if (!authenticated || !wallets[0]) {
      return { canClaim: false, amount: '0' };
    }

    try {
      // Use the SDK's eligibility check which includes identity verification
      return await sdkCheckEligibility();
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
      // Use the SDK's claim function which handles all verification internally
      const result = await sdkClaim();
      
      if (result.success && result.transactionHash) {
        // Record the claim in our database
        const { error: dbError } = await supabase.functions.invoke('gooddollar-claim', {
          body: {
            action: 'recordClaim',
            walletAddress: wallets[0].address,
            transactionHash: result.transactionHash,
            amount: result.amount || '0'
          }
        });

        if (dbError) {
          console.error('Error recording claim:', dbError);
        }
      }

      setClaiming(false);
      return result;

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
