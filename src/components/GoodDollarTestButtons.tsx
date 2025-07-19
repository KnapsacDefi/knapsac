
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGoodDollarWagmi } from '@/hooks/useGoodDollarWagmi';
import { toast } from '@/hooks/use-toast';

export const GoodDollarTestButtons = () => {
  const { 
    isWhitelisted,
    checkIdentityVerification,
    checkClaimEligibility,
    claimGoodDollar,
    identityLoading,
    address,
    isConnected
  } = useGoodDollarWagmi();
  
  const [testResults, setTestResults] = useState<any>({});
  const [loading, setLoading] = useState<string | null>(null);

  const checkIdentity = async () => {
    setLoading('identity');
    try {
      const result = await checkIdentityVerification();
      setTestResults(prev => ({ ...prev, identity: result }));
      
      toast({
        title: "Identity Check Complete",
        description: `Verified: ${result.isVerified}, Can Claim: ${result.canClaim}`,
      });
    } catch (error: any) {
      console.error('Identity check error:', error);
      setTestResults(prev => ({ ...prev, identity: { error: error.message } }));
      
      toast({
        title: "Identity Check Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(null);
    }
  };

  const checkEligibility = async () => {
    setLoading('eligibility');
    try {
      const result = await checkClaimEligibility();
      setTestResults(prev => ({ ...prev, eligibility: result }));
      
      toast({
        title: "Eligibility Check Complete",
        description: `Can Claim: ${result.canClaim}, Amount: ${result.amount}`,
      });
    } catch (error: any) {
      console.error('Eligibility check error:', error);
      setTestResults(prev => ({ ...prev, eligibility: { error: error.message } }));
      
      toast({
        title: "Eligibility Check Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(null);
    }
  };

  const claimUBI = async () => {
    if (!isConnected) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet first.",
        variant: "destructive"
      });
      return;
    }

    setLoading('claim');
    try {
      const result = await claimGoodDollar();
      setTestResults(prev => ({ ...prev, claim: result }));
      
      if (result.success) {
        toast({
          title: "Claim Successful!",
          description: `Transaction: ${result.transactionHash}`,
        });
      } else {
        toast({
          title: "Claim Failed",
          description: result.error,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Claim error:', error);
      setTestResults(prev => ({ ...prev, claim: { error: error.message } }));
      
      toast({
        title: "Claim Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>GoodDollar Wagmi SDK Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold mb-2">Current Status:</h4>
          <div className="text-sm space-y-1">
            <div>Connected: {isConnected ? '✅' : '❌'}</div>
            <div>Address: {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'None'}</div>
            <div>Whitelisted: {identityLoading ? '⏳' : (isWhitelisted ? '✅' : '❌')}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Button 
            onClick={checkIdentity}
            disabled={loading === 'identity' || !isConnected}
            variant="outline"
          >
            {loading === 'identity' ? 'Checking...' : 'Check Identity (Wagmi)'}
          </Button>
          
          <Button 
            onClick={checkEligibility}
            disabled={loading === 'eligibility' || !isConnected}
            variant="outline"
          >
            {loading === 'eligibility' ? 'Checking...' : 'Check Eligibility (Wagmi)'}
          </Button>
          
          <Button 
            onClick={claimUBI}
            disabled={loading === 'claim' || !isConnected}
            className="bg-green-500 hover:bg-green-600"
          >
            {loading === 'claim' ? 'Claiming...' : 'Claim UBI (Wagmi)'}
          </Button>
        </div>

        {Object.keys(testResults).length > 0 && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold mb-2">Test Results:</h4>
            <pre className="text-xs overflow-auto max-h-40">
              {JSON.stringify(testResults, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
