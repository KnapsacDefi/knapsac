import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Wallet, RefreshCw } from "lucide-react";
import { SUPPORTED_TOKENS, CHAIN_CONFIG, type SupportedChain } from "@/constants/tokens";
import BottomNavigation from "@/components/BottomNavigation";
import { useAuth } from "@/contexts/AuthContext";
import { getWalletAddress } from "@/utils/walletUtils";
import { useTokenBalances } from "@/hooks/useTokenBalances";

interface EnhancedToken {
  symbol: string;
  address: string;
  decimals: number;
  chain: SupportedChain;
  chainDisplayName: string;
  name: string;
}

const LendingTokenSelection = () => {
  const { poolId } = useParams<{ poolId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, wallets, authenticated, ready, walletsLoading } = useAuth();
  
  const { pool, selectedPeriod } = location.state || {};

  const walletAddress = getWalletAddress(wallets, user);
  const { tokenBalances, isLoading: balancesLoading, getTokenBalance, refreshBalances } = useTokenBalances({
    walletAddress,
    enabled: authenticated && ready && !!walletAddress && !walletsLoading
  });

  const createEnhancedTokens = (): EnhancedToken[] => {
    const enhancedTokens: EnhancedToken[] = [];

    Object.entries(SUPPORTED_TOKENS).forEach(([chainKey, tokens]) => {
      const chain = chainKey as SupportedChain;
      const chainConfig = CHAIN_CONFIG[chain];

      tokens.forEach(token => {
        enhancedTokens.push({
          ...token,
          chain,
          chainDisplayName: chainConfig.displayName,
          name: token.symbol === 'G$' ? 'GoodDollar' : token.symbol,
        });
      });
    });

    return enhancedTokens;
  };

  const allTokens = createEnhancedTokens();

  const handleTokenSelect = (token: EnhancedToken) => {
    const tokenBalance = getTokenBalance(token.symbol, token.chain);
    const balance = tokenBalance?.balance || '0.00';

    navigate(`/lending/${poolId}/confirm`, { 
      state: { 
        pool,
        selectedPeriod,
        token: {
          ...token,
          chain: token.chain
        },
        balance
      } 
    });
  };

  if (!authenticated || !pool) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="sticky top-0 z-10 bg-background border-b">
          <div className="flex items-center gap-4 p-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/lending-pool/${poolId}`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">Select Token</h1>
          </div>
        </div>
        <div className="p-4 text-center">
          <p className="text-muted-foreground">
            {!authenticated ? "Please log in to continue" : "Pool information not found"}
          </p>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center gap-4 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/lending-pool/${poolId}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Select Token to Lend</h1>
          {balancesLoading && (
            <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground ml-auto" />
          )}
        </div>
      </div>

      <div className="p-4 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pool Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Target Amount:</span>
              <span className="font-medium">${pool.target_amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Monthly Interest:</span>
              <span className="font-medium text-green-600">{pool.monthly_interest}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Selected Period:</span>
              <span className="font-medium">{selectedPeriod} days</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Available Tokens
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshBalances}
                disabled={balancesLoading}
              >
                <RefreshCw className={`h-4 w-4 ${balancesLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {allTokens.map((token, index) => {
              const tokenBalance = getTokenBalance(token.symbol, token.chain);
              const hasBalance = tokenBalance && parseFloat(tokenBalance.balance) > 0;
              
              return (
                <div key={`${token.symbol}-${token.chain}`}>
                  <Button
                    variant="outline"
                    className="w-full justify-start p-4 h-auto"
                    onClick={() => handleTokenSelect(token)}
                    disabled={!hasBalance}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary">
                          {token.symbol.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{token.symbol}</span>
                          <Badge variant="secondary" className="text-xs">
                            {token.chainDisplayName}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mb-1">
                          {token.name}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold">
                          {tokenBalance?.loading ? (
                            <Skeleton className="h-6 w-16" />
                          ) : tokenBalance?.error ? (
                            <span className="text-destructive text-sm">Error</span>
                          ) : (
                            <span className={hasBalance ? 'text-foreground' : 'text-muted-foreground'}>
                              {tokenBalance?.balance || '0.00'}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {token.symbol}
                        </div>
                      </div>
                    </div>
                  </Button>
                  {index < allTokens.length - 1 && <Separator className="my-2" />}
                </div>
              );
            })}
            
            {allTokens.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Wallet className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No tokens available for lending</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-xs text-muted-foreground text-center">
          Only tokens with available balance can be used for lending
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default LendingTokenSelection;