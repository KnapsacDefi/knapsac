import { usePrivy, useSignMessage, useSendTransaction, useWallets } from "@privy-io/react-auth";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { subscriptionService } from "@/services/subscriptionService";
import { useRef } from "react";
import { encodeFunctionData } from 'viem';

// An ABI for the ERC-20 transfer function.
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

interface SubscriptionPlan {
  id: string;
  name: string;
  discountedPrice: number;
}

interface UseSubscriptionCreationProps {
  selectedPlan: SubscriptionPlan;
  walletAddress: string;
}

export const useSubscriptionCreation = ({ selectedPlan, walletAddress }: UseSubscriptionCreationProps) => {
  const { user } = usePrivy();
  const { sendTransaction } = useSendTransaction();
  const { wallets } = useWallets();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Use ref to persist the message across renders
  const currentMessageRef = useRef<string>('');
  
  // USDC contract configuration
  const usdcContractAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
  const recipientAddress = '0x9ec14B42b5F4526C518F0021E26C417fa76D710d' as `0x${string}`;

  const { signMessage } = useSignMessage({
    onSuccess: async (data) => {
      console.log('🔐 Subscription authorization successful:', {
        signature: data.signature,
        walletAddress,
        plan: selectedPlan.name
      });
      
      try {
        // Step 2: Send USDC transfer
        const amount = BigInt(selectedPlan.discountedPrice * 1e6);
        
        const transactionData = encodeFunctionData({
          abi: erc20Abi,
          functionName: 'transfer',
          args: [recipientAddress, amount],
        });

        const uiOptions = {
          title: 'Subscribe with USDC',
          description: `You are about to pay ${selectedPlan.discountedPrice} USDC for the ${selectedPlan.name} subscription.`,
          buttonText: 'Confirm Payment',
        };

        const txResult = await sendTransaction(
          {
            to: usdcContractAddress,
            data: transactionData,
            value: 0,
          },
          { uiOptions }
        );

        console.log('💳 USDC transfer successful:', txResult.hash);

        // Step 3: Create subscription with the actual signed message
        const startDate = new Date();
        const endDate = new Date(startDate);
        if (selectedPlan.id === "early_bird") {
          endDate.setFullYear(endDate.getFullYear() + 1);
        } else {
          endDate.setMonth(endDate.getMonth() + 1);
        }

        const subscriptionData = {
          subscriptionType: selectedPlan.id as 'early_bird' | 'standard',
          amountPaid: selectedPlan.discountedPrice,
          transactionHash: txResult.hash,
          endDate: endDate.toISOString()
        };

        // Use the original signed message for subscription creation
        const message = currentMessageRef.current;
        console.log('📝 Creating subscription with signed message:', message);

        await subscriptionService.createSubscription(
          walletAddress, 
          user?.id || '', 
          subscriptionData, 
          data.signature,
          message
        );

        console.log('✅ Subscription creation successful');

        toast({
          title: "Subscription Active!",
          description: `Your ${selectedPlan.name} subscription has been activated successfully.`,
        });

        navigate('/wallet');
      } catch (error: any) {
        console.error("❌ Subscription process failed:", error);
        
        toast({
          title: "Subscription Failed",
          description: error.message || "Failed to process subscription. Please try again.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      console.error("Subscription authorization failed:", error);
      
      const errorString = error?.toString() || '';
      
      if (errorString.includes('User rejected') || errorString.includes('rejected')) {
        toast({
          title: "Authorization Cancelled",
          description: "You need to authorize the subscription to continue. Please try again.",
          variant: "destructive",
        });
      } else if (errorString.includes('Unable to connect to wallet') || 
                 errorString.includes('wallet connection') ||
                 errorString.includes('connect wallet')) {
        toast({
          title: "Wallet Connection Error",
          description: "Unable to connect to wallet. Please ensure your wallet is available and try again.",
          variant: "destructive",
        });
      } else if (errorString.includes('Buffer is not defined')) {
        toast({
          title: "Browser Compatibility Issue",
          description: "Please refresh the page and try again. If the issue persists, try using a different browser.",
          variant: "destructive",
        });
      } else if (errorString.includes('timeout')) {
        toast({
          title: "Connection Timeout",
          description: "The operation timed out. Please try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Authorization Failed",
          description: "Failed to authorize subscription. Please try again.",
          variant: "destructive",
        });
      }
    }
  });

  const createSubscription = async () => {
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please make sure you're logged in.",
        variant: "destructive",
      });
      return;
    }

    // Step 1: Sign authorization message
    const timestamp = new Date().toISOString();
    const message = `Authorize subscription creation for wallet ${walletAddress} - Plan: ${selectedPlan.name} - Amount: ${selectedPlan.discountedPrice} USDC - Timestamp: ${timestamp}`;
    
    // Store the message so the success callback can use the exact same one
    currentMessageRef.current = message;
   
    const uiOptions = {
      title: 'Authorize Subscription',
      description: `Please sign this message to authorize your ${selectedPlan.name} subscription. This does not cost any gas.`,
      buttonText: 'Authorize & Continue'
    };

    console.log('🎯 Initiating subscription authorization...', { 
      walletAddress, 
      plan: selectedPlan.name,
      message,
      messageLength: message.length,
      uiOptions 
    });

    // Use Privy's signMessage with UI options - callbacks handle the rest
    signMessage(
      { message },
      { uiOptions }
    );
  };

  return {
    createSubscription,
  };
};