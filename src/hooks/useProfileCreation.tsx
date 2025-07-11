import { usePrivy, useSignMessage } from "@privy-io/react-auth";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { profileService } from "@/services/profileService";

interface UseProfileCreationProps {
  profileType: "Startup" | "Lender" | "Service Provider";
  termsContent: string;
  walletAddress: string;
}

export const useProfileCreation = ({ profileType, termsContent, walletAddress }: UseProfileCreationProps) => {
  const { user } = usePrivy();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { signMessage } = useSignMessage({
    onSuccess: async (data) => {
      console.log('Signature successful:', data.signature);
      try {
        const message = `I agree to the Knapsac Terms and Conditions for ${profileType} profile:\n\nTimestamp: ${new Date().toISOString()}`;
        const signedTermsHash = await profileService.createSignedTermsHash(message, data.signature);

        // Use secure profile service with wallet signature authentication
        // Pass the original message that was actually signed
        await profileService.createProfile({
          userEmail: user?.email?.address,
          walletAddress: walletAddress!,
          profileType,
          signedTermsHash,
        }, data.signature, message);

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
      }
    },
    onError: (error) => {
      console.error("Message signing failed:", error);
      
      const errorString = error?.toString() || '';
      
      if (errorString.includes('User rejected') || errorString.includes('rejected')) {
        toast({
          title: "Signing Cancelled",
          description: "You need to sign the terms to continue. Please try again.",
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
          title: "Signing Failed",
          description: "Failed to sign terms. Please try again.",
          variant: "destructive",
        });
      }
    }
  });

  const createProfile = async () => {
    const message = `I agree to the Knapsac Terms and Conditions for ${profileType} profile:\n\nTimestamp: ${new Date().toISOString()}`;
   
    const uiOptions = {
      title: 'Accept Terms & Conditions',
      description: 'Please sign this message to accept the terms and create your profile. This does not cost any gas.',
      buttonText: 'Sign & Create Profile'
    };

    console.log('Initiating message signing...', { walletAddress });

    // Use Privy's signMessage with UI options - callbacks handle success/error
    signMessage(
      { message },
      { uiOptions }
    );
  };

  return {
    createProfile,
  };
};