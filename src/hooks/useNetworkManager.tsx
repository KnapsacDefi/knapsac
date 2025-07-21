
import { useEffect, useState, useCallback, useRef } from 'react';
import { useWallets, usePrivy } from '@privy-io/react-auth';
import { toast } from '@/hooks/use-toast';
import { getChainIdFromName, getChainNameFromId } from '@/constants/tokens';
import { SupportedChain } from '@/constants/tokens';
import { useWalletProviderHealth } from './useWalletProviderHealth';
import { debugLog } from '@/utils/debugConfig';

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
  const [retryConfig, setRetryConfig] = useState<RetryConfig>({ 
    attempts: 0, 
    maxAttempts: 2, 
    delay: 1000 
  });

  const { health, detectChainId, safeWalletAccess, attemptRecovery } = useWalletProviderHealth();
  
  // Add refs to prevent excessive validation
  const lastValidationRef = useRef<number>(0);
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isValidatingRef = useRef<boolean>(false);

  const getActiveWallet = useCallback(() => {
    if (wallets && wallets.length > 0 && wallets[0]?.address) {
      debugLog('NETWORK_MANAGER', 'Active wallet found:', wallets[0].address);
      return wallets[0];
    }
    
    if (authenticated && user?.wallet?.address && (!wallets || wallets.length === 0)) {
      debugLog('NETWORK_MANAGER', 'Wallet state inconsistency - will retry');
      return null;
    }
    
    debugLog('NETWORK_MANAGER', 'No active wallet available');
    return null;
  }, [wallets, authenticated, user]);

  const detectCurrentNetwork = useCallback(async (wallet: any): Promise<{ chainId: number | null; chainName: SupportedChain | null }> => {
    debugLog('NETWORK_MANAGER', 'Detecting network for wallet:', safeWalletAccess(wallet, 'address'));
    
    try {
      const detectionPromise = detectChainId(wallet);
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => reject(new Error('Chain detection timeout')), 8000);
      });
      
      const chainId = await Promise.race([detectionPromise, timeoutPromise]);
      
      if (chainId && chainId > 0) {
        const chainName = getChainNameFromId(chainId);
        debugLog('NETWORK_MANAGER', 'Network detected successfully:', { chainId, chainName });
        return { chainId, chainName };
      }
      
      debugLog('NETWORK_MANAGER', 'Failed to detect valid chainId from wallet');
      return { chainId: null, chainName: null };
      
    } catch (error) {
      debugLog('NETWORK_MANAGER', 'Network detection error:', error);
      return { chainId: null, chainName: null };
    }
  }, [detectChainId, safeWalletAccess]);

  const verifyNetworkSwitch = useCallback(async (wallet: any, targetChainId: number, maxAttempts: number = 2): Promise<boolean> => {
    debugLog('NETWORK_MANAGER', `Starting network switch verification for chainId: ${targetChainId}`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      debugLog('NETWORK_MANAGER', `Verification attempt ${attempt}/${maxAttempts}`);
      
      const delay = 1500 * attempt;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      try {
        const { chainId } = await detectCurrentNetwork(wallet);
        
        if (chainId === targetChainId) {
          debugLog('NETWORK_MANAGER', `Network switch verified successfully on attempt ${attempt}`);
          return true;
        }
        
        debugLog('NETWORK_MANAGER', `Verification attempt ${attempt} failed. Current: ${chainId}, Target: ${targetChainId}`);
        
      } catch (error) {
        debugLog('NETWORK_MANAGER', `Verification attempt ${attempt} error:`, error);
      }
    }
    
    debugLog('NETWORK_MANAGER', `Network switch verification failed after ${maxAttempts} attempts`);
    return false;
  }, [detectCurrentNetwork]);

  // Validation function that respects shouldSwitch flag
  const validateAndSwitchNetwork = useCallback(async () => {
    // Skip validation entirely if shouldSwitch is false
    if (!shouldSwitch) {
      debugLog('NETWORK_MANAGER', 'Network validation skipped - shouldSwitch is false');
      return;
    }

    const now = Date.now();
    
    // Prevent excessive validations - minimum 3 seconds between validations
    if (now - lastValidationRef.current < 3000) {
      debugLog('NETWORK_MANAGER', 'Validation throttled');
      return;
    }
    
    // Prevent concurrent validations
    if (isValidatingRef.current) {
      debugLog('NETWORK_MANAGER', 'Validation already in progress');
      return;
    }
    
    isValidatingRef.current = true;
    lastValidationRef.current = now;
    setIsValidating(true);
    
    try {
      const activeWallet = getActiveWallet();
      
      if (!activeWallet && authenticated && retryConfig.attempts < retryConfig.maxAttempts) {
        debugLog('NETWORK_MANAGER', `Wallet not ready, retrying... (attempt ${retryConfig.attempts + 1}/${retryConfig.maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, retryConfig.delay));
        setRetryConfig(prev => ({ 
          ...prev, 
          attempts: prev.attempts + 1, 
          delay: Math.min(prev.delay * 1.5, 2000)
        }));
        return;
      }

      // Reset retry config
      if (activeWallet || retryConfig.attempts >= retryConfig.maxAttempts) {
        setRetryConfig({ attempts: 0, maxAttempts: 2, delay: 1000 });
      }

      if (!activeWallet) {
        debugLog('NETWORK_MANAGER', 'No active wallet found after retries');
        setIsCorrectNetwork(false);
        setCurrentChain(null);
        return;
      }

      const { chainId: currentChainId, chainName: currentChainName } = await detectCurrentNetwork(activeWallet);
      
      if (!currentChainId) {
        debugLog('NETWORK_MANAGER', 'Unable to detect current network');
        setIsCorrectNetwork(false);
        setCurrentChain(null);
        
        if (!health.isRecovering && health.lastError?.includes('properties of null')) {
          debugLog('NETWORK_MANAGER', 'Attempting recovery due to serious health issue...');
          setTimeout(attemptRecovery, 2000);
        }
        
        return;
      }

      setCurrentChain(currentChainName);

      const targetChainId = getChainIdFromName(targetChain);
      const isCorrect = currentChainId === targetChainId;
      setIsCorrectNetwork(isCorrect);

      debugLog('NETWORK_MANAGER', `Network status: Current=${currentChainName} (${currentChainId}), Target=${targetChain} (${targetChainId}), IsCorrect=${isCorrect}`);

      if (!isCorrect) {
        debugLog('NETWORK_MANAGER', `Wrong network detected: Currently on ${currentChainName || 'Unknown'} (${currentChainId}), need ${targetChain} (${targetChainId})`);
        
        try {
          debugLog('NETWORK_MANAGER', `Attempting to switch from ${currentChainName} (${currentChainId}) to ${targetChain} (${targetChainId})`);
          
          const switchChainMethod = safeWalletAccess(activeWallet, 'switchChain');
          if (!switchChainMethod || typeof switchChainMethod !== 'function') {
            throw new Error('Wallet does not support network switching');
          }
          
          await switchChainMethod(targetChainId);
          debugLog('NETWORK_MANAGER', 'Switch chain command sent, starting verification...');
          
          const switchSuccessful = await verifyNetworkSwitch(activeWallet, targetChainId);
          
          if (switchSuccessful) {
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
          
          const errorMessage = switchError?.message || switchError?.toString() || '';
          const isUserRejection = errorMessage.toLowerCase().includes('user') || 
                                 errorMessage.toLowerCase().includes('rejected') ||
                                 errorMessage.toLowerCase().includes('denied') ||
                                 errorMessage.toLowerCase().includes('cancelled');
          
          let title = "Network Switch Required";
          let description = `Currently on ${currentChainName || 'Unknown'} network. Please switch to ${targetChain} network in your wallet to continue.`;
          
          if (isUserRejection) {
            title = "Network Switch Cancelled";
            description = `Network switch was cancelled. Please manually switch from ${currentChainName || 'current'} to ${targetChain} network to continue.`;
          } else if (errorMessage.toLowerCase().includes('unsupported')) {
            title = "Unsupported Network";
            description = `Your wallet doesn't support ${targetChain} network. Please add it manually or switch using your wallet.`;
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
      console.error(`Network validation error:`, error);
      setIsCorrectNetwork(false);
      setCurrentChain(null);
      
      if (error.message?.includes('properties of null')) {
        toast({
          title: "Network Error",
          description: "Failed to validate network connection. Please try again.",
          variant: "destructive"
        });
      }
    } finally {
      setIsValidating(false);
      isValidatingRef.current = false;
    }
  }, [wallets, targetChain, shouldSwitch, authenticated, user, retryConfig.attempts, getActiveWallet, detectCurrentNetwork, verifyNetworkSwitch, safeWalletAccess, health.isRecovering, health.lastError, attemptRecovery]);

  // Only run validation when shouldSwitch is true
  useEffect(() => {
    if (!shouldSwitch) {
      debugLog('NETWORK_MANAGER', 'Skipping useEffect validation - shouldSwitch is false');
      return;
    }

    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }
    
    validationTimeoutRef.current = setTimeout(() => {
      validateAndSwitchNetwork();
    }, 1500);

    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [wallets.length, targetChain, shouldSwitch, authenticated]);

  return {
    isCorrectNetwork,
    currentChain,
    isValidating,
    targetChain,
    walletHealth: health
  };
};
