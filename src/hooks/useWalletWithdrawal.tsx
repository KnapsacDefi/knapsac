
import { useState } from 'react';
import { useWallets, useSignMessage, useSendTransaction } from '@privy-io/react-auth';
import { encodeFunctionData, parseUnits } from 'viem';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNetworkManager } from './useNetworkManager';
import { validateAddress, checksumAddress, validateTokenForChain } from '@/utils/withdrawalValidation';

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
  
  // Enhanced network management - switch when starting withdrawal process
  const { isCorrectNetwork, currentChain, isValidating } = useNetworkManager(
    token?.chain as 'celo' | 'ethereum' | 'base' || 'ethereum', 
    step === 'signing' && !!token // Only switch when we're in signing step
  );

  const { signMessage } = useSignMessage({
    onSuccess: (signature) => {
      console.log('Message signed successfully:', signature);
      // Check network status before proceeding
      setTimeout(() => {
        if (isCorrectNetwork) {
          handleTokenTransfer();
        } else {
          toast({
            title: "Network Error",
            description: `Please switch to ${token?.chain || 'the correct'} network to continue`,
            variant: "destructive"
          });
          setStep('form');
          setIsProcessing(false);
        }
      }, 500); // Brief delay to let network switching complete
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
    }
  });

  const { sendTransaction } = useSendTransaction({
    onSuccess: async (txHash) => {
      console.log('Transaction successful:', txHash);
      
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
    }
  });

  let currentTransactionId: string;

  const validateWithdrawalInputs = (): boolean => {
    // Check if token is available
    if (!token) {
      toast({
        title: "Missing Token",
        description: "Token information is not available",
        variant: "destructive"
      });
      return false;
    }

    // Validate amount
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

    // Validate recipient address
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

    // Validate token contract for current chain
    if (!validateTokenForChain(token.address, token.chain as any)) {
      toast({
        title: "Invalid Token",
        description: `Token ${token.symbol} is not supported on ${token.chain} network`,
        variant: "destructive"
      });
      return false;
    }

    // Validate wallet connection
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
    // Validate all inputs first
    if (!validateWithdrawalInputs()) {
      return;
    }

    // Check if still validating - but with timeout
    if (isValidating) {
      console.log('Network validation in progress, proceeding with timeout...');
      
      // Give validation max 3 seconds then proceed anyway
      setTimeout(() => {
        if (isValidating) {
          console.log('⚠️ Network validation timeout - proceeding anyway');
        }
      }, 3000);
      
      toast({
        title: "Please Wait",
        description: "Validating network connection...",
      });
      return;
    }

    const walletAddress = wallets[0]?.address;
    setIsProcessing(true);
    setStep('signing'); // This will trigger network switching

    // Shorter timeout for network switching - be more responsive
    setTimeout(async () => {
      try {
        // Validate and checksum the recipient address
        const validatedRecipientAddress = checksumAddress(recipientAddress);

        // Create transaction record
        const transactionData = {
          wallet_address: walletAddress,
          transaction_type: 'withdrawal_wallet',
          token_symbol: token!.symbol,
          chain: token!.chain,
          amount: parseFloat(amount),
          recipient_address: validatedRecipientAddress,
          status: 'pending'
        };

        const { data: transaction, error: createError } = await supabase.functions.invoke('create-withdrawal', {
          body: transactionData
        });

        if (createError) {
          throw createError;
        }

        currentTransactionId = transaction.id;

        // Create authorization message
        const message = `Authorize withdrawal of ${amount} ${token!.symbol} to ${validatedRecipientAddress}\n\nTimestamp: ${new Date().toISOString()}`;
        
        // Sign the message
        signMessage({ message });

      } catch (error) {
        console.error('Withdrawal setup error:', error);
        toast({
          title: "Setup Error",
          description: error.message || "Failed to setup withdrawal",
          variant: "destructive"
        });
        setStep('form');
        setIsProcessing(false);
      }
    }, 300); // Reduced from 1000ms to 300ms for faster response
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
    }
  };

  return {
    handleWithdraw,
    isProcessing,
    step,
    isCorrectNetwork,
    currentChain,
    isValidating
  };
};
