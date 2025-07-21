import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Wallet2, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import DashboardHeader from '@/components/DashboardHeader';
import BottomNavigation from '@/components/BottomNavigation';
import WalletConnectionGuard from '@/components/WalletConnectionGuard';
import { useWalletWithdrawal } from '@/hooks/useWalletWithdrawal';

const WithdrawWallet = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const { token, balance } = location.state || {};
  
  const [amount, setAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');

  // Move all hook calls to the beginning - BEFORE any early returns
  const { 
    handleWithdraw, 
    isProcessing, 
    step, 
    isCorrectNetwork, 
    currentChain, 
    isValidating 
  } = useWalletWithdrawal({
    token,
    amount,
    recipientAddress,
    balance
  });

  // Early return AFTER all hooks are called
  if (!token) {
    navigate('/withdraw');
    return null;
  }

  if (step === 'signing') {
    return (
      <div className="min-h-screen flex flex-col bg-background pb-20">
        <DashboardHeader />
        
        <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full flex items-center justify-center">
          <Card className="w-full max-w-sm">
            <CardContent className="pt-6 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold mb-2">Sign Message</h3>
              <p className="text-muted-foreground">
                Please sign the authorization message in your wallet to proceed with the withdrawal.
              </p>
              <div className="mt-4 p-3 bg-muted rounded-lg text-sm">
                <p><strong>Amount:</strong> {amount} {token.symbol}</p>
                <p><strong>To:</strong> {recipientAddress.slice(0, 6)}...{recipientAddress.slice(-4)}</p>
                <p><strong>Chain:</strong> {token.chain}</p>
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

  const getNetworkStatusAlert = () => {
    // Only show network status during processing or when there's an issue
    if (!isProcessing && isCorrectNetwork) {
      return null;
    }

    if (isValidating) {
      return (
        <Alert className="mb-4">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <AlertDescription>
            Validating network connection...
          </AlertDescription>
        </Alert>
      );
    }

    if (!isCorrectNetwork && isProcessing) {
      const currentDisplay = currentChain || 'Unknown';
      const targetDisplay = token.chain || 'target';
      
      return (
        <Alert className="mb-4" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Connected to {currentDisplay} network. Please switch to {targetDisplay} network in your wallet to continue.
          </AlertDescription>
        </Alert>
      );
    }

    return null;
  };

  return (
    <WalletConnectionGuard requireWallet={true}>
      <div className="min-h-screen flex flex-col bg-background pb-20">
        <DashboardHeader />
        
        <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate('/withdraw')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Withdraw to Wallet</h1>
          </div>

          {/* Network Status Alert - only shown when needed */}
          {getNetworkStatusAlert()}

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
              <Label htmlFor="recipient">Recipient Address</Label>
              <Input
                id="recipient"
                placeholder="0x..."
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Make sure the address is correct. Transactions cannot be reversed.
              </p>
            </div>

            <Button 
              onClick={handleWithdraw} 
              className="w-full" 
              disabled={isProcessing || !amount || !recipientAddress}
            >
              {isProcessing ? "Processing..." : "Withdraw"}
            </Button>
          </div>
        </main>

        <BottomNavigation />
      </div>
    </WalletConnectionGuard>
  );
};

export default WithdrawWallet;
