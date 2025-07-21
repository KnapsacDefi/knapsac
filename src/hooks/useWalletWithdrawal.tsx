
import { useState } from 'react';
import { useWallets, useSignMessage, useSendTransaction } from '@privy-io/react-auth';
import { encodeFunctionData, parseUnits } from 'viem';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNetworkManager } from './useNetworkManager';
import { validateAddress, checksumAddress, validateTokenForChain } from '@/utils/withdrawalValidation';
import { debugLog } from '@/utils/debugConfig';

const erc20Abi = [
  {
    name: 'transfer',
    type: 'function',
    inputs: [
      {name: 'to', type: 'address'},
      {name: 'value', type: 'uint256'},
    ],
    outputs: [{name: '', type: 'bool'}],
    stateMutability: 'nonpayable',
  },
] as const;

interface UseWalletWithdrawalProps {
  token?: {
    symbol: string;
    address: string;
    chain: string;
    decimals: number;
  } | null;
  amount: string;
  recipientAddress: string;
  balance?: string;
}

export const useWalletWithdrawal = ({
  token,
  amount,
  recipientAddress,
  balance
}: UseWalletWithdrawalProps) => {
  const { wallets } = useWallets();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'form' | 'signing' | 'confirming'>('form');
  const [shouldValidateNetwork, setShouldValidateNetwork] = useState(false);
  
  // Only trigger network validation when explicitly requested
  const { isCorrectNetwork, currentChain, isValidating } = useNetworkManager(
    token?.chain as 'celo' | 'ethereum' | 'base' || 'ethereum', 
    shouldValidateNetwork
  );

  const { signMessage } = useSignMessage({
    onSuccess: (signature) => {
      debugLog('WITHDRAWAL', 'Message signed successfully:', signature);
      
      // Proceed directly with token transfer after successful signing
      handleTokenTransfer();
    },
    onError: (error) => {
      console.error('Message signing failed:', error);
      toast({
        title: "Signing Failed",
        description: "Message signing was cancelled or failed",
        variant: "destructive"
      });
      setStep('form');
      setIsProcessing(false);
      setShouldValidateNetwork(false);
    }
  });

  const { sendTransaction } = useSendTransaction({
    onSuccess: async (txHash) => {
      debugLog('WITHDRAWAL', 'Transaction successful:', txHash);
      
      try {
        const { error: updateError } = await supabase.functions.invoke('update-withdrawal', {
          body: {
            transactionId: currentTransactionId,
            transactionHash: txHash,
            status: 'completed'
          }
        });

        if (updateError) {
          console.error('Error updating transaction:', updateError);
        }

        toast({
          title: "Success",
          description: "Withdrawal completed successfully"
        });
      } catch (error) {
        console.error('Error updating transaction:', error);
      }
      
      setIsProcessing(false);
      setStep('form');
      setShouldValidateNetwork(false);
    },
    onError: (error) => {
      console.error('Transaction failed:', error);
      toast({
        title: "Transaction Failed",
        description: error.toString() || "Transaction was rejected or failed",
        variant: "destructive"
      });
      setStep('form');
      setIsProcessing(false);
      setShouldValidateNetwork(false);
    }
  });

  let currentTransactionId: string;

  const validateWithdrawalInputs = (): boolean => {
    if (!token) {
      toast({
        title: "Missing Token",
        description: "Token information is not available",
        variant: "destructive"
      });
      return false;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive"
      });
      return false;
    }

    if (balance && parseFloat(amount) > parseFloat(balance)) {
      toast({
        title: "Insufficient Balance",
        description: "Amount exceeds available balance",
        variant: "destructive"
      });
      return false;
    }

    if (!recipientAddress) {
      toast({
        title: "Missing Recipient",
        description: "Please enter a recipient address",
        variant: "destructive"
      });
      return false;
    }

    if (!validateAddress(recipientAddress)) {
      toast({
        title: "Invalid Address",
        description: "Please enter a valid wallet address",
        variant: "destructive"
      });
      return false;
    }

    if (!validateTokenForChain(token.address, token.chain as any)) {
      toast({
        title: "Invalid Token",
        description: `Token ${token.symbol} is not supported on ${token.chain} network`,
        variant: "destructive"
      });
      return false;
    }

    const walletAddress = wallets[0]?.address;
    if (!walletAddress) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to continue",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleWithdraw = async () => {
    console.log('🚀 Starting withdrawal process...', {
      token: token?.symbol,
      amount,
      recipient: recipientAddress,
      currentChain,
      targetChain: token?.chain
    });

    if (!validateWithdrawalInputs()) {
      return;
    }

    setIsProcessing(true);
    
    // Validate network FIRST before proceeding with any signing
    setShouldValidateNetwork(true);

    // Wait for network validation to complete
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Check if network validation is still in progress
    if (isValidating) {
      toast({
        title: "Network Check",
        description: "Checking network connection, please wait...",
      });
      setIsProcessing(false);
      setShouldValidateNetwork(false);
      return;
    }

    // Check if we're on the correct network
    if (!isCorrectNetwork) {
      const currentNetworkDisplay = currentChain || 'Unknown';
      const targetNetworkDisplay = token?.chain || 'target';
      
      toast({
        title: "Wrong Network",
        description: `Currently connected to ${currentNetworkDisplay} network. Please switch to ${targetNetworkDisplay} network in your wallet and try again.`,
        variant: "destructive"
      });
      setIsProcessing(false);
      setShouldValidateNetwork(false);
      return;
    }

    // Network is correct, proceed with signing
    const walletAddress = wallets[0]?.address;
    setStep('signing');

    try {
      const validatedRecipientAddress = checksumAddress(recipientAddress);

      const transactionData = {
        wallet_address: walletAddress,
        transaction_type: 'withdrawal_wallet',
        token_symbol: token!.symbol,
        chain: token!.chain,
        amount: parseFloat(amount),
        recipient_address: validatedRecipientAddress,
        status: 'pending'
      };

      console.log('📄 Creating withdrawal transaction record...', transactionData);

      const { data: transaction, error: createError } = await supabase.functions.invoke('create-withdrawal', {
        body: transactionData
      });

      if (createError) {
        throw createError;
      }

      currentTransactionId = transaction.id;

      // Create formatted message for withdrawal authorization
      const message = `Authorize withdrawal of ${amount} ${token!.symbol}\n\nRecipient: ${validatedRecipientAddress}\nChain: ${token!.chain}\nTimestamp: ${new Date().toISOString()}`;
      
      // Add Privy UI options for better user experience
      const uiOptions = {
        title: 'Authorize Withdrawal',
        description: `Please sign this message to authorize the withdrawal of ${amount} ${token!.symbol} to the specified recipient address. This signature does not cost any gas fees.`,
        buttonText: 'Sign & Authorize'
      };

      console.log('🎯 Initiating withdrawal authorization...', { 
        walletAddress, 
        token: token!.symbol,
        amount,
        recipient: validatedRecipientAddress,
        message,
        uiOptions 
      });

      // Use Privy's signMessage with UI options
      signMessage(
        { message },
        { uiOptions }
      );

    } catch (error) {
      console.error('Withdrawal setup error:', error);
      toast({
        title: "Setup Error",
        description: error.message || "Failed to setup withdrawal",
        variant: "destructive"
      });
      setStep('form');
      setIsProcessing(false);
      setShouldValidateNetwork(false);
    }
  };

  const handleTokenTransfer = async () => {
    if (!token) return;
    
    setStep('confirming');

    try {
      const amountInWei = parseUnits(amount, token.decimals);
      const validatedRecipientAddress = checksumAddress(recipientAddress);
      
      const transferData = encodeFunctionData({
        abi: erc20Abi,
        functionName: 'transfer',
        args: [validatedRecipientAddress as `0x${string}`, amountInWei],
      });

      const uiOptions = {
        title: "Confirm Withdrawal",
        description: `Send ${amount || '0'} ${token?.symbol || 'TOKEN'} to ${validatedRecipientAddress.slice(0, 6)}...${validatedRecipientAddress.slice(-4)}`,
        buttonText: "Confirm Withdrawal"
      };

      console.log('💸 Initiating token transfer...', {
        token: token.symbol,
        amount,
        recipient: validatedRecipientAddress,
        amountInWei: amountInWei.toString()
      });

      sendTransaction({
        to: token.address as `0x${string}`,
        data: transferData,
        uiOptions
      } as any);

    } catch (error) {
      console.error('Token transfer error:', error);
      toast({
        title: "Transfer Error",
        description: "Failed to initiate token transfer",
        variant: "destructive"
      });
      setStep('form');
      setIsProcessing(false);
      setShouldValidateNetwork(false);
    }
  };

  return {
    handleWithdraw,
    isProcessing,
    step,
    isCorrectNetwork: shouldValidateNetwork ? isCorrectNetwork : true,
    currentChain,
    isValidating: shouldValidateNetwork ? isValidating : false
  };
};
