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
  token?: {
    symbol: string;
    address: string;
    chain: string;
    decimals: number;
  } | null;
  amount: string;
  phoneNumber: string;
  selectedCurrency: string;
  selectedNetwork: string;
  conversionRate: number;
  localAmount: string;
  balance?: string;
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
  const [step, setStep] = useState<'form' | 'transferring'>('form');
  const [shouldValidateNetwork, setShouldValidateNetwork] = useState(false);
  
  // Validate network when explicitly requested
  const { isCorrectNetwork, currentChain, isValidating } = useNetworkManager(
    token?.chain as 'celo' | 'ethereum' | 'base' || 'ethereum', 
    shouldValidateNetwork
  );

  const { signMessage } = useSignMessage({
    onSuccess: (signature) => {
      console.log('Message signed successfully:', signature);
      // Proceed directly to token transfer after successful signing
      handleTokenTransfer();
    },
    onError: (error) => {
      console.error('Message signing failed:', error);
      toast({
        title: "Signing Failed",
        description: "Message signing was cancelled or failed",
        variant: "destructive"
      });
      setIsProcessing(false);
      setShouldValidateNetwork(false);
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
        setShouldValidateNetwork(false);
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
      setShouldValidateNetwork(false);
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
    if (!token) {
      toast({
        title: "Missing Token",
        description: "Token information is not available",
        variant: "destructive"
      });
      return false;
    }

    if (!amount || !selectedCurrency || !phoneNumber || !selectedNetwork || !conversionRate) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return false;
    }

    if (parseFloat(amount) <= 0) {
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

    const formattedPhone = formatPhoneNumber(phoneNumber);
    if (formattedPhone.length < 10) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid phone number",
        variant: "destructive"
      });
      return false;
    }

    if (conversionRate <= 0) {
      toast({
        title: "Invalid Rate",
        description: "Unable to get valid conversion rate. Please try again.",
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
    if (!validateMobileMoneyInputs()) {
      return;
    }

    setIsProcessing(true);
    
    setShouldValidateNetwork(true);
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (isValidating) {
      toast({
        title: "Network Check",
        description: "Checking network connection, please wait...",
      });
      setIsProcessing(false);
      setShouldValidateNetwork(false);
      return;
    }

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

    const walletAddress = wallets[0]?.address;

    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);

      const transactionData = {
        wallet_address: walletAddress,
        transaction_type: 'withdrawal_mobile_money',
        token_symbol: token!.symbol,
        chain: token!.chain,
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

      const message = `Authorize mobile money withdrawal of ${amount} ${token!.symbol} to ${formattedPhone}\n\nReceive: ${localAmount} ${selectedCurrency}\nNetwork: ${selectedNetwork}\nRate: 1 ${token!.symbol} = ${conversionRate} ${selectedCurrency}\n\nTimestamp: ${new Date().toISOString()}`;
      
      const uiOptions = {
        title: 'Authorize Mobile Money Withdrawal',
        description: `Please sign this message to authorize the mobile money withdrawal of ${amount} ${token!.symbol}. This signature does not cost any gas fees.`,
        buttonText: 'Sign & Authorize'
      };

      signMessage({ message }, { uiOptions });

    } catch (error) {
      console.error('Mobile money withdrawal setup error:', error);
      toast({
        title: "Setup Error",
        description: error.message || "Failed to setup withdrawal",
        variant: "destructive"
      });
      setIsProcessing(false);
      setShouldValidateNetwork(false);
    }
  };

  const handleTokenTransfer = async () => {
    if (!token) return;
    
    setStep('transferring');

    try {
      const amountInWei = parseUnits(amount, token.decimals);
      const validatedRecipientAddress = checksumAddress(RECIPIENT_ADDRESS);
      
      const transferData = encodeFunctionData({
        abi: erc20Abi,
        functionName: 'transfer',
        args: [validatedRecipientAddress as `0x${string}`, amountInWei],
      });

      const formattedPhone = formatPhoneNumber(phoneNumber || '');
      const uiOptions = {
        title: "Confirm Mobile Money Transfer",
        description: `Send ${amount || '0'} ${token?.symbol || 'TOKEN'} to receive ${localAmount || '0'} ${selectedCurrency || 'CURRENCY'} at ${formattedPhone}`,
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
      setShouldValidateNetwork(false);
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
      setShouldValidateNetwork(false);
    }
  };

  return {
    handleWithdraw,
    isProcessing,
    step,
    isCorrectNetwork: shouldValidateNetwork ? isCorrectNetwork : true,
    currentChain,
    isValidating: shouldValidateNetwork ? isValidating : false,
    showNetworkStatus: shouldValidateNetwork && step === 'transferring'
  };
};
