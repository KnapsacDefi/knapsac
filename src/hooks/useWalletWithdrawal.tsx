
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
  token: {
    symbol: string;
    address: string;
    chain: string;
    decimals: number;
  };
  amount: string;
  recipientAddress: string;
  balance: string;
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
  
  // Enhanced network management with validation
  const { isCorrectNetwork, currentChain, isValidating } = useNetworkManager(
    token.chain as 'celo' | 'ethereum' | 'base', 
    step !== 'form'
  );

  const { signMessage } = useSignMessage({
    onSuccess: (signature) => {
      console.log('Message signed successfully:', signature);
      if (isCorrectNetwork) {
        handleTokenTransfer();
      } else {
        toast({
          title: "Network Error",
          description: `Please switch to ${token.chain} network to continue`,
          variant: "destructive"
        });
        setStep('form');
        setIsProcessing(false);
      }
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
    // Validate amount
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive"
      });
      return false;
    }

    if (parseFloat(amount) > parseFloat(balance)) {
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

    // Check network validation is complete
    if (isValidating) {
      toast({
        title: "Please Wait",
        description: "Validating network connection...",
      });
      return;
    }

    // Check if on correct network
    if (!isCorrectNetwork) {
      toast({
        title: "Wrong Network",
        description: `Please switch to ${token.chain} network to continue`,
        variant: "destructive"
      });
      return;
    }

    const walletAddress = wallets[0]?.address;
    setIsProcessing(true);
    setStep('signing');

    try {
      // Validate and checksum the recipient address
      const validatedRecipientAddress = checksumAddress(recipientAddress);

      // Create transaction record
      const transactionData = {
        wallet_address: walletAddress,
        transaction_type: 'withdrawal_wallet',
        token_symbol: token.symbol,
        chain: token.chain,
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
      const message = `Authorize withdrawal of ${amount} ${token.symbol} to ${validatedRecipientAddress}\n\nTimestamp: ${new Date().toISOString()}`;
      
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
  };

  const handleTokenTransfer = async () => {
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
        description: `Send ${amount} ${token.symbol} to ${validatedRecipientAddress.slice(0, 6)}...${validatedRecipientAddress.slice(-4)}`,
        buttonText: "Confirm Withdrawal"
      };

      sendTransaction({
        to: token.address as `0x${string}`,
        data: transferData,
        uiOptions
      });

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
