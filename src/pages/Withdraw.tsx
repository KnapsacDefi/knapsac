import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Wallet2, Smartphone } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import DashboardHeader from '@/components/DashboardHeader';
import BottomNavigation from '@/components/BottomNavigation';
import { supabase } from '@/integrations/supabase/client';

const SUPPORTED_TOKENS = {
  ethereum: [
    { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
    { symbol: 'USDT', address: '0xdac17f958d2ee523a2206206994597c13d831ec7', decimals: 6 }
  ],
  celo: [
    { symbol: 'USDC', address: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C', decimals: 6 },
    { symbol: 'USDT', address: '0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e', decimals: 6 },
    { symbol: 'G$', address: '0x62b8b11039fcfe5ab0c56e502b1c372a3d2a9c7a', decimals: 18 }
  ],
  base: [
    { symbol: 'USDC', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
    { symbol: 'USDT', address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2', decimals: 6 }
  ]
};

const Withdraw = () => {
  const navigate = useNavigate();
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const [selectedToken, setSelectedToken] = useState<{
    symbol: string;
    address: string;
    chain: string;
    decimals: number;
  } | null>(null);
  const [showMethodDialog, setShowMethodDialog] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'wallet' | 'mobile_money'>('wallet');
  const [balances, setBalances] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authenticated) {
      navigate('/');
      return;
    }
    fetchBalances();
  }, [authenticated, navigate, wallets]);

  const fetchBalances = async () => {
    if (wallets.length === 0) return;
    
    const walletAddress = wallets[0]?.address;
    if (!walletAddress) return;

    setLoading(true);
    const newBalances: Record<string, Record<string, string>> = {};

    try {
      // Fetch portfolio for each supported chain
      for (const [chain, tokens] of Object.entries(SUPPORTED_TOKENS)) {
        newBalances[chain] = {};
        
        // Initialize all tokens to 0
        for (const token of tokens) {
          newBalances[chain][token.symbol] = '0.00';
        }
        
        try {
          const { data, error } = await supabase.functions.invoke('get-token-balance', {
            body: {
              walletAddress,
              chain
            }
          });
          
          console.log(`Portfolio data for ${chain}:`, data);
          
          if (!error && data?.portfolio?.result) {
            const portfolioResults = data.portfolio.result;
            
            // Parse portfolio results and match with our supported tokens
            if (Array.isArray(portfolioResults)) {
              for (const tokenData of portfolioResults) {
                // Find matching token by contract address
                const matchingToken = tokens.find(token => 
                  token.address.toLowerCase() === tokenData.tokenAddress?.toLowerCase()
                );
                
                if (matchingToken && tokenData.balance) {
                  // Convert balance from smallest unit to human readable
                  const balance = parseFloat(tokenData.balance) / Math.pow(10, matchingToken.decimals);
                  newBalances[chain][matchingToken.symbol] = balance.toFixed(6);
                  console.log(`Updated ${matchingToken.symbol} balance:`, balance.toFixed(6));
                }
              }
            }
          }
        } catch (err) {
          console.error(`Error fetching portfolio for ${chain}:`, err);
        }
      }
      
      console.log('Final balances:', newBalances);
      setBalances(newBalances);
    } catch (error) {
      console.error('Error fetching balances:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTokenSelect = (token: any, chain: string) => {
    setSelectedToken({ ...token, chain });
    setShowMethodDialog(true);
  };

  const handleMethodConfirm = () => {
    if (!selectedToken) return;
    
    setShowMethodDialog(false);
    
    if (selectedMethod === 'wallet') {
      navigate('/withdraw/wallet', { 
        state: { 
          token: selectedToken,
          balance: balances[selectedToken.chain]?.[selectedToken.symbol] || '0.00'
        } 
      });
    } else {
      navigate('/withdraw/mobile-money', { 
        state: { 
          token: selectedToken,
          balance: balances[selectedToken.chain]?.[selectedToken.symbol] || '0.00'
        } 
      });
    }
  };

  const formatChainName = (chain: string) => {
    return chain.charAt(0).toUpperCase() + chain.slice(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading balances...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background pb-20">
      <DashboardHeader />
      
      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/wallet')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Withdraw</h1>
        </div>

        <div className="space-y-6">
          {Object.entries(SUPPORTED_TOKENS).map(([chain, tokens]) => (
            <Card key={chain}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {formatChainName(chain)}
                  <Badge variant="outline">{tokens.length} tokens</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {tokens.map((token) => (
                  <div
                    key={`${chain}-${token.symbol}`}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleTokenSelect(token, chain)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="font-bold text-primary">{token.symbol[0]}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold">{token.symbol}</h3>
                        <p className="text-sm text-muted-foreground">
                          {token.address.slice(0, 6)}...{token.address.slice(-4)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {balances[chain]?.[token.symbol] || '0.00'}
                      </p>
                      <p className="text-sm text-muted-foreground">{token.symbol}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      <Dialog open={showMethodDialog} onOpenChange={setShowMethodDialog}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>Choose Withdrawal Method</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <RadioGroup value={selectedMethod} onValueChange={(value: 'wallet' | 'mobile_money') => setSelectedMethod(value)}>
              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <RadioGroupItem value="wallet" id="wallet" />
                <Label htmlFor="wallet" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Wallet2 className="h-5 w-5" />
                  <div>
                    <p className="font-medium">Wallet</p>
                    <p className="text-sm text-muted-foreground">Send to another wallet address</p>
                  </div>
                </Label>
              </div>
              
              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <RadioGroupItem value="mobile_money" id="mobile_money" />
                <Label htmlFor="mobile_money" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Smartphone className="h-5 w-5" />
                  <div>
                    <p className="font-medium">Mobile Money</p>
                    <p className="text-sm text-muted-foreground">Convert to local currency</p>
                  </div>
                </Label>
              </div>
            </RadioGroup>
            
            <Button onClick={handleMethodConfirm} className="w-full">
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNavigation />
    </div>
  );
};

export default Withdraw;
