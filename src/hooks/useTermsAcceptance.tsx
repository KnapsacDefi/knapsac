
import { useState } from "react";
import { usePrivy, useSignMessage, useWallets } from "@privy-io/react-auth";
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
  const { wallets } = useWallets();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userEmail = user?.email?.address;
  // Try multiple wallet detection methods for better compatibility
  const walletAddress = wallets[0]?.address || user?.wallet?.address;

  const handleAccept = async () => {
    console.log('🔄 Starting T&C acceptance process...');
    console.log('🔄 Profile type:', profileType);
    console.log('🔄 Agreed status:', agreed);
    console.log('🔄 Wallets available:', wallets.length);
    console.log('🔄 Wallet addresses:', wallets.map(w => w.address));
    console.log('🔄 User wallet from user object:', user?.wallet?.address);
    console.log('🔄 User email:', userEmail);
    console.log('🔄 Final wallet address used:', walletAddress);
    console.log('🔄 User authentication state:', { 
      isAuthenticated: !!user, 
      hasEmail: !!userEmail, 
      hasWallets: wallets.length > 0,
      hasWalletAddress: !!walletAddress 
    });

    if (!agreed) {
      console.log('❌ User has not agreed to terms');
      toast({
        title: "Agreement Required",
        description: "Please check the agreement box to proceed.",
        variant: "destructive",
      });
      return;
    }

    if (!userEmail) {
      console.log('❌ Missing user email');
      toast({
        title: "Missing Email",
        description: "Please ensure your email is verified.",
        variant: "destructive",
      });
      return;
    }

    if (wallets.length === 0) {
      console.log('❌ No wallets connected');
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to continue.",
        variant: "destructive",
      });
      return;
    }

    if (!walletAddress) {
      console.log('❌ Wallet address not available');
      toast({
        title: "Wallet Error",
        description: "Unable to access wallet address. Please try reconnecting your wallet.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const message = `I agree to the Knapsac Terms and Conditions for ${profileType} profile:\n\n${termsContent}\n\nTimestamp: ${new Date().toISOString()}`;
      console.log('📝 Preparing message for signing...');
      
      const uiOptions = {
        title: `You are signing Terms and Conditions for ${profileType} profile`
      };
      console.log('⚙️ UI options:', uiOptions);

      console.log('🚀 Calling signMessage for T&C...');
      const { signature } = await signMessage(
        { message }, 
        { uiOptions }
      );
      console.log('✅ T&C signature received successfully');
      
      // Create hash of the signed message
      console.log('🔄 Creating hash...');
      const encoder = new TextEncoder();
      const data = encoder.encode(message + signature);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      console.log('✅ Hash created successfully');

      // Create profile with signed terms
      console.log('🔄 Inserting profile to database...');

      const { error } = await supabase
        .from('profiles')
        .insert({
          user_email: userEmail,
          crypto_address: walletAddress,
          profile_type: profileType,
          signed_terms_hash: hashHex,
        });

      if (error) {
        console.error('❌ Database insert error:', error);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log('✅ Profile created successfully');
      toast({
        title: "Profile Created!",
        description: "Your profile has been successfully created.",
      });

      // Navigate based on profile type
      console.log('🔄 Navigating based on profile type:', profileType);
      if (profileType === "Service Provider") {
        console.log('🔄 Navigating to service-provider-motivation');
        navigate('/service-provider-motivation');
      } else if (profileType === "Startup") {
        console.log('🔄 Navigating to subscription');
        navigate('/subscription');
      } else {
        console.log('🔄 Navigating to wallet');
        navigate('/wallet');
      }
    } catch (error: any) {
      console.error('❌ Exception in handleAccept:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error message:', error?.message);
      console.error('❌ Error stack:', error?.stack);
      console.error('❌ Full error object:', JSON.stringify(error, null, 2));
      
      toast({
        title: "Error",
        description: error.message || "Failed to accept terms. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      console.log('🔄 T&C acceptance process finished');
    }
  };

  return {
    agreed,
    setAgreed,
    isSubmitting,
    handleAccept,
  };
};
