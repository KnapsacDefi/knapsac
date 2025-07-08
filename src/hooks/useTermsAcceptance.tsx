import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { usePrivyConnection } from "@/hooks/usePrivyConnection";
import { useWalletValidation } from "@/services/walletValidation";
import { useMessageSigning } from "@/services/messageSigningService";
import { profileService } from "@/services/profileService";

interface UseTermsAcceptanceProps {
  profileType: "Startup" | "Lender" | "Service Provider";
  termsContent: string;
}

export const useTermsAcceptance = ({ profileType, termsContent }: UseTermsAcceptanceProps) => {
  const { user } = usePrivy();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { isWalletReady, connectionQuality, forceWalletReconnect } = usePrivyConnection();
  const { validateCurrentWallet } = useWalletValidation();
  const { signMessageWithRetry } = useMessageSigning();

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
    
    const walletValidation = validateCurrentWallet(user?.wallet);
    
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
      // Check if profile already exists
      const existingProfile = await profileService.checkExistingProfile(walletAddress);
      
      if (existingProfile) {
        toast({
          title: "Profile Already Exists",
          description: "A profile with this wallet address already exists.",
          variant: "destructive",
        });
        return;
      }

      // Create and sign the terms message
      const message = `I agree to the Knapsac Terms and Conditions for ${profileType} profile:\n\n${termsContent}\n\nTimestamp: ${new Date().toISOString()}`;
      console.log("Attempting to sign message with wallet:", walletAddress);

      const signature = await signMessageWithRetry(message);
      const signedTermsHash = await profileService.createSignedTermsHash(message, signature);

      // Create profile
      await profileService.createProfile({
        userEmail: user?.email?.address,
        walletAddress,
        profileType,
        signedTermsHash,
      });

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
  const walletValidation = validateCurrentWallet(user?.wallet);

  return {
    agreed,
    setAgreed,
    isSubmitting,
    handleAccept,
    walletAddress: walletValidation.address,
    hasWallet: walletValidation.isValid,
  };
};