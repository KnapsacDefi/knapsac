import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Smartphone, RefreshCw, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import DashboardHeader from '@/components/DashboardHeader';
import BottomNavigation from '@/components/BottomNavigation';
import WithdrawalLoader from '@/components/WithdrawalLoader';
import NetworkStatus from '@/components/NetworkStatus';
import { supabase } from '@/integrations/supabase/client';
import { useClaimWithdrawal } from '@/hooks/useClaimWithdrawal';
import { useAuth } from '@/contexts/AuthContext';
import { useSimpleWalletLoading } from '@/hooks/useSimpleWalletLoading';
import { usePortfolio } from '@/hooks/usePortfolio';

const CURRENCIES = [
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
  { code: 'UGX', name: 'Ugandan Shilling', symbol: 'USh' },
  { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh' },
  { code: 'XOF', name: 'West African CFA Franc', symbol: 'CFA' },
  { code: 'CDF', name: 'Congolese Franc', symbol: 'CDF' },
  { code: 'XAF', name: 'Central African CFA Franc', symbol: 'FCFA' }
];

interface MobileNetwork {
  id: string;
  name: string;
  currency: string;
  country: string;
  mobile_network?: string;
  mobile_network_name?: string;
  country_code?: string;
}

const ClaimWithdrawal = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const { ready, authenticated } = useAuth();
  const { hasWallet, isWalletLoading } = useSimpleWalletLoading();
  const { portfolio, isLoading: isLoadingPortfolio } = usePortfolio();
  const phoneInputRef = useRef<HTMLInputElement>(null);
  
  const portfolioEntry = portfolio.find(entry => entry.id === id);
  
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('');
  const [conversionRate, setConversionRate] = useState<number | null>(null);
  const [localAmount, setLocalAmount] = useState('0.00');
  const [rateSource, setRateSource] = useState<string>('');
  const [mobileNetworks, setMobileNetworks] = useState<MobileNetwork[]>([]);
  const [loadingRate, setLoadingRate] = useState(false);
  const [loadingNetworks, setLoadingNetworks] = useState(false);

  // Reset form function
  const resetForm = () => {
    setSelectedCurrency('');
    setPhoneNumber('');
    setSelectedNetwork('');
    setConversionRate(null);
    setLocalAmount('0.00');
    setRateSource('');
    // Focus phone input after reset
    setTimeout(() => {
      phoneInputRef.current?.focus();
    }, 100);
  };

  const { 
    handleWithdraw, 
    isProcessing, 
    step, 
    isCorrectNetwork, 
    currentChain, 
    isValidating,
    isSwitching,
    switchError,
    retryNetworkSwitch 
  } = useClaimWithdrawal({
    portfolioEntry,
    phoneNumber,
    selectedCurrency,
    selectedNetwork,
    conversionRate: conversionRate || 0,
    localAmount,
    onSuccess: () => {
      resetForm();
      navigate('/portfolio');
    }
  });

  // Auto-focus phone input when ready
  useEffect(() => {
    if (ready && authenticated && hasWallet && portfolioEntry) {
      setTimeout(() => {
        phoneInputRef.current?.focus();
      }, 100);
    }
  }, [ready, authenticated, hasWallet, portfolioEntry]);

  if (!id || isLoadingPortfolio) {
    return <WithdrawalLoader message="Loading portfolio..." />;
  }

  if (!portfolioEntry) {
    navigate('/portfolio');
    return null;
  }

  // Show loading while wallet is loading
  if (isWalletLoading) {
    return <WithdrawalLoader message="Connecting wallet..." />;
  }

  // Redirect to home if not authenticated or no wallet
  if (!authenticated || !hasWallet) {
    navigate('/');
    return null;
  }

  useEffect(() => {
    if (selectedCurrency) {
      fetchMobileNetworks(selectedCurrency);
    } else {
      fetchMobileNetworks();
    }
  }, [selectedCurrency]);

  useEffect(() => {
    if (selectedCurrency && portfolioEntry?.claimable_amount) {
      fetchConversionRate();
    }
  }, [selectedCurrency, portfolioEntry?.claimable_amount]);

  const fetchMobileNetworks = async (currency?: string) => {
    setLoadingNetworks(true);
    try {
      console.log('Fetching mobile networks for currency:', currency || 'All');
      
      const { data, error } = await supabase.functions.invoke('get-mobile-networks', {
        body: { currency: currency || 'All' }
      });
      
      console.log('Mobile networks API response:', data);
      
      if (error) {
        console.error('Error from mobile networks API:', error);
        throw error;
      }
      
      if (data?.error) {
        console.error('API returned error:', data.error);
        toast({
          title: "Error",
          description: data.message || "Failed to load mobile networks",
          variant: "destructive"
        });
        setMobileNetworks([]);
        return;
      }
      
      let networks = [];
      if (data?.networks) {
        networks = data.networks;
      } else if (Array.isArray(data)) {
        networks = data;
      } else if (data && typeof data === 'object') {
        networks = Object.values(data).flat();
      }
      
      if (!Array.isArray(networks)) {
        console.warn('Networks data is not an array, using empty array');
        networks = [];
      }
      
      const normalizedNetworks = networks.map((network: any) => ({
        id: network.id || `${network.mobile_network || network.name}_${network.currency}`,
        name: network.mobile_network_name || network.mobile_network || network.name,
        currency: network.currency,
        country: network.country,
        mobile_network: network.mobile_network,
        mobile_network_name: network.mobile_network_name,
        country_code: network.country_code
      }));
      
      console.log('Normalized networks:', normalizedNetworks);
      setMobileNetworks(normalizedNetworks);
      
    } catch (error) {
      console.error('Error fetching mobile networks:', error);
      toast({
        title: "Error",
        description: "Failed to load mobile networks. Please try again.",
        variant: "destructive"
      });
      setMobileNetworks([]);
    } finally {
      setLoadingNetworks(false);
    }
  };

  const fetchConversionRate = async () => {
    if (!selectedCurrency || !portfolioEntry?.claimable_amount) return;
    
    setLoadingRate(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-conversion-rate', {
        body: {
          fromCurrency: portfolioEntry.lend_token,
          toCurrency: selectedCurrency,
          amount: portfolioEntry.claimable_amount
        }
      });
      
      if (!error && data?.rate) {
        setConversionRate(data.rate);
        setLocalAmount((portfolioEntry.claimable_amount * data.rate).toFixed(2));
        setRateSource(data.source || '');
      }
    } catch (error) {
      console.error('Error fetching conversion rate:', error);
      toast({
        title: "Error",
        description: "Failed to get conversion rate",
        variant: "destructive"
      });
    } finally {
      setLoadingRate(false);
    }
  };

  const filteredNetworks = Array.isArray(mobileNetworks) 
    ? mobileNetworks.filter(network => network.currency === selectedCurrency)
    : [];

  if (step === 'transferring') {
    return (
      <div className="min-h-screen flex flex-col bg-background pb-20">
        <DashboardHeader />
        
        <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full flex items-center justify-center">
          <Card className="w-full max-w-sm">
            <CardContent className="pt-6 text-center">
              <NetworkStatus
                isCorrectNetwork={isCorrectNetwork}
                currentChain={currentChain}
                targetChain={portfolioEntry.chain as "base" | "ethereum" | "celo"}
                isValidating={isValidating}
                isSwitching={isSwitching}
                switchError={switchError}
                onRetry={retryNetworkSwitch}
              />
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold mb-2">Processing Claim Withdrawal</h3>
              <p className="text-muted-foreground">
                Your claim withdrawal is being processed. You will receive an SMS confirmation shortly.
              </p>
              <div className="mt-4 p-3 bg-muted rounded-lg text-sm">
                <p><strong>Claiming:</strong> {portfolioEntry.claimable_amount.toFixed(4)} {portfolioEntry.lend_token}</p>
                <p><strong>Receiving:</strong> {localAmount} {selectedCurrency}</p>
                <p><strong>To:</strong> {phoneNumber}</p>
              </div>
            </CardContent>
          </Card>
        </main>

        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background pb-20">
      <DashboardHeader />
      
      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/claim/${id}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Claim to Mobile Money</h1>
        </div>

        {/* Enhanced Network Status */}
        <NetworkStatus
          isCorrectNetwork={isCorrectNetwork}
          currentChain={currentChain}
          targetChain={portfolioEntry.chain as "base" | "ethereum" | "celo"}
          isValidating={isValidating}
          isSwitching={isSwitching}
          switchError={switchError}
          onRetry={retryNetworkSwitch}
        />

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Claimable Rewards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">Available to Claim</p>
            <p className="text-2xl font-bold">{portfolioEntry.claimable_amount.toFixed(4)} {portfolioEntry.lend_token}</p>
            <p className="text-sm text-muted-foreground">
              Network: {portfolioEntry.chain.charAt(0).toUpperCase() + portfolioEntry.chain.slice(1)}
            </p>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="currency">Receiving Currency</Label>
            <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    {currency.symbol} {currency.name} ({currency.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCurrency && conversionRate && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">You will receive</span>
                  {loadingRate && <RefreshCw className="h-4 w-4 animate-spin" />}
                </div>
                <p className="text-2xl font-bold">
                  {CURRENCIES.find(c => c.code === selectedCurrency)?.symbol}{localAmount}
                </p>
                <p className="text-xs text-muted-foreground">
                  Rate: 1 {portfolioEntry.lend_token} = {conversionRate.toFixed(4)} {selectedCurrency}
                  {rateSource && (
                    <span className="block mt-1">
                      {rateSource === 'coingecko+tatum' && 'Rate from CoinGecko + Tatum'}
                      {rateSource === 'tatum' && 'Rate from Tatum'}
                      {rateSource === 'fallback' && 'Using fallback rate'}
                    </span>
                  )}
                </p>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            <Label htmlFor="phone">Mobile Number</Label>
            <Input
              ref={phoneInputRef}
              id="phone"
              type="tel"
              placeholder="+233264022229"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Include country code (e.g., +233 for Ghana)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="network">Mobile Network</Label>
            <Select value={selectedNetwork} onValueChange={setSelectedNetwork} disabled={!selectedCurrency || loadingNetworks}>
              <SelectTrigger>
                <SelectValue placeholder={loadingNetworks ? "Loading networks..." : "Select network"} />
              </SelectTrigger>
              <SelectContent>
                {filteredNetworks.map((network) => (
                  <SelectItem key={network.id} value={network.name}>
                    {network.name} ({network.country})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={handleWithdraw} 
            className="w-full" 
            disabled={isProcessing || !selectedCurrency || !phoneNumber || !selectedNetwork || !conversionRate || isValidating || isSwitching}
          >
            {isSwitching ? "Switching Network..." : 
             isValidating ? "Validating Network..." : 
             isProcessing ? "Processing Claim..." : 
             `Claim ${portfolioEntry.claimable_amount.toFixed(4)} ${portfolioEntry.lend_token}`}
          </Button>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default ClaimWithdrawal;