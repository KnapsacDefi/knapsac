import { useState, useEffect } from "react";
import { usePrivy, useSignMessage, useWallets } from "@privy-io/react-auth";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { profileService } from "@/services/profileService";

interface UseTermsAcceptanceProps {
  profileType: "Startup" | "Lender" | "Service Provider";
  termsContent: string;
}

export const useTermsAcceptance = ({ profileType, termsContent }: UseTermsAcceptanceProps) => {
  const { user, ready, connectWallet } = usePrivy();
  const { wallets } = useWallets();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [walletReady, setWalletReady] = useState(false);

  // Check wallet readiness
  useEffect(() => {
    const checkWalletReady = () => {
      const walletAddress = wallets[0]?.address || user?.wallet?.address;
      const isReady = ready && (wallets.length > 0 || user?.wallet?.address) && walletAddress;
      console.log('Wallet readiness check:', { ready, walletsLength: wallets.length, userWallet: !!user?.wallet?.address, walletAddress, isReady });
      setWalletReady(!!isReady);
    };

    checkWalletReady();
  }, [ready, wallets, user?.wallet?.address]);

  const { signMessage } = useSignMessage({
    onSuccess: async (data) => {
      console.log('Signature successful:', data.signature);
      try {
        const walletAddress = wallets[0]?.address || user?.wallet?.address;
        const message = `I agree to the Knapsac Terms and Conditions for ${profileType} profile:\n\n${termsContent}\n\nTimestamp: ${new Date().toISOString()}`;
        const signedTermsHash = await profileService.createSignedTermsHash(message, data.signature);

        // Use secure profile service with wallet signature authentication
        await profileService.createProfile({
          userEmail: user?.email?.address,
          walletAddress: walletAddress!,
          profileType,
          signedTermsHash,
        }, data.signature);

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
        console.error("Profile creation failed:", error);
        
        // Handle specific error cases
        if (error.message?.includes('already exists')) {
          toast({
            title: "Profile Already Exists",
            description: "A profile with this wallet address already exists.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: "Failed to create profile. Please try again.",
            variant: "destructive",
          });
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    onError: (error) => {
      console.error("Message signing failed:", error);
      
      if (error?.toString().includes('User rejected') || error?.toString().includes('rejected')) {
        toast({
          title: "Signing Cancelled",
          description: "You need to sign the terms to continue. Please try again.",
          variant: "destructive",
        });
      } else if (error?.toString().includes('Unable to connect to wallet')) {
        toast({
          title: "Wallet Connection Error",
          description: "Unable to connect to wallet. Please try connecting your wallet first.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Signing Failed",
          description: "Failed to sign terms. Please try again.",
          variant: "destructive",
        });
      }
      setIsSubmitting(false);
    }
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

    // Check if Privy is ready
    if (!ready) {
      toast({
        title: "Please Wait",
        description: "Wallet is still initializing. Please wait a moment.",
        variant: "destructive",
      });
      return;
    }

    // Enhanced wallet check with connection retry
    const walletAddress = wallets[0]?.address || user?.wallet?.address;
    if (!walletAddress || !walletReady) {
      console.log('Wallet not ready, attempting to connect...', { walletAddress, walletReady, walletsLength: wallets.length });
      
      try {
        // Try to connect wallet if not connected
        await connectWallet();
        
        // Wait a moment for wallet to initialize
        setTimeout(() => {
          const newWalletAddress = wallets[0]?.address || user?.wallet?.address;
          if (!newWalletAddress) {
            toast({
              title: "Wallet Not Connected",
              description: "Please connect your wallet to continue.",
              variant: "destructive",
            });
            return;
          }
        }, 1000);
        
      } catch (connectError) {
        console.error('Wallet connection failed:', connectError);
        toast({
          title: "Wallet Connection Failed",
          description: "Unable to connect wallet. Please try again.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Check if profile already exists with secure wallet authentication
      const currentWalletAddress = wallets[0]?.address || user?.wallet?.address;
      if (!currentWalletAddress) {
        toast({
          title: "Wallet Not Ready",
          description: "Wallet address not available. Please try again.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Create a temporary signature for profile check - this will be replaced by the actual terms signature
      const checkMessage = profileService.createSecurityMessage('checkProfile', currentWalletAddress, Date.now());
      
      // For now, we'll skip the existing profile check and let the creation handle duplicates
      // This avoids requiring two signatures from the user
      // The secure edge function will check for duplicates during creation

      // Create and sign the terms message with UI options
      const message = `I agree to the Knapsac Terms and Conditions for ${profileType} profile:\n\n${termsContent}\n\nTimestamp: ${new Date().toISOString()}`;
      
      const uiOptions = {
        title: 'Accept Terms & Conditions',
        description: 'Please sign this message to accept the terms and create your profile. This does not cost any gas.',
        buttonText: 'Sign & Create Profile'
      };

      console.log('Initiating message signing...', { walletAddress: currentWalletAddress, ready, walletReady });

      // Use Privy's signMessage with UI options - callbacks handle success/error
      signMessage(
        { message },
        { uiOptions }
      );
    } catch (error: any) {
      console.error("Terms acceptance setup failed:", error);
      toast({
        title: "Error",
        description: "Failed to initiate signing. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  // Enhanced wallet validation for UI
  const walletAddress = wallets[0]?.address || user?.wallet?.address;
  const hasWallet = !!walletAddress && walletReady;

  return {
    agreed,
    setAgreed,
    isSubmitting,
    handleAccept,
    walletAddress,
    hasWallet,
    walletReady,
    privyReady: ready,
  };
};