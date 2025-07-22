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
import { Switch } from '@/components/ui/switch';
import DashboardHeader from '@/components/DashboardHeader';
import BottomNavigation from '@/components/BottomNavigation';
import { supabase } from '@/integrations/supabase/client';
import { SUPPORTED_TOKENS } from '@/constants/tokens';
import { profileService } from '@/services/profileService';
import { useToast } from '@/hooks/use-toast';

const Withdraw = () => {
  const navigate = useNavigate();
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const { toast } = useToast();
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
  const [showAllTokens, setShowAllTokens] = useState(false);
  const [loadingPreference, setLoadingPreference] = useState(false);

  useEffect(() => {
    if (!authenticated) {
      navigate('/');
      return;
    }
    loadUserPreference();
    fetchBalances();
  }, [authenticated, navigate, wallets]);

  const loadUserPreference = async () => {
    if (wallets.length === 0) return;
    
    const walletAddress = wallets[0]?.address;
    if (!walletAddress) return;

    try {
      const profile = await profileService.getProfile(walletAddress);
      if (profile?.show_all_tokens !== undefined) {
        setShowAllTokens(profile.show_all_tokens);
      }
    } catch (error) {
      // Profile might not exist yet, keep default value
      console.log('Profile not found, using default preference');
    }
  };

  const handleShowAllTokensChange = async (checked: boolean) => {
    if (wallets.length === 0) return;
    
    const walletAddress = wallets[0]?.address;
    if (!walletAddress) return;

    setLoadingPreference(true);
    try {
      await profileService.updateShowAllTokens(walletAddress, checked);
      setShowAllTokens(checked);
      toast({
        title: "Preference saved",
        description: `Token display preference updated successfully.`,
      });
    } catch (error) {
      console.error('Failed to update preference:', error);
      toast({
        title: "Error",
        description: "Failed to save preference. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingPreference(false);
    }
  };

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
                console.log(`Processing token data for ${chain}:`, tokenData);
                
                // Find matching token by contract address
                const matchingToken = tokens.find(token => 
                  token.address.toLowerCase() === tokenData.tokenAddress?.toLowerCase()
                );
                
                if (matchingToken && tokenData.balance) {
                  // Use the balance directly since Tatum API already provides human-readable format
                  // The 'balance' field is already converted from wei to human readable
                  const balance = parseFloat(tokenData.balance);
                  newBalances[chain][matchingToken.symbol] = balance.toFixed(2);
                  console.log(`✅ Updated ${matchingToken.symbol} balance on ${chain}:`, balance.toFixed(2));
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

  const getFilteredTokens = () => {
    if (showAllTokens) {
      return SUPPORTED_TOKENS;
    }
    
    // Show only USDC for Ethereum when switch is inactive
    const filteredTokens: Record<string, Array<{ symbol: string; address: string; decimals: number; }>> = {};
    const ethereumTokens = SUPPORTED_TOKENS.ethereum.filter(token => token.symbol === 'USDC');
    if (ethereumTokens.length > 0) {
      filteredTokens.ethereum = ethereumTokens;
    }
    return filteredTokens;
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

        <div className="flex items-center justify-between mb-4 p-4 border rounded-lg">
          <Label htmlFor="show-all-tokens" className="font-medium">
            Show All Tokens
          </Label>
          <Switch
            id="show-all-tokens"
            checked={showAllTokens}
            onCheckedChange={handleShowAllTokensChange}
            disabled={loadingPreference}
          />
        </div>

        <div className="space-y-6">
          {Object.entries(getFilteredTokens()).map(([chain, tokens]) => (
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
