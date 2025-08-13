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

export const useLendingPoolDetail = (poolId: string | undefined) => {
  const [lendingPool, setLendingPool] = useState<LendingPool | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchLendingPoolDetail = useCallback(async (useCache = true, isBackgroundRefresh = false) => {
    if (!poolId) {
      setError('Pool ID is required');
      setIsLoading(false);
      return;
    }

    try {
      if (!isBackgroundRefresh) {
        setIsLoading(true);
      }
      setError(null);

      // Try to get from cache first
      if (useCache) {
        const cachedPool = lendingPoolCache.get(poolId);
        if (cachedPool) {
          setLendingPool(cachedPool);
          if (!isBackgroundRefresh) {
            setIsLoading(false);
          }
          
          // Still fetch fresh data in background
          if (!isBackgroundRefresh) {
            setTimeout(() => fetchLendingPoolDetail(false, true), 100);
          }
          return;
        }
      }

      const { data, error: fetchError } = await supabase.functions.invoke('get-lending-pool-detail', {
        body: { 
          id: poolId,
          timestamp: useCache ? undefined : Date.now() 
        }
      });

      if (fetchError) {
        throw fetchError;
      }

      if (!data.pool) {
        throw new Error('Lending pool not found');
      }

      const poolData = data.pool;
      setLendingPool(poolData);
      
      // Cache the result
      lendingPoolCache.set(poolId, poolData);
      
    } catch (err: any) {
      console.error('Error fetching lending pool detail:', err);
      const errorMessage = err.message || 'Failed to fetch lending pool details';
      setError(errorMessage);
      
      // If it's a background refresh and we have cached data, don't clear it
      if (!isBackgroundRefresh) {
        setLendingPool(null);
      }
    } finally {
      if (!isBackgroundRefresh) {
        setIsLoading(false);
      }
    }
  }, [poolId]);

  useEffect(() => {
    if (poolId) {
      fetchLendingPoolDetail();
    }
  }, [fetchLendingPoolDetail, poolId]);

  const refreshPool = useCallback(() => {
    if (poolId) {
      lendingPoolCache.invalidate(poolId);
      fetchLendingPoolDetail(false);
    }
  }, [poolId, fetchLendingPoolDetail]);

  return {
    lendingPool,
    isLoading,
    error,
    refreshPool
  };
};