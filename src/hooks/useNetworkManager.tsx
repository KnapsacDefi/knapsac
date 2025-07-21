
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

  // Enhanced wallet detection with validation
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

  // Validate chain ID and parse safely
  const parseChainId = (chainId: string | undefined): number | null => {
    if (!chainId || chainId === 'undefined' || chainId === 'null') {
      console.warn('Invalid chainId received:', chainId);
      return null;
    }
    
    const parsed = parseInt(chainId, 10);
    if (isNaN(parsed) || parsed <= 0) {
      console.warn('Failed to parse chainId:', chainId, 'Result:', parsed);
      return null;
    }
    
    return parsed;
  };

  // Enhanced network detection with multiple fallback methods
  const detectCurrentNetwork = (wallet: any): { chainId: number | null; chainName: SupportedChain | null } => {
    console.log('Detecting network for wallet:', wallet?.address);
    
    // Method 1: Direct chainId property
    let chainId = parseChainId(wallet?.chainId);
    if (chainId) {
      console.log('✅ Detected chainId from wallet.chainId:', chainId);
      return { chainId, chainName: getChainNameFromId(chainId) };
    }
    
    // Method 2: Try wallet.chain.id if available
    if (wallet?.chain?.id) {
      chainId = parseChainId(wallet.chain.id.toString());
      if (chainId) {
        console.log('✅ Detected chainId from wallet.chain.id:', chainId);
        return { chainId, chainName: getChainNameFromId(chainId) };
      }
    }
    
    // Method 3: Try wallet.networkVersion
    if (wallet?.networkVersion) {
      chainId = parseChainId(wallet.networkVersion);
      if (chainId) {
        console.log('✅ Detected chainId from wallet.networkVersion:', chainId);
        return { chainId, chainName: getChainNameFromId(chainId) };
      }
    }
    
    console.warn('❌ Failed to detect valid chainId from wallet:', {
      chainId: wallet?.chainId,
      chainName: wallet?.chain?.id,
      networkVersion: wallet?.networkVersion
    });
    
    return { chainId: null, chainName: null };
  };

  // Async network switch verification with polling
  const verifyNetworkSwitch = async (wallet: any, targetChainId: number, maxAttempts: number = 5): Promise<boolean> => {
    console.log(`🔄 Starting network switch verification for chainId: ${targetChainId}`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`📡 Verification attempt ${attempt}/${maxAttempts}`);
      
      // Wait for wallet state to update
      await sleep(1000 * attempt); // Increasing delay: 1s, 2s, 3s, etc.
      
      const { chainId } = detectCurrentNetwork(wallet);
      
      if (chainId === targetChainId) {
        console.log(`✅ Network switch verified successfully on attempt ${attempt}`);
        return true;
      }
      
      console.log(`⏳ Verification attempt ${attempt} failed. Current: ${chainId}, Target: ${targetChainId}`);
    }
    
    console.error(`❌ Network switch verification failed after ${maxAttempts} attempts`);
    return false;
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
          setCurrentChain(null);
          setIsValidating(false);
          return;
        }

        // Enhanced network detection
        const { chainId: currentChainId, chainName: currentChainName } = detectCurrentNetwork(activeWallet);
        
        if (!currentChainId) {
          console.error('Unable to detect current network - wallet may not be properly connected');
          setIsCorrectNetwork(false);
          setCurrentChain(null);
          setIsValidating(false);
          
          toast({
            title: "Network Detection Failed",
            description: "Unable to detect current network. Please check your wallet connection.",
            variant: "destructive"
          });
          return;
        }

        setCurrentChain(currentChainName);

        // Check if we're on the correct network
        const targetChainId = getChainIdFromName(targetChain);
        const isCorrect = currentChainId === targetChainId;
        setIsCorrectNetwork(isCorrect);

        console.log(`Network status: Current=${currentChainName} (${currentChainId}), Target=${targetChain} (${targetChainId}), IsCorrect=${isCorrect}`);

        // If not on correct network, attempt to switch
        if (!isCorrect) {
          try {
            console.log(`🔄 Attempting to switch from ${currentChainName} (${currentChainId}) to ${targetChain} (${targetChainId})`);
            
            await activeWallet.switchChain(targetChainId);
            console.log('📡 Switch chain command sent, starting verification...');
            
            // Verify the switch was successful with polling
            const switchSuccessful = await verifyNetworkSwitch(activeWallet, targetChainId);
            
            if (switchSuccessful) {
              toast({
                title: "Network Switched",
                description: `Successfully switched to ${targetChain} network.`,
              });
              
              setIsCorrectNetwork(true);
              setCurrentChain(targetChain);
            } else {
              throw new Error('Network switch verification failed - wallet may not have switched networks');
            }
          } catch (switchError) {
            console.error(`❌ Failed to switch to ${targetChain}:`, switchError);
            
            // Enhanced error handling
            const errorMessage = switchError?.message || switchError?.toString() || '';
            const isUserRejection = errorMessage.toLowerCase().includes('user') || 
                                   errorMessage.toLowerCase().includes('rejected') ||
                                   errorMessage.toLowerCase().includes('denied') ||
                                   errorMessage.toLowerCase().includes('cancelled');
            
            const isUnsupportedNetwork = errorMessage.toLowerCase().includes('unsupported') ||
                                        errorMessage.toLowerCase().includes('not supported');
            
            let title = "Network Switch Required";
            let description = `Please manually switch to ${targetChain} network in your wallet to continue.`;
            
            if (isUserRejection) {
              title = "Network Switch Cancelled";
              description = `Network switch was cancelled. Please manually switch to ${targetChain} network to continue.`;
            } else if (isUnsupportedNetwork) {
              title = "Network Not Supported";
              description = `Your wallet may not support ${targetChain} network. Please add it manually or use a different wallet.`;
            }
            
            toast({
              title,
              description,
              variant: "destructive"
            });
            
            setIsCorrectNetwork(false);
          }
        }
      } catch (error) {
        console.error(`💥 Network validation error:`, error);
        setIsCorrectNetwork(false);
        setCurrentChain(null);
        
        toast({
          title: "Network Error",
          description: "Failed to validate network connection. Please try again.",
          variant: "destructive"
        });
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
