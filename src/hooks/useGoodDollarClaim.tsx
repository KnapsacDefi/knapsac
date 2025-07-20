
import { useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useGoodDollarWagmi } from './useGoodDollarWagmi';

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
    checkClaimEligibility,
    claimGoodDollar: wagmiClaim,
    checkIdentityVerification
  } = useGoodDollarWagmi();
  

  const claimGoodDollar = async (): Promise<ClaimResult> => {
    if (!authenticated || !wallets[0] || claiming) {
      return { success: false, error: 'Not authenticated or already claiming' };
    }

    setClaiming(true);

    try {
      console.log('🎯 Starting GoodDollar claim process...');
      
      // Use the simplified Wagmi-integrated claim function
      const result = await wagmiClaim();
      console.log('✅ Claim result:', result);
      
      if (result.success && result.transactionHash) {
        // Record the claim in our database
        try {
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
        } catch (dbError) {
          console.error('Error recording claim in database:', dbError);
          // Don't fail the claim if database recording fails
        }
      }

      setClaiming(false);
      return result;

    } catch (error: any) {
      console.error('❌ Error claiming GoodDollar:', error);
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
    checkIdentityVerification,
    claiming
  };
};
