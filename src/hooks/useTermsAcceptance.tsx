
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

  

    if (!walletAddress) {
      console.log('❌ No wallet address available - wallets detected:', wallets.length);
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to continue.",
        variant: "destructive",
      });
      return;
    }


    setIsSubmitting(true);

    try {
      // Check if profile already exists with this wallet address
      console.log('🔄 Checking for existing profile with wallet address...');
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('*')
        .eq('crypto_address', walletAddress)
        .maybeSingle();

      if (checkError) {
        console.error('❌ Error checking existing profile:', checkError);
        throw new Error('Failed to check existing profile');
      }

      if (existingProfile) {
        console.log('✅ Profile already exists for this wallet address');
        toast({
          title: "Profile Already Exists",
          description: "A profile with this wallet address already exists.",
          variant: "destructive",
        });
        return;
      }

      const message = `I agree to the Knapsac Terms and Conditions for ${profileType} profile:\n\n${termsContent}\n\nTimestamp: ${new Date().toISOString()}`;
      console.log('📝 Preparing message for signing...');
      
      // Check wallet readiness before signing
      const wallet = wallets[0];
      if (!wallet) {
        throw new Error('No wallet available for signing');
      }

      // Verify wallet is connected and ready
      if (!wallet.connectedAt) {
        throw new Error('Wallet is not properly connected');
      }

      console.log('🔍 Wallet readiness check:', {
        hasWallet: !!wallet,
        walletType: wallet?.walletClientType,
        walletConnected: wallet?.connectedAt,
        walletAddress: walletAddress,
        isReady: !!(wallet && wallet.connectedAt)
      });

      // Attempt signing with retry logic
      let retryCount = 0;
      const maxRetries = 3;
      let signature: string;

      while (retryCount < maxRetries) {
        try {
          console.log(`🚀 Signing attempt ${retryCount + 1}/${maxRetries}...`);
          
          // Correct Privy signMessage API usage - pass message as object with proper structure
          const result = await signMessage({ message });
          
          signature = result.signature;
          console.log('✅ T&C signature received successfully');
          break;
        } catch (signError: any) {
          retryCount++;
          console.log(`❌ Signing attempt ${retryCount} failed:`, signError?.message);
          
          if (retryCount >= maxRetries) {
            throw signError;
          }
          
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
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
      
      // Provide specific error handling for different failure scenarios
      let errorTitle = "Error";
      let errorDescription = "Failed to accept terms. Please try again.";
      
      if (error?.message?.includes('User rejected the request')) {
        errorTitle = "Signing Cancelled";
        errorDescription = "You need to sign the terms to continue. Please try again.";
      } else if (error?.message?.includes('Unable to connect to wallet') || error?.message?.includes('wallet')) {
        errorTitle = "Wallet Connection Error";
        errorDescription = "Unable to connect to your wallet. Please check your wallet connection and try again.";
      } else if (error?.message?.includes('timeout')) {
        errorTitle = "Request Timeout";
        errorDescription = "The signing request timed out. Please try again.";
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
