import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useWalletValidation } from "./useWalletValidation";
import { useProfileCreation } from "./useProfileCreation";
import { UseTermsAcceptanceProps } from "@/types/terms";

export const useTermsAcceptance = ({ profileType, termsContent }: UseTermsAcceptanceProps) => {
  const { toast } = useToast();
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    walletAddress,
    hasWallet,
    walletReady,
    privyReady,
    connectionError,
    ensureWalletConnection,
  } = useWalletValidation();

  const { createProfile } = useProfileCreation({
    profileType,
    termsContent,
    walletAddress: walletAddress!,
  });

  const handleAccept = async () => {
    if (!agreed) {
      toast({
        title: "Agreement Required",
        description: "Please check the agreement box to proceed.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await ensureWalletConnection();
      await createProfile();
    } catch (error: any) {
      console.error("Terms acceptance failed:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to initiate signing. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  return {
    agreed,
    setAgreed,
    isSubmitting,
    handleAccept,
    walletAddress,
    hasWallet,
    walletReady,
    privyReady,
    connectionError,
  };
};