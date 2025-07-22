
import { useState, useEffect } from 'react';
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

export const useTokenBalances = ({ walletAddress, enabled = true }: UseTokenBalancesParams) => {
  const [tokenBalances, setTokenBalances] = useState<Record<string, TokenBalance>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!walletAddress || !enabled) {
      return;
    }

    const fetchTokenBalances = async () => {
      setIsLoading(true);
      const balances: Record<string, TokenBalance> = {};

      // Initialize all tokens with loading state
      Object.entries(SUPPORTED_TOKENS).forEach(([chainKey, tokens]) => {
        const chain = chainKey as SupportedChain;
        tokens.forEach(token => {
          const key = `${token.symbol}-${chain}`;
          balances[key] = {
            symbol: token.symbol,
            chain,
            balance: '0.00',
            loading: true,
            error: null
          };
        });
      });

      setTokenBalances(balances);

      // Create address to token mapping for easier lookup
      const addressToTokenMap = new Map<string, { symbol: string; chain: SupportedChain }>();
      Object.entries(SUPPORTED_TOKENS).forEach(([chainKey, tokens]) => {
        const chain = chainKey as SupportedChain;
        tokens.forEach(token => {
          addressToTokenMap.set(token.address.toLowerCase(), { symbol: token.symbol, chain });
        });
      });

      // Fetch balances for each chain
      for (const [chainKey] of Object.entries(SUPPORTED_TOKENS)) {
        const chain = chainKey as SupportedChain;
        
        try {
          console.log(`Fetching token balances for ${chain}`);
          const { data, error } = await supabase.functions.invoke('get-token-balance', {
            body: { walletAddress, chain }
          });

          if (error) {
            console.error(`Error fetching ${chain} balances:`, error);
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
                  const balance = item.balance ? parseFloat(item.balance).toFixed(2) : '0.00';
                  
                  console.log(`Found token: ${tokenInfo.symbol} on ${tokenInfo.chain} with balance: ${balance}`);
                  
                  balances[key] = {
                    ...balances[key],
                    balance,
                    loading: false,
                    error: null
                  };
                } else {
                  console.log(`Token not found in our supported list: ${tokenAddress}`);
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
        }
      }

      setTokenBalances({ ...balances });
      setIsLoading(false);
    };

    fetchTokenBalances();
  }, [walletAddress, enabled]);

  const getTokenBalance = (symbol: string, chain: SupportedChain): TokenBalance | null => {
    const key = `${symbol}-${chain}`;
    return tokenBalances[key] || null;
  };

  const refreshBalances = () => {
    if (walletAddress && enabled) {
      // Trigger re-fetch by updating a dependency
      setTokenBalances({});
    }
  };

  return {
    tokenBalances,
    isLoading,
    getTokenBalance,
    refreshBalances
  };
};
