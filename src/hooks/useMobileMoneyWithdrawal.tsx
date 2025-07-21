
import { useState } from 'react';
import { useWallets, useSignMessage, useSendTransaction } from '@privy-io/react-auth';
import { encodeFunctionData, parseUnits } from 'viem';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNetworkManager } from './useNetworkManager';
import { validateTokenForChain, checksumAddress } from '@/utils/withdrawalValidation';
import { RECIPIENT_ADDRESS } from '@/constants/tokens';

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
      console.log('Token transfer successful:', txHash);
      
      try {
        const { error: updateError } = await supabase.functions.invoke('update-withdrawal', {
          body: {
            transactionId: currentTransactionId,
            transactionHash: txHash.hash,
            status: 'processing'
          }
        });

        if (updateError) {
          console.error('Error updating transaction:', updateError);
        }

        // Process mobile money transfer
        await processMobileMoneyTransfer(txHash.hash);

      } catch (error) {
        console.error('Error in mobile money processing:', error);
        toast({
          title: "Processing Error",
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
        description: error.toString() || "Token transfer was rejected or failed",
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

  const validateMobileMoneyInputs = (): boolean => {
    // Validate basic inputs
    if (!amount || !selectedCurrency || !phoneNumber || !selectedNetwork || !conversionRate) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return false;
    }

    // Validate amount
    if (parseFloat(amount) <= 0) {
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

    // Validate phone number format
    const formattedPhone = formatPhoneNumber(phoneNumber);
    if (formattedPhone.length < 10) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid phone number",
        variant: "destructive"
      });
      return false;
    }

    // Validate conversion rate
    if (conversionRate <= 0) {
      toast({
        title: "Invalid Rate",
        description: "Unable to get valid conversion rate. Please try again.",
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
    if (!validateMobileMoneyInputs()) {
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
      signMessage({ message });

    } catch (error) {
      console.error('Mobile money withdrawal setup error:', error);
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
    setStep('transferring');

    try {
      const amountInWei = parseUnits(amount, token.decimals);
      const validatedRecipientAddress = checksumAddress(RECIPIENT_ADDRESS);
      
      const transferData = encodeFunctionData({
        abi: erc20Abi,
        functionName: 'transfer',
        args: [validatedRecipientAddress as `0x${string}`, amountInWei],
      });

      const formattedPhone = formatPhoneNumber(phoneNumber);
      const uiOptions = {
        title: "Confirm Mobile Money Transfer",
        description: `Send ${amount} ${token.symbol} to receive ${localAmount} ${selectedCurrency} at ${formattedPhone}`,
        buttonText: "Confirm Transfer"
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
        title: "Processing Error",
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
    step,
    isCorrectNetwork,
    currentChain,
    isValidating
  };
};
