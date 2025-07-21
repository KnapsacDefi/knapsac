
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

// Service wallet address for mobile money transfers
const SERVICE_WALLET_ADDRESS = '0x742d35Cc8385A81b8770c4Cc5a2c3d20F2Bd9c7B';

interface UseMobileMoneyWithdrawalProps {
  token: {
    symbol: string;
    address: string;
    chain: string;
    decimals: number;
  };
  amount: string;
  phoneNumber: string;
  selectedCurrency: string;
  selectedNetwork: string;
  conversionRate: number;
  localAmount: string;
  balance: string;
}

export const useMobileMoneyWithdrawal = ({
  token,
  amount,
  phoneNumber,
  selectedCurrency,
  selectedNetwork,
  conversionRate,
  localAmount,
  balance
}: UseMobileMoneyWithdrawalProps) => {
  const { wallets } = useWallets();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'form' | 'signing' | 'transferring'>('form');
  
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
      console.log('Token transfer successful:', txHash);
      
      // Update transaction with hash and process mobile money
      try {
        const { error: updateError } = await supabase.functions.invoke('update-withdrawal', {
          body: {
            transactionId: currentTransactionId,
            transactionHash: txHash,
            status: 'processing'
          }
        });

        if (updateError) {
          console.error('Error updating transaction:', updateError);
        }

        // Process mobile money transfer
        await processMobileMoneyTransfer(txHash);

      } catch (error) {
        console.error('Error in mobile money processing:', error);
        toast({
          title: "Error",
          description: "Token transfer succeeded but mobile money processing failed",
          variant: "destructive"
        });
        setStep('form');
        setIsProcessing(false);
      }
    },
    onError: (error) => {
      console.error('Token transfer failed:', error);
      toast({
        title: "Transaction Failed",
        description: error.message || "Token transfer was rejected or failed",
        variant: "destructive"
      });
      setStep('form');
      setIsProcessing(false);
    }
  });

  let currentTransactionId: string;

  const formatPhoneNumber = (input: string) => {
    const digits = input.replace(/\D/g, '');
    if (digits.length > 0 && !digits.startsWith('233')) {
      return `+233${digits}`;
    }
    return `+${digits}`;
  };

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

      currentTransactionId = transaction.id;

      // Create authorization message
      const message = `Authorize mobile money withdrawal of ${amount} ${token.symbol} to ${formattedPhone}\n\nReceive: ${localAmount} ${selectedCurrency}\nNetwork: ${selectedNetwork}\nRate: 1 ${token.symbol} = ${conversionRate} ${selectedCurrency}\n\nTimestamp: ${new Date().toISOString()}`;
      
      // Sign the message
      signMessage(message);

    } catch (error) {
      console.error('Mobile money withdrawal setup error:', error);
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
    setStep('transferring');

    try {
      const amountInWei = parseUnits(amount, token.decimals);
      
      const transferData = encodeFunctionData({
        abi: erc20Abi,
        functionName: 'transfer',
        args: [SERVICE_WALLET_ADDRESS as `0x${string}`, amountInWei],
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

  const processMobileMoneyTransfer = async (txHash: string) => {
    try {
      const walletAddress = wallets[0]?.address;
      const formattedPhone = formatPhoneNumber(phoneNumber);

      const { data: transferResult, error: transferError } = await supabase.functions.invoke('process-mobile-money-transfer', {
        body: {
          transactionId: currentTransactionId,
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

    } catch (error) {
      console.error('Mobile money processing error:', error);
      toast({
        title: "Error",
        description: error.message || "Mobile money processing failed",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setStep('form');
    }
  };

  return {
    handleWithdraw,
    isProcessing,
    step
  };
};
