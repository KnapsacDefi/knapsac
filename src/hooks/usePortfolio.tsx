import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
  const [error, setError] = useState<string | null>(null);
  const { authenticated } = useAuth();

  const fetchPortfolio = useCallback(async () => {
    if (!authenticated) {
      setPortfolio([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase.functions.invoke('get-portfolio');

      if (fetchError) {
        throw fetchError;
      }

      setPortfolio(data.portfolio || []);
    } catch (err: any) {
      console.error('Error fetching portfolio:', err);
      setError(err.message || 'Failed to fetch portfolio');
    } finally {
      setIsLoading(false);
    }
  }, [authenticated]);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  const refreshPortfolio = useCallback(() => {
    fetchPortfolio();
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
    error,
    refreshPortfolio,
    createPortfolioEntry
  };
};