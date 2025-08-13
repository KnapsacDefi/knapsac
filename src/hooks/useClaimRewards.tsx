import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePortfolio } from './usePortfolio';

interface UseClaimRewardsProps {
  portfolioEntry?: any;
  onSuccess?: () => void;
}

export const useClaimRewards = ({
  portfolioEntry,
  onSuccess
}: UseClaimRewardsProps) => {
  const { toast } = useToast();
  const { refreshPortfolio } = usePortfolio();
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'form' | 'confirming'>('form');

  const claimRewards = useCallback(async () => {
    if (!portfolioEntry) {
      toast({
        title: "Error",
        description: "Portfolio entry not found",
        variant: "destructive"
      });
      return;
    }

    if (!portfolioEntry.is_eligible) {
      toast({
        title: "Not Eligible",
        description: "This position is not yet eligible for claiming",
        variant: "destructive"
      });
      return;
    }

    if (portfolioEntry.payment_status === 'completed') {
      toast({
        title: "Already Claimed",
        description: "Rewards have already been claimed",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsProcessing(true);
      setStep('confirming');

      console.log('🎯 Starting claim process for portfolio entry:', portfolioEntry.id);

      // Call the claim rewards edge function
      const { data, error } = await supabase.functions.invoke('claim-rewards', {
        body: {
          portfolio_id: portfolioEntry.id
        }
      });

      if (error) {
        throw error;
      }

      console.log('✅ Claim successful:', data);

      toast({
        title: "Success",
        description: "Rewards claimed successfully!"
      });

      // Refresh portfolio data
      await refreshPortfolio();
      
      onSuccess?.();

    } catch (error) {
      console.error('Claim error:', error);
      toast({
        title: "Claim Failed",
        description: error.message || "Failed to claim rewards",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setStep('form');
    }
  }, [portfolioEntry, toast, refreshPortfolio, onSuccess]);

  return {
    claimRewards,
    isProcessing,
    step
  };
};