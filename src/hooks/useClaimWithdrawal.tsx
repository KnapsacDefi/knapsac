import { useState, useCallback } from 'react';
import { useSignMessage, useSendTransaction, useWallets } from '@privy-io/react-auth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNetworkManager } from './useNetworkManager';
import { encodeFunctionData, parseUnits } from 'viem';

// ERC20 transfer function ABI
const ERC20_ABI = [
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function'
  }
] as const;

interface UseClaimWithdrawalProps {
  portfolioEntry?: any;
  phoneNumber: string;
  selectedCurrency: string;
  selectedNetwork: string;
  conversionRate: number;
  localAmount: string;
  onSuccess?: () => void;
}

export const useClaimWithdrawal = ({
  portfolioEntry,
  phoneNumber,
  selectedCurrency,
  selectedNetwork,
  conversionRate,
  localAmount,
  onSuccess
}: UseClaimWithdrawalProps) => {
  const { toast } = useToast();
  const { wallets } = useWallets();
  const { signMessage } = useSignMessage();
  const { sendTransaction } = useSendTransaction();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'form' | 'transferring'>('form');
  
  const {
    isCorrectNetwork,
    currentChain,
    isValidating,
    isSwitching,
    switchError,
    retryNetworkSwitch
  } = useNetworkManager(portfolioEntry?.chain);

  const validateClaimInputs = (): boolean => {
    if (!portfolioEntry) {
      toast({
        title: "Error",
        description: "Portfolio entry not found",
        variant: "destructive"
      });
      return false;
    }

    if (!portfolioEntry.is_eligible) {
      toast({
        title: "Not Eligible",
        description: "This position is not yet eligible for claiming",
        variant: "destructive"
      });
      return false;
    }

    if (portfolioEntry.payment_status === 'completed') {
      toast({
        title: "Already Claimed",
        description: "Rewards have already been claimed",
        variant: "destructive"
      });
      return false;
    }

    if (!phoneNumber.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please enter a mobile phone number",
        variant: "destructive"
      });
      return false;
    }

    if (!selectedCurrency) {
      toast({
        title: "Invalid Input", 
        description: "Please select a currency",
        variant: "destructive"
      });
      return false;
    }

    if (!selectedNetwork) {
      toast({
        title: "Invalid Input",
        description: "Please select a mobile network",
        variant: "destructive"
      });
      return false;
    }

    if (conversionRate <= 0) {
      toast({
        title: "Invalid Rate",
        description: "Unable to get conversion rate. Please try again.",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleWithdraw = useCallback(async () => {
    if (!validateClaimInputs()) return;

    if (!wallets[0]) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet to continue",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsProcessing(true);
      setStep('transferring');

      console.log('🎯 Starting claim withdrawal for portfolio entry:', portfolioEntry.id);

      // Create transaction record first
      const { data: transactionData, error: transactionError } = await supabase.functions.invoke('create-withdrawal', {
        body: {
          wallet_address: wallets[0].address,
          transaction_type: 'claim_withdrawal',
          token_symbol: portfolioEntry.lend_token,
          chain: portfolioEntry.chain,
          amount: portfolioEntry.claimable_amount,
          recipient_phone: phoneNumber,
          recipient_currency: selectedCurrency,
          mobile_network: selectedNetwork,
          conversion_rate: conversionRate
        }
      });

      if (transactionError) {
        throw new Error(transactionError.message);
      }

      console.log('Transaction record created:', transactionData);

      // Create withdrawal message for signing
      const withdrawalMessage = `Claim withdrawal of ${portfolioEntry.claimable_amount} ${portfolioEntry.lend_token} to mobile number ${phoneNumber}. Transaction ID: ${transactionData.transaction.id}`;

      // Sign the message
      const signature = await signMessage({ message: withdrawalMessage });
      console.log('Message signed successfully');

      // Transfer the tokens
      await handleTokenTransfer(transactionData.transaction.id);

    } catch (error) {
      console.error('Claim withdrawal error:', error);
      setStep('form');
      toast({
        title: "Withdrawal Failed",
        description: error.message || "Failed to process claim withdrawal",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [portfolioEntry, phoneNumber, selectedCurrency, selectedNetwork, conversionRate, wallets, signMessage, toast]);

  const handleTokenTransfer = async (transactionId: string) => {
    try {
      console.log('Starting token transfer for claim...');
      
      // Use the recipient address from the portfolio entry
      const recipientAddress = portfolioEntry.recipient_address;
      
      console.log('Transfer details:', {
        to: recipientAddress,
        amount: portfolioEntry.claimable_amount,
        token: portfolioEntry.lend_token,
        chain: portfolioEntry.chain
      });

      // Get token details for the transaction
      const tokenDecimals = 18; // Default to 18 decimals for most tokens
      const transferAmount = parseUnits(portfolioEntry.claimable_amount.toString(), tokenDecimals);

      // Encode the transfer data
      const transferData = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [recipientAddress as `0x${string}`, transferAmount]
      });

      // Send the transaction
      const transactionHash = await sendTransaction({
        to: portfolioEntry.token_address as `0x${string}`, // Token contract address
        data: transferData,
        value: BigInt(0)
      });

      console.log('Token transfer successful:', transactionHash.hash);

      // Process the mobile money transfer
      await processMobileMoneyTransfer(transactionHash.hash, transactionId);

    } catch (error) {
      console.error('Token transfer failed:', error);
      throw new Error(`Token transfer failed: ${error.message}`);
    }
  };

  const processMobileMoneyTransfer = async (transactionHash: string, transactionId: string) => {
    try {
      console.log('Processing mobile money transfer for claim...');
      
      const { data, error } = await supabase.functions.invoke('process-mobile-money-transfer', {
        body: {
          transaction_id: transactionId,
          transaction_hash: transactionHash,
          amount: localAmount,
          currency: selectedCurrency,
          phone_number: phoneNumber,
          mobile_network: selectedNetwork,
          wallet_address: wallets[0].address,
          transaction_type: 'claim_withdrawal'
        }
      });

      if (error) {
        throw error;
      }

      console.log('Mobile money transfer processed:', data);

      // Update portfolio entry to mark as claimed
      const { error: portfolioError } = await supabase.functions.invoke('create-portfolio-entry', {
        body: {
          action: 'update_claim',
          portfolio_id: portfolioEntry.id,
          claim_transaction_hash: transactionHash,
          claim_amount: portfolioEntry.claimable_amount,
          claim_currency: selectedCurrency
        }
      });

      if (portfolioError) {
        console.error('Failed to update portfolio entry:', portfolioError);
      }

      toast({
        title: "Claim Successful",
        description: `Successfully claimed ${portfolioEntry.claimable_amount.toFixed(4)} ${portfolioEntry.lend_token} to mobile money`
      });

      setStep('form');
      onSuccess?.();

    } catch (error) {
      console.error('Mobile money processing failed:', error);
      throw new Error(`Mobile money processing failed: ${error.message}`);
    }
  };

  return {
    handleWithdraw,
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