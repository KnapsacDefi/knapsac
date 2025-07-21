
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Wallet2, AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import DashboardHeader from '@/components/DashboardHeader';
import BottomNavigation from '@/components/BottomNavigation';
import { useWalletWithdrawal } from '@/hooks/useWalletWithdrawal';

const WithdrawWallet = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const { token, balance } = location.state || {};
  
  const [amount, setAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');

  if (!token) {
    navigate('/withdraw');
    return null;
  }

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

  if (step === 'confirming') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-sm mx-auto">
          <CardContent className="pt-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold mb-2">Confirming Transaction</h3>
            <p className="text-muted-foreground">
              Your withdrawal is being processed on the blockchain. This may take a few minutes.
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
          <h1 className="text-2xl font-bold">Withdraw to Wallet</h1>
        </div>

        {/* Network Status Alert */}
        {isValidating && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Validating network connection...
            </AlertDescription>
          </Alert>
        )}

        {!isValidating && !isCorrectNetwork && (
          <Alert className="mb-4" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please switch to {token.chain} network in your wallet to continue.
              {currentChain && ` Currently on: ${currentChain}`}
            </AlertDescription>
          </Alert>
        )}

        {!isValidating && isCorrectNetwork && (
          <Alert className="mb-4">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Connected to {token.chain} network ✓
            </AlertDescription>
          </Alert>
        )}

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
            disabled={isProcessing || !amount || !recipientAddress || isValidating || !isCorrectNetwork}
          >
            {isProcessing ? "Processing..." : "Withdraw"}
          </Button>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default WithdrawWallet;
