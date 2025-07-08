import { useSignMessage } from "@privy-io/react-auth";
import { usePrivyConnection } from "@/hooks/usePrivyConnection";

export interface SigningOptions {
  maxRetries?: number;
  baseDelay?: number;
  timeout?: number;
}

export const useMessageSigning = () => {
  const { signMessage } = useSignMessage();
  const { connectionQuality, forceWalletReconnect } = usePrivyConnection();

  const signMessageWithRetry = async (
    message: string, 
    options: SigningOptions = {}
  ): Promise<string> => {
    const { 
      maxRetries = 5, 
      baseDelay = 1000, 
      timeout = 15000 
    } = options;

    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        console.log(`Signing attempt ${retryCount + 1}/${maxRetries}`);
        
        // Pre-signing connection verification  
        if (connectionQuality === 'failed') {
          throw new Error('Wallet connection failed. Please reconnect.');
        }
        
        // Add small delay to ensure iframe is ready
        if (retryCount > 0) {
          await new Promise(resolve => setTimeout(resolve, baseDelay * retryCount));
        }
        
        // Attempt to sign with timeout
        const signPromise = signMessage({ message });
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Signing timeout')), timeout)
        );
        
        const result = await Promise.race([signPromise, timeoutPromise]) as any;
        console.log("Message signed successfully");
        return result.signature;
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
        const delay = (baseDelay * Math.pow(2, retryCount)) + (Math.random() * 1000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error('Maximum signing attempts reached');
  };

  return {
    signMessageWithRetry,
  };
};