import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { portfolioCache } from '@/services/portfolioCache';

interface PortfolioEntry {
  id: string;
  lending_pool_id: string;
  user_id: string;
  lend_amount: number;
  lend_token: string;
  chain: string;
  lend_period: number;
  lend_transaction_hash?: string;
  recipient_address: string;
  claim_date?: string;
  claim_transaction_hash?: string;
  claim_amount?: number;
  payment_token?: string;
  claim_currency?: string;
  payment_status: string;
  created_at: string;
  updated_at: string;
  lending_pool: {
    target_amount: number;
    monthly_interest: number;
    closing_date: string;
    min_lend_period: number;
    max_lend_period: number;
  };
  is_eligible: boolean;
  claimable_amount: number;
  eligible_date: string;
}

export const usePortfolio = () => {
  const [portfolio, setPortfolio] = useState<PortfolioEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const { authenticated, user } = useAuth();

  const fetchPortfolio = useCallback(async (useCache = true, isBackgroundRefresh = false) => {
    if (!authenticated || !user?.id) {
      setPortfolio([]);
      setIsLoading(false);
      return;
    }

    // Load cached data immediately if available
    if (useCache && !isBackgroundRefresh) {
      const cachedData = portfolioCache.get();
      if (cachedData) {
        // Apply client-side calculations to cached data
        const portfolioWithCalculations = cachedData.map(entry => {
          const calculations = portfolioCache.calculateFields(entry);
          return { ...entry, ...calculations };
        });
        setPortfolio(portfolioWithCalculations);
        setLastUpdated(portfolioCache.getLastUpdated());
        setIsLoading(false);
        
        // Fetch fresh data in background
        setTimeout(() => fetchPortfolio(false, true), 100);
        return;
      }
    }

    try {
      if (!isBackgroundRefresh) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);

      // Fetch basic portfolio data without server-side calculations
      const { data, error: fetchError } = await supabase.functions.invoke('get-portfolio-basic', {
        body: { userId: user.id }
      });

      if (fetchError) {
        throw fetchError;
      }

      const rawPortfolio = data.portfolio || [];
      
      // Apply client-side calculations
      const portfolioWithCalculations = rawPortfolio.map(entry => {
        const calculations = portfolioCache.calculateFields(entry);
        return { ...entry, ...calculations };
      });

      setPortfolio(portfolioWithCalculations);
      
      // Cache the raw data (without calculations to keep it fresh)
      if (rawPortfolio.length > 0) {
        portfolioCache.set(rawPortfolio);
        setLastUpdated(portfolioCache.getLastUpdated());
      }
      
    } catch (err: any) {
      console.error('Error fetching portfolio:', err);
      setError(err.message || 'Failed to fetch portfolio');
      
      // If background refresh fails, still use cached data if available
      if (isBackgroundRefresh) {
        const cachedData = portfolioCache.get();
        if (cachedData) {
          const portfolioWithCalculations = cachedData.map(entry => {
            const calculations = portfolioCache.calculateFields(entry);
            return { ...entry, ...calculations };
          });
          setPortfolio(portfolioWithCalculations);
        }
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [authenticated, user?.id]);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  const refreshPortfolio = useCallback(() => {
    portfolioCache.clear();
    fetchPortfolio(false);
  }, [fetchPortfolio]);

  const createPortfolioEntry = useCallback(async (entryData: {
    lending_pool_id: string;
    lend_amount: number;
    lend_token: string;
    chain: string;
    lend_period: number;
    lend_transaction_hash?: string;
    recipient_address: string;
  }) => {
    try {
      const { data, error } = await supabase.functions.invoke('create-portfolio-entry', {
        body: entryData
      });

      if (error) {
        throw error;
      }

      // Refresh portfolio after creating new entry
      await fetchPortfolio();

      return data.portfolio;
    } catch (err: any) {
      console.error('Error creating portfolio entry:', err);
      throw err;
    }
  }, [fetchPortfolio]);

  return {
    portfolio,
    isLoading,
    isRefreshing,
    error,
    lastUpdated,
    refreshPortfolio,
    createPortfolioEntry
  };
};