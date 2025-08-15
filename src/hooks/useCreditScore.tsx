import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CreditScoreData {
  score: number;
  wallet_address: string;
  last_updated: string;
}

interface UseCreditScoreResult {
  score: number | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  lastUpdated: string | null;
}

const CACHE_KEY_PREFIX = 'credit_score_';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export const useCreditScore = (walletAddress?: string): UseCreditScoreResult => {
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const getCacheKey = useCallback(() => {
    return walletAddress ? `${CACHE_KEY_PREFIX}${walletAddress.toLowerCase()}` : null;
  }, [walletAddress]);

  const getCachedScore = useCallback(() => {
    const cacheKey = getCacheKey();
    if (!cacheKey) return null;

    try {
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return null;

      const data = JSON.parse(cached);
      const now = Date.now();
      
      if (now - data.timestamp > CACHE_DURATION) {
        localStorage.removeItem(cacheKey);
        return null;
      }

      return data.score_data;
    } catch (error) {
      console.error('Error reading credit score cache:', error);
      return null;
    }
  }, [getCacheKey]);

  const setCachedScore = useCallback((scoreData: CreditScoreData) => {
    const cacheKey = getCacheKey();
    if (!cacheKey) return;

    try {
      const cacheData = {
        score_data: scoreData,
        timestamp: Date.now()
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error caching credit score:', error);
    }
  }, [getCacheKey]);

  const fetchCreditScore = useCallback(async (skipCache = false): Promise<void> => {
    if (!walletAddress) {
      setScore(null);
      setError('Wallet address not available');
      return;
    }

    // Check cache first unless explicitly skipping
    if (!skipCache) {
      const cached = getCachedScore();
      if (cached) {
        console.log('Using cached credit score for', walletAddress);
        setScore(cached.score);
        setLastUpdated(cached.last_updated);
        setError(null);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Fetching credit score for wallet:', walletAddress);
      
      const { data, error: functionError } = await supabase.functions.invoke('get-credit-score', {
        body: { wallet_address: walletAddress }
      });

      if (functionError) {
        console.error('Credit score function error:', functionError);
        setError(functionError.message || 'Failed to fetch credit score');
        setScore(null);
        return;
      }

      if (data.error) {
        console.error('Credit score API error:', data.error);
        if (data.error.includes('No credit score found')) {
          setScore(1); // Default minimum score for wallets with no history
          setError(null);
        } else {
          setError(data.error);
          setScore(null);
        }
        return;
      }

      const scoreData: CreditScoreData = {
        score: data.score,
        wallet_address: data.wallet_address,
        last_updated: data.last_updated
      };

      // Cache the result
      setCachedScore(scoreData);
      
      setScore(scoreData.score);
      setLastUpdated(scoreData.last_updated);
      setError(null);
      
      console.log('Credit score fetched successfully:', scoreData.score);
    } catch (error) {
      console.error('Error fetching credit score:', error);
      setError('Network error while fetching credit score');
      setScore(null);
    } finally {
      setLoading(false);
    }
  }, [walletAddress, getCachedScore, setCachedScore]);

  const refresh = useCallback(async (): Promise<void> => {
    await fetchCreditScore(true); // Skip cache when refreshing
  }, [fetchCreditScore]);

  // Auto-fetch on wallet address change
  useEffect(() => {
    if (walletAddress) {
      fetchCreditScore();
    } else {
      setScore(null);
      setError(null);
      setLastUpdated(null);
    }
  }, [walletAddress, fetchCreditScore]);

  return {
    score,
    loading,
    error,
    refresh,
    lastUpdated
  };
};