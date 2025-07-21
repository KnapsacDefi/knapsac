
import { useState } from 'react';
import { useWallets, useSignMessage, useSendTransaction } from '@privy-io/react-auth';
import { encodeFunctionData, parseUnits } from 'viem';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNetworkManager } from './useNetworkManager';

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
  
  // Network switching
  useNetworkManager(token.chain as 'celo' | 'ethereum', step !== 'form');

  const { signMessage } = useSignMessage({
    onSuccess: (signature) => {
      console.log('Message signed successfully:', signature);
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
    }
  });

  const { sendTransaction } = useSendTransaction({
    onSuccess: async (txHash) => {
      console.log('Transaction successful:', txHash);
      
      // Update transaction record with hash
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

  const handleWithdraw = async () => {
    if (!amount || !recipientAddress) {
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

    const walletAddress = wallets[0]?.address;
    if (!walletAddress) {
      toast({
        title: "Error",
        description: "No wallet connected",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setStep('signing');

    try {
      // Create transaction record
      const transactionData = {
        wallet_address: walletAddress,
        transaction_type: 'withdrawal_wallet',
        token_symbol: token.symbol,
        chain: token.chain,
        amount: parseFloat(amount),
        recipient_address: recipientAddress,
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
      const message = `Authorize withdrawal of ${amount} ${token.symbol} to ${recipientAddress}\n\nTimestamp: ${new Date().toISOString()}`;
      
      // Sign the message
      signMessage({ message });

    } catch (error) {
      console.error('Withdrawal setup error:', error);
      toast({
        title: "Error",
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
      
      const transferData = encodeFunctionData({
        abi: erc20Abi,
        functionName: 'transfer',
        args: [recipientAddress as `0x${string}`, amountInWei],
      });

      sendTransaction({
        to: token.address as `0x${string}`,
        data: transferData,
      });

    } catch (error) {
      console.error('Token transfer error:', error);
      toast({
        title: "Error",
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
    step
  };
};
