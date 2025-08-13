import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LendingPool {
  id: string;
  startup_id?: string;
  user_id: string;
  target_amount: number;
  monthly_interest: number;
  closing_date: string;
  min_lend_period: number;
  max_lend_period: number;
  recipient_address: string;
  status: string;
  created_at: string;
  updated_at: string;
  total_lent: number;
  funding_progress: number;
}

export const useLendingPools = () => {
  const [lendingPools, setLendingPools] = useState<LendingPool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLendingPools = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase.functions.invoke('get-lending-pools');

      if (fetchError) {
        throw fetchError;
      }

      setLendingPools(data.pools || []);
    } catch (err: any) {
      console.error('Error fetching lending pools:', err);
      setError(err.message || 'Failed to fetch lending pools');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLendingPools();
  }, [fetchLendingPools]);

  const refreshPools = useCallback(() => {
    fetchLendingPools();
  }, [fetchLendingPools]);

  return {
    lendingPools,
    isLoading,
    error,
    refreshPools
  };
};