
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { InputWithPaste } from '@/components/ui/input-with-paste';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Wallet2, AlertCircle, RefreshCw } from 'lucide-react';
import DashboardHeader from '@/components/DashboardHeader';
import BottomNavigation from '@/components/BottomNavigation';
import WithdrawalLoader from '@/components/WithdrawalLoader';
import NetworkStatus from '@/components/NetworkStatus';
import { useWalletWithdrawal } from '@/hooks/useWalletWithdrawal';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const WithdrawWallet = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { ready, authenticated, hasConnectedWallet } = useAuth();
  const { toast } = useToast();
  const amountInputRef = useRef<HTMLInputElement>(null);
  
  const { token, balance } = location.state || {};
  
  const [amount, setAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Reset form function
  const resetForm = () => {
    setAmount('');
    setRecipientAddress('');
    // Focus amount input after reset
    setTimeout(() => {
      amountInputRef.current?.focus();
    }, 100);
  };

  // Set a timeout for loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!ready || !authenticated || !hasConnectedWallet) {
        setLoadingTimeout(true);
      }
    }, 8000); // 8 second timeout

    return () => clearTimeout(timer);
  }, [ready, authenticated, hasConnectedWallet]);

  // Auto-focus amount input when ready
  useEffect(() => {
    if (ready && authenticated && hasConnectedWallet && !loadingTimeout) {
      setTimeout(() => {
        amountInputRef.current?.focus();
      }, 100);
    }
  }, [ready, authenticated, hasConnectedWallet, loadingTimeout]);

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
  } = useWalletWithdrawal({
    token,
    amount,
    recipientAddress,
    balance,
    onSuccess: resetForm
  });

  // Early return AFTER all hooks are called
  if (!token) {
    navigate('/withdraw');
    return null;
  }

  // Show loading while auth/wallet is initializing
  if (!ready || (ready && authenticated && !hasConnectedWallet && !loadingTimeout)) {
    return <WithdrawalLoader message="Connecting wallet..." />;
  }

  // Handle timeout or auth failures
  if (loadingTimeout || !authenticated || (ready && !hasConnectedWallet)) {
    return (
      <div className="min-h-screen flex flex-col bg-background pb-20">
        <DashboardHeader />
        
        <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full flex items-center justify-center">
          <Card className="w-full">
            <CardContent className="pt-6 text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Connection Issue</h3>
              <p className="text-muted-foreground">
                {!authenticated 
                  ? "Please log in to access withdrawal features."
                  : "Unable to connect to your wallet. Please try again."
                }
              </p>
              
              <div className="space-y-2">
                <Button 
                  onClick={() => window.location.reload()}
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => navigate('/')}
                  className="w-full"
                >
                  Return to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>

        <BottomNavigation />
      </div>
    );
  }

  if (step === 'confirming') {
    return (
      <div className="min-h-screen flex flex-col bg-background pb-20">
        <DashboardHeader />
        
        <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full flex items-center justify-center">
          <Card className="w-full max-w-sm">
            <CardContent className="pt-6 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold mb-2">Confirming Transaction</h3>
              <p className="text-muted-foreground">
                Your withdrawal is being processed on the blockchain. This may take a few minutes.
              </p>
              <div className="mt-4 p-3 bg-muted rounded-lg text-sm">
                <p><strong>Sending:</strong> {amount} {token.symbol}</p>
                <p><strong>To:</strong> {recipientAddress.slice(0, 6)}...{recipientAddress.slice(-4)}</p>
                <p><strong>Network:</strong> {token.chain}</p>
              </div>
            </CardContent>
          </Card>
        </main>

        <BottomNavigation />
      </div>
    );
  }

  // Debug button state
  const isButtonDisabled = isProcessing || !amount || !recipientAddress || isValidating || isSwitching;
  
  console.log('🔍 Button State Debug:', {
    isProcessing,
    amount,
    recipientAddress,
    isValidating,
    isSwitching,
    isButtonDisabled,
    token: token?.symbol,
    balance
  });

  return (
    <div className="min-h-screen flex flex-col bg-background pb-20">
      <DashboardHeader />
      
      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/withdraw')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Withdraw to Wallet</h1>
        </div>

        {/* Enhanced Network Status */}
        <NetworkStatus
          isCorrectNetwork={isCorrectNetwork}
          currentChain={currentChain}
          targetChain={token.chain}
          isValidating={isValidating}
          isSwitching={isSwitching}
          switchError={switchError}
          onRetry={retryNetworkSwitch}
        />

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet2 className="h-5 w-5" />
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
                ref={amountInputRef}
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="0.000001"
                min="0"
                max={balance}
                className="text-2xl font-bold h-14 pr-16"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-lg font-semibold text-muted-foreground">
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
            <Label htmlFor="recipient">Recipient Address</Label>
            <InputWithPaste
              id="recipient"
              placeholder="0x..."
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Make sure the address is correct. Transactions cannot be reversed.
            </p>
          </div>

          {/* Debug info for button state */}
          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-muted-foreground border p-2 rounded">
              <p>Debug: isProcessing={String(isProcessing)}, amount="{amount}", recipientAddress="{recipientAddress}", isValidating={String(isValidating)}, isSwitching={String(isSwitching)}</p>
            </div>
          )}

          <Button 
            onClick={handleWithdraw} 
            className="w-full" 
            disabled={isButtonDisabled}
          >
            {isSwitching ? "Switching Network..." : 
             isValidating ? "Validating Network..." : 
             isProcessing ? "Processing..." : "Withdraw"}
          </Button>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default WithdrawWallet;
