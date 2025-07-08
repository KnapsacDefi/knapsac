import { useState } from "react";
import { usePrivy, useSignMessage, useWallets } from "@privy-io/react-auth";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { validateWallet, logWalletState } from "@/utils/walletValidation";
import { usePrivyConnection } from "@/hooks/usePrivyConnection";

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
  const { isWalletReady, connectionQuality, forceWalletReconnect } = usePrivyConnection();

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

    // Enhanced wallet validation with connection quality check
    console.log('=== Enhanced Wallet Validation ===');
    console.log('Wallet ready:', isWalletReady);
    console.log('Connection quality:', connectionQuality);
    
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

    // Check wallet readiness and connection quality
    if (!isWalletReady || connectionQuality === 'failed') {
      console.error("Wallet not ready or connection failed");
      toast({
        title: "Wallet Connection Issue", 
        description: "Wallet connection is not stable. Please try reconnecting.",
        variant: "destructive",
      });
      
      // Attempt to reconnect automatically
      setTimeout(() => {
        forceWalletReconnect();
      }, 1000);
      
      return;
    }

    if (connectionQuality === 'poor') {
      console.warn("Poor wallet connection quality, proceeding with caution");
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

      // Enhanced signing with robust retry logic and connection verification
      let retryCount = 0;
      const maxRetries = 5;
      let signature: string;

      while (retryCount < maxRetries) {
        try {
          console.log(`Signing attempt ${retryCount + 1}/${maxRetries}`);
          
          // Pre-signing connection verification  
          if ((connectionQuality as 'good' | 'poor' | 'failed') === 'failed') {
            throw new Error('Wallet connection failed. Please reconnect.');
          }
          
          // Add small delay to ensure iframe is ready
          if (retryCount > 0) {
            await new Promise(resolve => setTimeout(resolve, 1500 * retryCount));
          }
          
          // Attempt to sign with timeout
          const signPromise = signMessage({ message });
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Signing timeout')), 15000)
          );
          
          const result = await Promise.race([signPromise, timeoutPromise]) as any;
          signature = result.signature;
          
          console.log("Message signed successfully");
          break;
        } catch (signError: any) {
          retryCount++;
          console.error(`Signing attempt ${retryCount} failed:`, signError);
          
          // Handle specific error types
          if (signError.message?.includes('timeout') && retryCount < maxRetries) {
            console.log('Signing timed out, retrying with longer timeout...');
            continue;
          }
          
          if (signError.message?.includes('Could not establish connection') && retryCount < maxRetries) {
            console.log('Connection issue detected, attempting wallet reconnection...');
            forceWalletReconnect();
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
          
          if (retryCount >= maxRetries) {
            // Provide specific error based on the type
            if (signError.message?.includes('User rejected')) {
              throw new Error('Signing was cancelled. Please try again and approve the signature request.');
            } else if (signError.message?.includes('timeout')) {
              throw new Error('Signing request timed out. Please ensure your wallet is responsive and try again.');
            } else if (signError.message?.includes('Could not establish connection')) {
              throw new Error('Unable to connect to wallet. Please refresh the page and try again.');
            } else {
              throw signError;
            }
          }
          
          // Exponential backoff with jitter
          const delay = (1000 * Math.pow(2, retryCount)) + (Math.random() * 1000);
          await new Promise(resolve => setTimeout(resolve, delay));
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