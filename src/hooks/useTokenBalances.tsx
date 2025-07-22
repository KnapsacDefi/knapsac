
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
            // Process portfolio data and update balances
            const portfolio = data.portfolio;
            
            // Update tokens for this chain
            Object.keys(balances).forEach(key => {
              if (balances[key].chain === chain) {
                const tokenSymbol = balances[key].symbol;
                
                // Find matching token in portfolio
                let tokenBalance = '0.00';
                
                if (portfolio.data && Array.isArray(portfolio.data)) {
                  const tokenData = portfolio.data.find((item: any) => 
                    item.asset?.symbol?.toUpperCase() === tokenSymbol.toUpperCase()
                  );
                  
                  if (tokenData?.balance) {
                    tokenBalance = parseFloat(tokenData.balance).toFixed(2);
                  }
                }
                
                balances[key] = {
                  ...balances[key],
                  balance: tokenBalance,
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
