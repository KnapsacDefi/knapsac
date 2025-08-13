import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { lendingPoolCache } from '@/services/lendingPoolCache';

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
  
  const fetchBasicPoolInfo = useCallback(async () => {
    if (!poolId) {
      setError('Pool ID is required');
      setIsLoading(false);
      return;
    }

    try {
      setError(null);

      // Try cache first for immediate display
      const cachedPool = lendingPoolCache.get(poolId);
      if (cachedPool) {
        setBasicPool(cachedPool);
        setLendingPool(cachedPool);
        setIsLoading(false);
        setIsFundingLoading(false);
        return;
      }

      // Fetch basic info quickly without complex joins
      const { data: basicData, error: basicError } = await supabase.functions.invoke('get-lending-pool-basic', {
        body: { id: poolId }
      });

      if (basicError) throw basicError;
      if (!basicData.pool) throw new Error('Lending pool not found');

      setBasicPool(basicData.pool);
      setIsLoading(false);

      // Now fetch full data with funding info in parallel
      fetchFullPoolDetail(basicData.pool);
      
    } catch (err: any) {
      console.error('Error fetching basic pool info:', err);
      setError(err.message || 'Failed to fetch pool details');
      setIsLoading(false);
    }
  }, [poolId]);

  const fetchFullPoolDetail = useCallback(async (basicPoolData?: BasicLendingPool) => {
    if (!poolId) return;

    try {
      const { data, error: fetchError } = await supabase.functions.invoke('get-lending-pool-detail', {
        body: { id: poolId }
      });

      if (fetchError) throw fetchError;
      if (!data.pool) throw new Error('Lending pool not found');

      const fullPoolData = data.pool;
      setLendingPool(fullPoolData);
      
      // Cache the full result
      lendingPoolCache.set(poolId, fullPoolData);
      
    } catch (err: any) {
      console.error('Error fetching full pool detail:', err);
      // Don't overwrite basic info if we have it
      if (!basicPoolData && !basicPool) {
        setError(err.message || 'Failed to fetch funding details');
      }
    } finally {
      setIsFundingLoading(false);
    }
  }, [poolId, basicPool]);

  useEffect(() => {
    if (poolId) {
      fetchBasicPoolInfo();
    }
  }, [fetchBasicPoolInfo, poolId]);

  const refreshPool = useCallback(() => {
    if (poolId) {
      lendingPoolCache.invalidate(poolId);
      setIsLoading(true);
      setIsFundingLoading(true);
      fetchBasicPoolInfo();
    }
  }, [poolId, fetchBasicPoolInfo]);

  return {
    lendingPool,
    basicPool,
    isLoading,
    isFundingLoading,
    error,
    refreshPool
  };
};