import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Smartphone, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import DashboardHeader from '@/components/DashboardHeader';
import BottomNavigation from '@/components/BottomNavigation';
import { supabase } from '@/integrations/supabase/client';

const CURRENCIES = [
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
  { code: 'UGX', name: 'Ugandan Shilling', symbol: 'USh' },
  { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh' },
  { code: 'XOF', name: 'West African CFA Franc', symbol: 'CFA' }
];

interface MobileNetwork {
  id: string;
  name: string;
  currency: string;
  country: string;
}

const WithdrawMobileMoney = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const { toast } = useToast();
  
  const { token, balance } = location.state || {};
  
  const [amount, setAmount] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('');
  const [conversionRate, setConversionRate] = useState<number | null>(null);
  const [localAmount, setLocalAmount] = useState('0.00');
  const [mobileNetworks, setMobileNetworks] = useState<MobileNetwork[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'form' | 'signing' | 'transferring'>('form');
  const [loadingRate, setLoadingRate] = useState(false);
  const [loadingNetworks, setLoadingNetworks] = useState(false);

  if (!token) {
    navigate('/withdraw');
    return null;
  }

  useEffect(() => {
    fetchMobileNetworks();
  }, []);

  useEffect(() => {
    if (selectedCurrency && amount) {
      fetchConversionRate();
    }
  }, [selectedCurrency, amount]);

  const fetchMobileNetworks = async () => {
    setLoadingNetworks(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-mobile-networks');
      if (!error && data?.networks) {
        setMobileNetworks(data.networks);
      }
    } catch (error) {
      console.error('Error fetching mobile networks:', error);
      toast({
        title: "Error",
        description: "Failed to load mobile networks",
        variant: "destructive"
      });
    } finally {
      setLoadingNetworks(false);
    }
  };

  const fetchConversionRate = async () => {
    if (!selectedCurrency || !amount) return;
    
    setLoadingRate(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-conversion-rate', {
        body: {
          fromCurrency: token.symbol,
          toCurrency: selectedCurrency,
          amount: parseFloat(amount)
        }
      });
      
      if (!error && data?.rate) {
        setConversionRate(data.rate);
        setLocalAmount((parseFloat(amount) * data.rate).toFixed(2));
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

  const formatPhoneNumber = (input: string) => {
    // Remove all non-digits
    const digits = input.replace(/\D/g, '');
    
    // Add country code if not present
    if (digits.length > 0 && !digits.startsWith('233')) {
      return `+233${digits}`;
    }
    
    return `+${digits}`;
  };

  const filteredNetworks = mobileNetworks.filter(network => 
    network.currency === selectedCurrency
  );

  const handleWithdraw = async () => {
    if (!amount || !selectedCurrency || !phoneNumber || !selectedNetwork || !conversionRate) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    if (parseFloat(amount) <= 0 || parseFloat(amount) > parseFloat(balance)) {
      toast({
        title: "Error",
        description: "Invalid amount",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setStep('signing');

    try {
      const walletAddress = wallets[0]?.address;
      if (!walletAddress) {
        throw new Error('No wallet connected');
      }

      const formattedPhone = formatPhoneNumber(phoneNumber);

      // Create transaction record
      const transactionData = {
        wallet_address: walletAddress,
        transaction_type: 'withdrawal_mobile_money',
        token_symbol: token.symbol,
        chain: token.chain,
        amount: parseFloat(amount),
        recipient_phone: formattedPhone,
        recipient_currency: selectedCurrency,
        mobile_network: selectedNetwork,
        conversion_rate: conversionRate,
        status: 'pending'
      };

      const { data: transaction, error: createError } = await supabase.functions.invoke('create-withdrawal', {
        body: transactionData
      });

      if (createError) {
        throw createError;
      }

      setStep('transferring');

      // Process the mobile money transfer
      const { data: transferResult, error: transferError } = await supabase.functions.invoke('process-mobile-money-transfer', {
        body: {
          transactionId: transaction.id,
          amount: localAmount,
          currency: selectedCurrency,
          phoneNumber: formattedPhone,
          mobileNetwork: selectedNetwork,
          walletAddress
        }
      });

      if (transferError) {
        throw transferError;
      }

      toast({
        title: "Success",
        description: "Mobile money transfer initiated successfully"
      });

      navigate('/wallet');
    } catch (error) {
      console.error('Mobile money transfer error:', error);
      toast({
        title: "Error",
        description: error.message || "Transfer failed",
        variant: "destructive"
      });
      setStep('form');
    } finally {
      setIsProcessing(false);
    }
  };

  if (step === 'signing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-sm mx-auto">
          <CardContent className="pt-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold mb-2">Sign Message</h3>
            <p className="text-muted-foreground">
              Please sign the transaction in your wallet to proceed with the withdrawal.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'transferring') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-sm mx-auto">
          <CardContent className="pt-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold mb-2">Processing Transfer</h3>
            <p className="text-muted-foreground">
              Your mobile money transfer is being processed. You will receive an SMS confirmation shortly.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background pb-20">
      <DashboardHeader />
      
      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/withdraw')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Mobile Money</h1>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              {token.symbol} on {token.chain.charAt(0).toUpperCase() + token.chain.slice(1)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">Available Balance</p>
            <p className="text-2xl font-bold">{balance} {token.symbol}</p>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="0.000001"
                min="0"
                max={balance}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                {token.symbol}
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span></span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAmount(balance)}
                className="h-auto p-0 text-primary"
              >
                Max: {balance}
              </Button>
            </div>
          </div>

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
                  Rate: 1 {token.symbol} = {conversionRate.toFixed(4)} {selectedCurrency}
                </p>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            <Label htmlFor="phone">Mobile Number</Label>
            <Input
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
            disabled={isProcessing || !amount || !selectedCurrency || !phoneNumber || !selectedNetwork || !conversionRate}
          >
            {isProcessing ? 'Processing...' : 'Withdraw'}
          </Button>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default WithdrawMobileMoney;