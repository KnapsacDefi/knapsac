
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGoodDollarSDK } from '@/hooks/useGoodDollarSDK';
import { useAccount, usePublicClient } from 'wagmi';
import { toast } from '@/hooks/use-toast';

export const GoodDollarTestButtons = () => {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { 
    initializeClaimSDK, 
    initializeIdentitySDK,
    checkIdentityVerification,
    checkClaimEligibility,
    claimGoodDollar,
    claiming,
    checking
  } = useGoodDollarSDK();
  
  const [testResults, setTestResults] = useState<any>({});
  const [loading, setLoading] = useState<string | null>(null);

  const checkEntitlement = async () => {
    if (!address || !publicClient) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet first.",
        variant: "destructive"
      });
      return;
    }

    setLoading('entitlement');
    try {
      const claimSDK = await initializeClaimSDK();
      if (!claimSDK) {
        throw new Error('Failed to initialize ClaimSDK');
      }

      const entitlement = await claimSDK.checkEntitlement(publicClient);
      const result = {
        entitlement: entitlement.toString(),
        canClaim: entitlement > 0n,
        timestamp: new Date().toISOString()
      };
      
      setTestResults(prev => ({ ...prev, entitlement: result }));
      
      toast({
        title: "Entitlement Check Complete",
        description: `Entitlement: ${entitlement.toString()} G$`,
      });
    } catch (error: any) {
      console.error('Entitlement check error:', error);
      setTestResults(prev => ({ ...prev, entitlement: { error: error.message } }));
      
      toast({
        title: "Entitlement Check Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(null);
    }
  };

  const claimUBI = async () => {
    if (!address) {
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

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>GoodDollar SDK Test Buttons</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Button 
            onClick={checkIdentity}
            disabled={loading === 'identity'}
            variant="outline"
          >
            {loading === 'identity' ? 'Checking...' : 'Check Identity'}
          </Button>
          
          <Button 
            onClick={checkEligibility}
            disabled={loading === 'eligibility' || checking}
            variant="outline"
          >
            {loading === 'eligibility' || checking ? 'Checking...' : 'Check Eligibility'}
          </Button>
          
          <Button 
            onClick={checkEntitlement}
            disabled={loading === 'entitlement'}
            variant="outline"
          >
            {loading === 'entitlement' ? 'Checking...' : 'Check Entitlement'}
          </Button>
          
          <Button 
            onClick={claimUBI}
            disabled={loading === 'claim' || claiming}
            className="bg-green-500 hover:bg-green-600"
          >
            {loading === 'claim' || claiming ? 'Claiming...' : 'Claim UBI'}
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
