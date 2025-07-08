import { useState } from "react";
import { usePrivy, useSignMessage, useWallets } from "@privy-io/react-auth";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { validateWallet, logWalletState } from "@/utils/walletValidation";

interface UseTermsAcceptanceProps {
  profileType: "Startup" | "Lender" | "Service Provider";
  termsContent: string;
}

export const useTermsAcceptance = ({ profileType, termsContent }: UseTermsAcceptanceProps) => {
  const { user } = usePrivy();
  const { signMessage } = useSignMessage();
  const { wallets } = useWallets();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userEmail = user?.email?.address;

  const handleAccept = async () => {
    if (!agreed) {
      toast({
        title: "Agreement Required",
        description: "Please check the agreement box to proceed.",
        variant: "destructive",
      });
      return;
    }

    // Validate wallet connection with detailed logging
    logWalletState(wallets, user?.wallet);
    const walletValidation = validateWallet(wallets, user?.wallet);
    
    if (!walletValidation.isValid) {
      console.error("Wallet validation failed:", walletValidation.error);
      toast({
        title: "Wallet Not Connected",
        description: walletValidation.error || "Please connect your wallet to continue.",
        variant: "destructive",
      });
      return;
    }

    const walletAddress = walletValidation.address!;
    setIsSubmitting(true);

    try {
      // Check if profile already exists with this wallet address
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('*')
        .eq('crypto_address', walletAddress)
        .maybeSingle();

      if (checkError) {
        console.error("Database check error:", checkError);
        throw new Error('Failed to check existing profile');
      }

      if (existingProfile) {
        toast({
          title: "Profile Already Exists",
          description: "A profile with this wallet address already exists.",
          variant: "destructive",
        });
        return;
      }

      const message = `I agree to the Knapsac Terms and Conditions for ${profileType} profile:\n\n${termsContent}\n\nTimestamp: ${new Date().toISOString()}`;
      
      console.log("Attempting to sign message with wallet:", walletAddress);

      // Attempt signing with retry logic
      let retryCount = 0;
      const maxRetries = 3;
      let signature: string;

      while (retryCount < maxRetries) {
        try {
          console.log(`Signing attempt ${retryCount + 1}/${maxRetries}`);
          const result = await signMessage({ message });
          signature = result.signature;
          console.log("Message signed successfully");
          break;
        } catch (signError: any) {
          retryCount++;
          console.error(`Signing attempt ${retryCount} failed:`, signError);
          
          if (retryCount >= maxRetries) {
            throw signError;
          }
          
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
      
      // Create hash of the signed message
      const encoder = new TextEncoder();
      const data = encoder.encode(message + signature);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Create profile with signed terms
      const { error } = await supabase
        .from('profiles')
        .insert({
          user_email: userEmail,
          crypto_address: walletAddress,
          profile_type: profileType,
          signed_terms_hash: hashHex,
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Profile Created!",
        description: "Your profile has been successfully created.",
      });

      // Navigate based on profile type
      if (profileType === "Service Provider") {
        navigate('/service-provider-motivation');
      } else if (profileType === "Startup") {
        navigate('/subscription');
      } else {
        navigate('/wallet');
      }
    } catch (error: any) {
      console.error("Terms acceptance failed:", error);
      
      // Provide specific error handling for different failure scenarios
      let errorTitle = "Error";
      let errorDescription = "Failed to accept terms. Please try again.";
      
      if (error?.message?.includes('User rejected the request') || error?.message?.includes('rejected')) {
        errorTitle = "Signing Cancelled";
        errorDescription = "You need to sign the terms to continue. Please try again.";
      } else if (error?.message?.includes('Wallet is not properly connected')) {
        errorTitle = "Wallet Connection Error";
        errorDescription = "Please try refreshing the page and reconnecting your wallet.";
      } else if (error?.message?.includes('Unable to connect to wallet') || error?.message?.includes('wallet')) {
        errorTitle = "Wallet Connection Error";
        errorDescription = "Unable to connect to your wallet. Please check your wallet connection and try again.";
      } else if (error?.message?.includes('timeout')) {
        errorTitle = "Request Timeout";
        errorDescription = "The signing request timed out. Please try again.";
      } else if (error?.code === 'SIGNING_ERROR') {
        errorTitle = "Signing Failed";
        errorDescription = "Failed to sign the message. Please ensure your wallet is unlocked and try again.";
      } else if (error?.message) {
        errorDescription = error.message;
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get current wallet validation for UI
  const walletValidation = validateWallet(wallets, user?.wallet);

  return {
    agreed,
    setAgreed,
    isSubmitting,
    handleAccept,
    walletAddress: walletValidation.address,
    hasWallet: walletValidation.isValid,
  };
};