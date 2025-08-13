import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const [lendingPools, setLendingPools] = useState<LendingPool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Check if we're on a route that should force fresh data (only confirmation and token selection)
  const shouldForceRefresh = location.pathname.includes('/lending/') ||
                            location.pathname.includes('/lending-confirmation');

  const fetchLendingPools = useCallback(async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      setError(null);

      // Add timestamp to force fresh data when needed
      const url = forceRefresh || shouldForceRefresh ? 
        'get-lending-pools' : 
        'get-lending-pools';

      const { data, error: fetchError } = await supabase.functions.invoke(url, {
        body: shouldForceRefresh ? { timestamp: Date.now() } : undefined
      });

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
  }, [shouldForceRefresh]);

  useEffect(() => {
    fetchLendingPools(shouldForceRefresh);
  }, [fetchLendingPools, shouldForceRefresh]);

  const refreshPools = useCallback(() => {
    fetchLendingPools(true);
  }, [fetchLendingPools]);

  return {
    lendingPools,
    isLoading,
    error,
    refreshPools
  };
};