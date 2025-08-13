import { useState, useCallback } from 'react';
import { useWallets, useSignMessage, useSendTransaction } from '@privy-io/react-auth';
import { encodeFunctionData, parseUnits } from 'viem';
import { useToast } from '@/hooks/use-toast';
import { useNetworkManager } from './useNetworkManager';
import { validateAddress, checksumAddress, validateTokenForChain } from '@/utils/withdrawalValidation';
import { usePortfolio } from './usePortfolio';

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

interface UseLendingTransactionProps {
  pool?: any;
  token?: {
    symbol: string;
    address: string;
    chain: string;
    decimals: number;
  } | null;
  amount: string;
  lendingPeriod: number;
  balance?: string;
  onSuccess?: () => void;
}

export const useLendingTransaction = ({
  pool,
  token,
  amount,
  lendingPeriod,
  balance,
  onSuccess
}: UseLendingTransactionProps) => {
  const { wallets } = useWallets();
  const { toast } = useToast();
  const { createPortfolioEntry } = usePortfolio();
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'form' | 'confirming'>('form');
  
  const { 
    isCorrectNetwork, 
    currentChain, 
    isValidating, 
    isSwitching, 
    switchError, 
    retryNetworkSwitch 
  } = useNetworkManager(
    token?.chain as 'celo' | 'ethereum' | 'base' || 'ethereum', 
    true
  );

  const resetForm = useCallback(() => {
    onSuccess?.();
  }, [onSuccess]);

  const { signMessage } = useSignMessage({
    onSuccess: (signature) => {
      console.log('Lending message signed successfully:', signature);
      handleTokenTransfer();
    },
    onError: (error) => {
      console.error('Lending message signing failed:', error);
      toast({
        title: "Signing Failed",
        description: "Message signing was cancelled or failed",
        variant: "destructive"
      });
      setIsProcessing(false);
    }
  });

  const { sendTransaction } = useSendTransaction({
    onSuccess: async (txHash) => {
      console.log('Lending transaction successful:', txHash);
      
      try {
        // Create portfolio entry after successful transaction
        await createPortfolioEntry({
          lending_pool_id: pool.id,
          lend_amount: parseFloat(amount),
          lend_token: token!.symbol,
          chain: token!.chain,
          lend_period: lendingPeriod,
          lend_transaction_hash: txHash.hash,
          recipient_address: pool.recipient_address
        });

        toast({
          title: "Success",
          description: "Lending completed successfully! Portfolio entry created."
        });

        resetForm();
        
      } catch (error) {
        console.error('Error creating portfolio entry:', error);
        toast({
          title: "Transaction Successful",
          description: "Lending completed but portfolio update failed. Please contact support.",
          variant: "destructive"
        });
      }
      
      setIsProcessing(false);
      setStep('form');
    },
    onError: (error) => {
      console.error('Lending transaction failed:', error);
      toast({
        title: "Transaction Failed",
        description: error.toString() || "Transaction was rejected or failed",
        variant: "destructive"
      });
      setStep('form');
      setIsProcessing(false);
    }
  });

  const validateLendingInputs = (): boolean => {
    if (!pool) {
      toast({
        title: "Missing Pool",
        description: "Lending pool information is not available",
        variant: "destructive"
      });
      return false;
    }

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

    if (!validateAddress(pool.recipient_address)) {
      toast({
        title: "Invalid Recipient",
        description: "Pool recipient address is invalid",
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

    // Validate lending period
    if (lendingPeriod < pool.min_lend_period || lendingPeriod > pool.max_lend_period) {
      toast({
        title: "Invalid Lending Period",
        description: `Lending period must be between ${pool.min_lend_period} and ${pool.max_lend_period} days`,
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleLend = async () => {
    console.log('🚀 Starting lending process...', {
      pool: pool?.id,
      token: token?.symbol,
      amount,
      lendingPeriod,
      currentChain,
      targetChain: token?.chain
    });

    if (!validateLendingInputs()) {
      return;
    }

    setIsProcessing(true);
    
    if (isValidating || isSwitching) {
      console.log('Waiting for network validation/switching to complete...');
      return;
    }

    if (!isCorrectNetwork) {
      console.log('Wrong network detected, automatic switching should be triggered by useNetworkManager');
      setIsProcessing(false);
      return;
    }

    const walletAddress = wallets[0]?.address;

    try {
      const validatedRecipientAddress = checksumAddress(pool.recipient_address);

      const message = `Authorize lending of ${amount} ${token!.symbol}\n\nRecipient: ${validatedRecipientAddress}\nLending Pool: ${pool.id}\nPeriod: ${lendingPeriod} days\nChain: ${token!.chain}\nTimestamp: ${new Date().toISOString()}`;
      
      const uiOptions = {
        title: 'Authorize Lending',
        description: `Please sign this message to authorize lending ${amount} ${token!.symbol} to the selected pool. This signature does not cost any gas fees.`,
        buttonText: 'Sign & Authorize'
      };

      console.log('🎯 Initiating lending authorization...', { 
        walletAddress, 
        token: token!.symbol,
        amount,
        recipient: validatedRecipientAddress,
        message,
        uiOptions 
      });

      signMessage(
        { message },
        { uiOptions }
      );

    } catch (error) {
      console.error('Lending setup error:', error);
      toast({
        title: "Setup Error",
        description: error.message || "Failed to setup lending",
        variant: "destructive"
      });
      setIsProcessing(false);
    }
  };

  const handleTokenTransfer = async () => {
    console.log('🔄 Starting token transfer process...', {
      token: token?.symbol,
      tokenAddress: token?.address,
      amount,
      poolId: pool?.id,
      recipientAddress: pool?.recipient_address,
      decimals: token?.decimals
    });

    if (!token) {
      console.error('❌ Token is missing');
      toast({
        title: "Transfer Error",
        description: "Token information is missing",
        variant: "destructive"
      });
      setStep('form');
      setIsProcessing(false);
      return;
    }

    if (!pool) {
      console.error('❌ Pool is missing');
      toast({
        title: "Transfer Error", 
        description: "Pool information is missing",
        variant: "destructive"
      });
      setStep('form');
      setIsProcessing(false);
      return;
    }
    
    setStep('confirming');

    // Step 1: Validate and parse amount
    console.log('🔍 Step 1: Validating and parsing amount...', {
      amount,
      decimals: token.decimals,
      type: typeof amount
    });

    let amountInWei;
    try {
      if (!amount || amount === '0' || parseFloat(amount) <= 0) {
        throw new Error(`Invalid amount: ${amount}`);
      }
      
      // Convert amount to string if it's a number
      const amountStr = String(amount);
      amountInWei = parseUnits(amountStr, token.decimals);
      console.log('✅ Amount parsed successfully:', {
        originalAmount: amount,
        decimals: token.decimals,
        amountInWei: amountInWei.toString()
      });
    } catch (error) {
      console.error('❌ Amount parsing failed:', {
        error: error.message,
        amount,
        decimals: token.decimals
      });
      toast({
        title: "Transfer Error",
        description: `Failed to parse amount: ${error.message}`,
        variant: "destructive"
      });
      setStep('form');
      setIsProcessing(false);
      return;
    }

    // Step 2: Validate recipient address
    console.log('🔍 Step 2: Validating recipient address...', {
      rawAddress: pool.recipient_address
    });

    let validatedRecipientAddress;
    try {
      if (!validateAddress(pool.recipient_address)) {
        throw new Error(`Invalid recipient address format: ${pool.recipient_address}`);
      }
      
      validatedRecipientAddress = checksumAddress(pool.recipient_address);
      console.log('✅ Recipient address validated:', {
        original: pool.recipient_address,
        checksumed: validatedRecipientAddress
      });
    } catch (error) {
      console.error('❌ Recipient address validation failed:', {
        error: error.message,
        address: pool.recipient_address
      });
      toast({
        title: "Transfer Error",
        description: `Invalid recipient address: ${error.message}`,
        variant: "destructive"
      });
      setStep('form');
      setIsProcessing(false);
      return;
    }

    // Step 3: Validate token address
    console.log('🔍 Step 3: Validating token address...', {
      tokenAddress: token.address,
      chain: token.chain
    });

    try {
      if (!validateAddress(token.address)) {
        throw new Error(`Invalid token address format: ${token.address}`);
      }

      if (!validateTokenForChain(token.address, token.chain as any)) {
        throw new Error(`Token ${token.symbol} (${token.address}) is not supported on ${token.chain} network`);
      }

      console.log('✅ Token address validated:', {
        address: token.address,
        chain: token.chain,
        symbol: token.symbol
      });
    } catch (error) {
      console.error('❌ Token address validation failed:', {
        error: error.message,
        tokenAddress: token.address,
        chain: token.chain
      });
      toast({
        title: "Transfer Error",
        description: `Token validation failed: ${error.message}`,
        variant: "destructive"
      });
      setStep('form');
      setIsProcessing(false);
      return;
    }

    // Step 4: Encode transfer function data
    console.log('🔍 Step 4: Encoding transfer function data...', {
      function: 'transfer',
      args: [validatedRecipientAddress, amountInWei.toString()]
    });

    let transferData;
    try {
      transferData = encodeFunctionData({
        abi: erc20Abi,
        functionName: 'transfer',
        args: [validatedRecipientAddress as `0x${string}`, amountInWei],
      });
      
      console.log('✅ Transfer data encoded successfully:', {
        dataLength: transferData.length,
        dataPreview: transferData.slice(0, 20) + '...'
      });
    } catch (error) {
      console.error('❌ Function data encoding failed:', {
        error: error.message,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [validatedRecipientAddress, amountInWei.toString()]
      });
      toast({
        title: "Transfer Error",
        description: `Failed to encode transfer data: ${error.message}`,
        variant: "destructive"
      });
      setStep('form');
      setIsProcessing(false);
      return;
    }

    // Step 5: Prepare transaction
    console.log('🔍 Step 5: Preparing transaction...', {
      to: token.address,
      data: transferData,
      token: token.symbol,
      amount: `${amount} ${token.symbol}`,
      recipient: validatedRecipientAddress
    });

    const uiOptions = {
      title: "Confirm Lending",
      description: `Send ${amount} ${token.symbol} to lending pool`,
      buttonText: "Confirm Lending"
    };

    // Step 6: Send transaction
    try {
      console.log('💸 Sending transaction...', {
        to: token.address,
        dataLength: transferData.length,
        uiOptions
      });

      sendTransaction({
        to: token.address as `0x${string}`,
        data: transferData,
        uiOptions
      } as any);

      console.log('✅ Transaction initiated successfully');

    } catch (error) {
      console.error('❌ Transaction initiation failed:', {
        error: error.message,
        errorDetails: error,
        to: token.address,
        data: transferData
      });
      
      let userMessage = "Failed to initiate token transfer";
      
      if (error.message.includes('User rejected')) {
        userMessage = "Transaction was cancelled by user";
      } else if (error.message.includes('insufficient funds')) {
        userMessage = "Insufficient funds for transaction";
      } else if (error.message.includes('network')) {
        userMessage = "Network error - please check your connection";
      } else if (error.message.includes('gas')) {
        userMessage = "Gas estimation failed - transaction may fail";
      }

      toast({
        title: "Transfer Error",
        description: userMessage,
        variant: "destructive"
      });
      setStep('form');
      setIsProcessing(false);
    }
  };

  return {
    handleLend,
    isProcessing,
    step,
    isCorrectNetwork,
    currentChain,
    isValidating,
    isSwitching,
    switchError,
    retryNetworkSwitch
  };
};