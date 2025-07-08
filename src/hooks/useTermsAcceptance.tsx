import { useState } from "react";
import { usePrivy, useSignMessage, useWallets } from "@privy-io/react-auth";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { profileService } from "@/services/profileService";

interface UseTermsAcceptanceProps {
  profileType: "Startup" | "Lender" | "Service Provider";
  termsContent: string;
}

export const useTermsAcceptance = ({ profileType, termsContent }: UseTermsAcceptanceProps) => {
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const { signMessage } = useSignMessage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAccept = async () => {
    if (!agreed) {
      toast({
        title: "Agreement Required",
        description: "Please check the agreement box to proceed.",
        variant: "destructive",
      });
      return;
    }

    // Simple wallet check - let Privy handle the rest
    const walletAddress = wallets[0]?.address || user?.wallet?.address;
    if (!walletAddress) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to continue.",
        variant: "destructive",
      });
      return;
    }

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
      
      // Use Privy's signMessage directly - no retry logic needed
      const result = await signMessage({ message });
      const signedTermsHash = await profileService.createSignedTermsHash(message, result.signature);

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
      
      // Simple error handling
      if (error?.message?.includes('User rejected') || error?.message?.includes('rejected')) {
        toast({
          title: "Signing Cancelled",
          description: "You need to sign the terms to continue. Please try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to accept terms. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Simple wallet validation for UI
  const walletAddress = wallets[0]?.address || user?.wallet?.address;
  const hasWallet = !!walletAddress;

  return {
    agreed,
    setAgreed,
    isSubmitting,
    handleAccept,
    walletAddress,
    hasWallet,
  };
};