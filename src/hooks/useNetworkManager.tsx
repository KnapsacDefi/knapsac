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

export const useNetworkManager = (targetChain: SupportedChain, shouldSwitch: boolean = true, silent: boolean = false) => {
  const { wallets } = useWallets();
  const { user, authenticated } = usePrivy();
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const [currentChain, setCurrentChain] = useState<SupportedChain | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [retryConfig, setRetryConfig] = useState<RetryConfig>({ 
    attempts: 0, 
    maxAttempts: 2, 
    delay: 1000 
  });

  const { health, detectChainId, safeWalletAccess, attemptRecovery } = useWalletProviderHealth();
  
  // Add refs to prevent excessive validation - reduced throttle from 3s to 1.5s
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
        setTimeout(() => reject(new Error('Chain detection timeout')), 6000); // Reduced from 8s to 6s
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

  const verifyNetworkSwitch = useCallback(async (wallet: any, targetChainId: number, maxAttempts: number = 3): Promise<boolean> => {
    debugLog('NETWORK_MANAGER', `Starting network switch verification for chainId: ${targetChainId}`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      debugLog('NETWORK_MANAGER', `Verification attempt ${attempt}/${maxAttempts}`);
      
      // Reduced delay for faster feedback
      const delay = 1000 * attempt;
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

  const performNetworkSwitch = useCallback(async (wallet: any, targetChainId: number, targetChain: SupportedChain, currentChainName: SupportedChain | null) => {
    setIsSwitching(true);
    setSwitchError(null);
    
    try {
      debugLog('NETWORK_MANAGER', `Attempting to switch from ${currentChainName} (${await detectCurrentNetwork(wallet).then(r => r.chainId)}) to ${targetChain} (${targetChainId})`);
      
      const switchChainMethod = safeWalletAccess(wallet, 'switchChain');
      if (!switchChainMethod || typeof switchChainMethod !== 'function') {
        throw new Error('Wallet does not support network switching');
      }
      
      // Show immediate feedback only if not silent
      if (!silent) {
        toast({
          title: "Switching Network",
          description: `Switching to ${targetChain} network...`,
        });
      }
      
      await switchChainMethod(targetChainId);
      debugLog('NETWORK_MANAGER', 'Switch chain command sent, starting verification...');
      
      const switchSuccessful = await verifyNetworkSwitch(wallet, targetChainId);
      
      if (switchSuccessful) {
        if (!silent) {
          toast({
            title: "Network Switched",
            description: `Successfully switched to ${targetChain} network.`,
          });
        }
        
        setIsCorrectNetwork(true);
        setCurrentChain(targetChain);
        return true;
      } else {
        throw new Error('Network switch verification failed');
      }
    } catch (switchError) {
      const errorMessage = switchError?.message || switchError?.toString() || '';
      debugLog('NETWORK_MANAGER', `Network switch failed:`, switchError);
      
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
      } else {
        title = "Network Switch Failed";
        description = `Failed to switch to ${targetChain}. Please try switching manually in your wallet.`;
      }
      
      setSwitchError(description);
      
      // Only show toast if not silent
      if (!silent) {
        toast({
          title,
          description,
          variant: "destructive"
        });
      }
      
      setIsCorrectNetwork(false);
      return false;
    } finally {
      setIsSwitching(false);
    }
  }, [detectCurrentNetwork, verifyNetworkSwitch, safeWalletAccess, silent]);

  const validateAndSwitchNetwork = useCallback(async () => {
    if (!shouldSwitch) {
      debugLog('NETWORK_MANAGER', 'Network validation skipped - shouldSwitch is false');
      return;
    }

    const now = Date.now();
    
    // Reduced throttle from 3s to 1.5s for better responsiveness
    if (now - lastValidationRef.current < 1500) {
      debugLog('NETWORK_MANAGER', 'Validation throttled - too soon since last validation');
      return;
    }
    
    if (isValidatingRef.current) {
      debugLog('NETWORK_MANAGER', 'Validation already in progress');
      return;
    }
    
    isValidatingRef.current = true;
    lastValidationRef.current = now;
    setIsValidating(true);
    setSwitchError(null);
    
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
        
        // Attempt automatic network switch
        await performNetworkSwitch(activeWallet, targetChainId, targetChain, currentChainName);
      }
    } catch (error) {
      console.error(`Network validation error:`, error);
      setIsCorrectNetwork(false);
      setCurrentChain(null);
      
      if (error.message?.includes('properties of null')) {
        setSwitchError("Failed to validate network connection. Please try again.");
        if (!silent) {
          toast({
            title: "Network Error",
            description: "Failed to validate network connection. Please try again.",
            variant: "destructive"
          });
        }
      }
    } finally {
      setIsValidating(false);
      isValidatingRef.current = false;
    }
  }, [wallets, targetChain, shouldSwitch, authenticated, user, retryConfig.attempts, getActiveWallet, detectCurrentNetwork, performNetworkSwitch, safeWalletAccess, health.isRecovering, health.lastError, attemptRecovery, silent]);

  // Manual retry function for users
  const retryNetworkSwitch = useCallback(async () => {
    // Reset throttle to allow immediate retry
    lastValidationRef.current = 0;
    await validateAndSwitchNetwork();
  }, [validateAndSwitchNetwork]);

  // Only run validation when shouldSwitch is true
  useEffect(() => {
    if (!shouldSwitch) {
      debugLog('NETWORK_MANAGER', 'Skipping useEffect validation - shouldSwitch is false');
      return;
    }

    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }
    
    // Reduced delay from 1.5s to 1s for better responsiveness
    validationTimeoutRef.current = setTimeout(() => {
      validateAndSwitchNetwork();
    }, 1000);

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
    isSwitching,
    switchError,
    targetChain,
    walletHealth: health,
    retryNetworkSwitch
  };
};
