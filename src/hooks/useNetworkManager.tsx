
import { useEffect, useState } from 'react';
import { useWallets, usePrivy } from '@privy-io/react-auth';
import { toast } from '@/hooks/use-toast';
import { getChainIdFromName, getChainNameFromId } from '@/utils/withdrawalValidation';
import { SupportedChain } from '@/constants/tokens';

interface RetryConfig {
  attempts: number;
  maxAttempts: number;
  delay: number;
}

export const useNetworkManager = (targetChain: SupportedChain, shouldSwitch: boolean = true) => {
  const { wallets } = useWallets();
  const { user, authenticated } = usePrivy();
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const [currentChain, setCurrentChain] = useState<SupportedChain | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [retryConfig, setRetryConfig] = useState<RetryConfig>({ attempts: 0, maxAttempts: 3, delay: 1000 });

  // Get active wallet - handle inconsistent wallet state
  const getActiveWallet = () => {
    // Try wallets array first
    if (wallets && wallets.length > 0 && wallets[0]?.address) {
      return wallets[0];
    }
    
    // Fallback: if authenticated but wallets array is empty, wait for wallet state to stabilize
    if (authenticated && user?.wallet?.address && (!wallets || wallets.length === 0)) {
      console.log('Wallet state inconsistency detected - wallets array empty but user has wallet address');
      return null; // Return null to trigger retry
    }
    
    return null;
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  useEffect(() => {
    if (!shouldSwitch) return;

    const validateAndSwitchNetwork = async () => {
      setIsValidating(true);
      
      try {
        const activeWallet = getActiveWallet();
        
        // If wallet state is inconsistent, wait and retry
        if (!activeWallet && authenticated && retryConfig.attempts < retryConfig.maxAttempts) {
          console.log(`Wallet state not ready, retrying in ${retryConfig.delay}ms (attempt ${retryConfig.attempts + 1}/${retryConfig.maxAttempts})`);
          await sleep(retryConfig.delay);
          setRetryConfig(prev => ({ 
            ...prev, 
            attempts: prev.attempts + 1, 
            delay: Math.min(prev.delay * 1.5, 5000) // Exponential backoff, max 5s
          }));
          return; // This will trigger another useEffect run
        }

        // Reset retry config on successful wallet detection
        if (activeWallet) {
          setRetryConfig({ attempts: 0, maxAttempts: 3, delay: 1000 });
        }

        if (!activeWallet) {
          console.log('No active wallet found');
          setIsCorrectNetwork(false);
          setIsValidating(false);
          return;
        }

        // Get current chain ID
        const currentChainId = parseInt(activeWallet.chainId);
        const currentChainName = getChainNameFromId(currentChainId);
        setCurrentChain(currentChainName);

        // Check if we're on the correct network
        const targetChainId = getChainIdFromName(targetChain);
        const isCorrect = currentChainId === targetChainId;
        setIsCorrectNetwork(isCorrect);

        // If not on correct network, attempt to switch
        if (!isCorrect) {
          console.log(`Current chain: ${currentChainName} (${currentChainId}), Target: ${targetChain} (${targetChainId})`);
          
          try {
            await activeWallet.switchChain(targetChainId);
            
            // Verify the switch was successful
            const newChainId = parseInt(activeWallet.chainId);
            if (newChainId === targetChainId) {
              toast({
                title: "Network Switched",
                description: `Successfully switched to ${targetChain} network.`,
              });
              
              setIsCorrectNetwork(true);
              setCurrentChain(targetChain);
            } else {
              throw new Error('Network switch verification failed');
            }
          } catch (switchError) {
            console.error(`Failed to switch to ${targetChain}:`, switchError);
            
            // Check if it's a user rejection or technical error
            const errorMessage = switchError?.message || switchError?.toString() || '';
            const isUserRejection = errorMessage.toLowerCase().includes('user') || 
                                   errorMessage.toLowerCase().includes('rejected') ||
                                   errorMessage.toLowerCase().includes('denied');
            
            toast({
              title: isUserRejection ? "Network Switch Cancelled" : "Network Switch Required",
              description: isUserRejection 
                ? `Network switch was cancelled. Please manually switch to ${targetChain} network to continue.`
                : `Please manually switch to ${targetChain} network in your wallet to continue.`,
              variant: "destructive"
            });
            
            setIsCorrectNetwork(false);
          }
        }
      } catch (error) {
        console.error(`Network validation error:`, error);
        setIsCorrectNetwork(false);
      } finally {
        setIsValidating(false);
      }
    };

    validateAndSwitchNetwork();
  }, [wallets, targetChain, shouldSwitch, authenticated, user, retryConfig.attempts]);

  return {
    isCorrectNetwork,
    currentChain,
    isValidating,
    targetChain
  };
};
