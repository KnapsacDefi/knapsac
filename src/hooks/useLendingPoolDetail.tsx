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

interface BasicLendingPool {
  id: string;
  target_amount: number;
  monthly_interest: number;
  closing_date: string;
  min_lend_period: number;
  max_lend_period: number;
  status: string;
}

export const useLendingPoolDetail = (poolId: string | undefined) => {
  const [lendingPool, setLendingPool] = useState<LendingPool | null>(null);
  const [basicPool, setBasicPool] = useState<BasicLendingPool | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFundingLoading, setIsFundingLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchPoolDetail = useCallback(async () => {
    if (!poolId) {
      setError('Pool ID is required');
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      setIsLoading(true);
      setIsFundingLoading(true);

      // Fetch full pool detail directly without caching
      const { data, error: fetchError } = await supabase.functions.invoke('get-lending-pool-detail', {
        body: { id: poolId }
      });

      if (fetchError) throw fetchError;
      if (!data.pool) throw new Error('Lending pool not found');

      const poolData = data.pool;
      setBasicPool(poolData);
      setLendingPool(poolData);
      
    } catch (err: any) {
      console.error('Error fetching pool detail:', err);
      setError(err.message || 'Failed to fetch pool details');
    } finally {
      setIsLoading(false);
      setIsFundingLoading(false);
    }
  }, [poolId]);


  useEffect(() => {
    if (poolId) {
      fetchPoolDetail();
    }
  }, [fetchPoolDetail, poolId]);

  const refreshPool = useCallback(() => {
    if (poolId) {
      fetchPoolDetail();
    }
  }, [poolId, fetchPoolDetail]);

  return {
    lendingPool,
    basicPool,
    isLoading,
    isFundingLoading,
    error,
    refreshPool
  };
};