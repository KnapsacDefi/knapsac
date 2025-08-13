
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SUPPORTED_TOKENS, type SupportedChain } from '@/constants/tokens';

interface TokenBalance {
  symbol: string;
  chain: SupportedChain;
  balance: string;
  loading: boolean;
  error: string | null;
}

interface UseTokenBalancesParams {
  walletAddress: string | null;
  enabled?: boolean;
}

interface CachedBalance {
  balance: string;
  timestamp: number;
  error?: string | null;
}

const CACHE_DURATION = 3 * 60 * 1000; // 3 minutes
const CACHE_KEY_PREFIX = 'token_balances_';

export const useTokenBalances = ({ walletAddress, enabled = true }: UseTokenBalancesParams) => {
  const [tokenBalances, setTokenBalances] = useState<Record<string, TokenBalance>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const getCacheKey = (walletAddress: string) => `${CACHE_KEY_PREFIX}${walletAddress}`;

  const loadCachedBalances = useCallback((walletAddress: string) => {
    try {
      const cached = localStorage.getItem(getCacheKey(walletAddress));
      if (cached) {
        const cachedData: Record<string, CachedBalance> = JSON.parse(cached);
        const now = Date.now();
        const balances: Record<string, TokenBalance> = {};
        
        Object.entries(SUPPORTED_TOKENS).forEach(([chainKey, tokens]) => {
          const chain = chainKey as SupportedChain;
          tokens.forEach(token => {
            const key = `${token.symbol}-${chain}`;
            const cachedBalance = cachedData[key];
            
            if (cachedBalance && (now - cachedBalance.timestamp) < CACHE_DURATION) {
              balances[key] = {
                symbol: token.symbol,
                chain,
                balance: cachedBalance.balance,
                loading: false,
                error: cachedBalance.error || null
              };
            } else {
              balances[key] = {
                symbol: token.symbol,
                chain,
                balance: '0.00',
                loading: true,
                error: null
              };
            }
          });
        });
        
        return balances;
      }
    } catch (error) {
      console.error('Error loading cached balances:', error);
    }
    return null;
  }, []);

  const saveCachedBalances = useCallback((walletAddress: string, balances: Record<string, TokenBalance>) => {
    try {
      const cacheData: Record<string, CachedBalance> = {};
      const timestamp = Date.now();
      
      Object.entries(balances).forEach(([key, balance]) => {
        if (!balance.loading) {
          cacheData[key] = {
            balance: balance.balance,
            timestamp,
            error: balance.error
          };
        }
      });
      
      localStorage.setItem(getCacheKey(walletAddress), JSON.stringify(cacheData));
      setLastUpdated(timestamp);
    } catch (error) {
      console.error('Error saving cached balances:', error);
    }
  }, []);

  const fetchTokenBalances = useCallback(async () => {
    if (!walletAddress || !enabled) {
      return;
    }

    setIsLoading(true);
    
    // First, try to load cached data
    const cachedBalances = loadCachedBalances(walletAddress);
    if (cachedBalances) {
      setTokenBalances(cachedBalances);
      
      // Check if we have fresh data or should fetch in background
      const hasStaleData = Object.values(cachedBalances).some(balance => balance.loading);
      if (!hasStaleData) {
        setIsLoading(false);
        // Still fetch fresh data in background but don't block UI
        setTimeout(() => fetchFreshBalances(walletAddress, cachedBalances), 100);
        return;
      }
    } else {
      // Initialize all tokens with loading state if no cache
      const initialBalances: Record<string, TokenBalance> = {};
      Object.entries(SUPPORTED_TOKENS).forEach(([chainKey, tokens]) => {
        const chain = chainKey as SupportedChain;
        tokens.forEach(token => {
          const key = `${token.symbol}-${chain}`;
          initialBalances[key] = {
            symbol: token.symbol,
            chain,
            balance: '0.00',
            loading: true,
            error: null
          };
        });
      });
      setTokenBalances(initialBalances);
    }

    await fetchFreshBalances(walletAddress, cachedBalances || {});
  }, [walletAddress, enabled, loadCachedBalances, saveCachedBalances]);

  const fetchFreshBalances = useCallback(async (walletAddress: string, currentBalances: Record<string, TokenBalance>) => {
    const balances = { ...currentBalances };

    // Create address to token mapping for easier lookup
    const addressToTokenMap = new Map<string, { symbol: string; chain: SupportedChain }>();
    Object.entries(SUPPORTED_TOKENS).forEach(([chainKey, tokens]) => {
      const chain = chainKey as SupportedChain;
      tokens.forEach(token => {
        addressToTokenMap.set(token.address.toLowerCase(), { symbol: token.symbol, chain });
      });
    });

    // Fetch balances for all chains in parallel
    const chainPromises = Object.entries(SUPPORTED_TOKENS).map(async ([chainKey]) => {
      const chain = chainKey as SupportedChain;
      
      return new Promise<void>(async (resolve) => {
        try {
          console.log(`Fetching token balances for ${chain} with wallet: ${walletAddress}`);
          console.log('Request payload:', { walletAddress, chain });
          
          const { data, error } = await supabase.functions.invoke('get-token-balance', {
            body: { walletAddress, chain }
          });
          
          console.log(`Response for ${chain}:`, { data, error });

          if (error) {
            console.error(`Error fetching ${chain} balances:`, error);
            console.error('Full error object:', JSON.stringify(error, null, 2));
            // Update tokens for this chain with error state
            Object.keys(balances).forEach(key => {
              if (balances[key].chain === chain) {
                balances[key] = {
                  ...balances[key],
                  loading: false,
                  error: 'Failed to load balance'
                };
              }
            });
          } else if (data?.portfolio) {
            console.log(`Portfolio data for ${chain}:`, JSON.stringify(data.portfolio, null, 2));
            
            // Process portfolio data and update balances
            const portfolio = data.portfolio;
            
            // Handle the correct structure: portfolio.result (not portfolio.data)
            if (portfolio.result && Array.isArray(portfolio.result)) {
              portfolio.result.forEach((item: any) => {
                const tokenAddress = item.tokenAddress?.toLowerCase();
                const tokenInfo = addressToTokenMap.get(tokenAddress);
                
                if (tokenInfo) {
                  const key = `${tokenInfo.symbol}-${tokenInfo.chain}`;
                  
                  // Better balance parsing - prefer denominatedBalance for precision, fallback to balance
                  let balance = '0.00';
                  
                  if (item.denominatedBalance && item.decimals) {
                    // Convert from denominatedBalance (raw units) to display balance
                    const rawBalance = parseFloat(item.denominatedBalance);
                    const decimals = parseInt(item.decimals);
                    const displayBalance = rawBalance / Math.pow(10, decimals);
                    
                    // Format with appropriate precision based on value
                    if (displayBalance >= 1) {
                      balance = displayBalance.toFixed(2);
                    } else if (displayBalance >= 0.01) {
                      balance = displayBalance.toFixed(4);
                    } else if (displayBalance > 0) {
                      balance = displayBalance.toFixed(6);
                    } else {
                      balance = '0.00';
                    }
                  } else if (item.balance) {
                    // Fallback to the balance field if denominatedBalance is not available
                    const displayBalance = parseFloat(item.balance);
                    if (displayBalance >= 1) {
                      balance = displayBalance.toFixed(2);
                    } else if (displayBalance >= 0.01) {
                      balance = displayBalance.toFixed(4);
                    } else if (displayBalance > 0) {
                      balance = displayBalance.toFixed(6);
                    } else {
                      balance = '0.00';
                    }
                  }
                  
                  console.log(`Found token: ${tokenInfo.symbol} on ${tokenInfo.chain} with balance: ${balance} (raw: ${item.denominatedBalance}, display: ${item.balance})`);
                  
                  balances[key] = {
                    ...balances[key],
                    balance,
                    loading: false,
                    error: null
                  };
                } else {
                  console.log(`Token not found in our supported list: ${tokenAddress} on chain ${chain}`);
                }
              });
            }
            
            // Update tokens for this chain that weren't found in the portfolio
            Object.keys(balances).forEach(key => {
              if (balances[key].chain === chain && balances[key].loading) {
                balances[key] = {
                  ...balances[key],
                  balance: '0.00',
                  loading: false,
                  error: null
                };
              }
            });
          }

          // Update UI progressively as each chain completes
          setTokenBalances({ ...balances });
        } catch (err) {
          console.error(`Error fetching ${chain} balances:`, err);
          // Update tokens for this chain with error state
          Object.keys(balances).forEach(key => {
            if (balances[key].chain === chain) {
              balances[key] = {
                ...balances[key],
                loading: false,
                error: 'Network error'
              };
            }
          });
          setTokenBalances({ ...balances });
        }
        resolve();
      });
    });

    // Wait for all chain requests to complete
    await Promise.allSettled(chainPromises);

    // Save final balances to cache
    saveCachedBalances(walletAddress, balances);
    setTokenBalances({ ...balances });
    setIsLoading(false);
  }, [saveCachedBalances]);

  useEffect(() => {
    fetchTokenBalances();
  }, [fetchTokenBalances]);

  const getTokenBalance = (symbol: string, chain: SupportedChain): TokenBalance | null => {
    const key = `${symbol}-${chain}`;
    return tokenBalances[key] || null;
  };

  const refreshBalances = useCallback(() => {
    fetchTokenBalances();
  }, [fetchTokenBalances]);

  return {
    tokenBalances,
    isLoading,
    getTokenBalance,
    refreshBalances,
    lastUpdated
  };
};
