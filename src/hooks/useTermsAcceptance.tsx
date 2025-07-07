
import { useState } from "react";
import { usePrivy, useSignMessage } from "@privy-io/react-auth";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface UseTermsAcceptanceProps {
  profileType: "Startup" | "Lender" | "Service Provider";
  termsContent: string;
}

export const useTermsAcceptance = ({ profileType, termsContent }: UseTermsAcceptanceProps) => {
  const { user } = usePrivy();
  const { signMessage } = useSignMessage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userEmail = user?.email?.address;
  const walletAddress = user?.wallet?.address;

  const handleAccept = async () => {
    if (!agreed) {
      toast({
        title: "Agreement Required",
        description: "Please check the agreement box to proceed.",
        variant: "destructive",
      });
      return;
    }

    if (!userEmail || !walletAddress) {
      toast({
        title: "Missing Information",
        description: "Please ensure your profile is complete and wallet is connected.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const message = `I agree to the Knapsac Terms and Conditions for ${profileType} profile:\n\n${termsContent}\n\nTimestamp: ${new Date().toISOString()}`;
      
      const uiOptions = {
        title: `You are signing Terms and Conditions for ${profileType} profile`
      };

      const { signature } = await signMessage(
        { message }, 
        { uiOptions }
      );
      
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
      console.error('Error accepting terms:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to accept terms. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    agreed,
    setAgreed,
    isSubmitting,
    handleAccept,
  };
};
