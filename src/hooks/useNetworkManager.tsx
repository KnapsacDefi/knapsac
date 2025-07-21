
import { useEffect, useState, useCallback } from 'react';
import { useWallets, usePrivy } from '@privy-io/react-auth';
import { toast } from '@/hooks/use-toast';
import { getChainIdFromName, getChainNameFromId } from '@/utils/withdrawalValidation';
import { SupportedChain } from '@/constants/tokens';
import { useWalletProviderHealth } from './useWalletProviderHealth';

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

  const { health, detectChainId, safeWalletAccess, attemptRecovery } = useWalletProviderHealth();

  // Enhanced wallet detection with validation
  const getActiveWallet = useCallback(() => {
    // Check wallet provider health first
    if (!health.isHealthy) {
      console.warn('Wallet provider is unhealthy:', health.lastError);
      return null;
    }

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
  }, [wallets, authenticated, user, health]);

  // Enhanced network detection using health monitor
  const detectCurrentNetwork = useCallback(async (wallet: any): Promise<{ chainId: number | null; chainName: SupportedChain | null }> => {
    console.log('🔍 Detecting network for wallet:', safeWalletAccess(wallet, 'address'));
    
    try {
      const chainId = await detectChainId(wallet);
      
      if (chainId && chainId > 0) {
        const chainName = getChainNameFromId(chainId);
        console.log('✅ Network detected successfully:', { chainId, chainName });
        return { chainId, chainName };
      }
      
      console.warn('❌ Failed to detect valid chainId from wallet');
      return { chainId: null, chainName: null };
      
    } catch (error) {
      console.error('💥 Network detection error:', error);
      return { chainId: null, chainName: null };
    }
  }, [detectChainId, safeWalletAccess]);

  // Enhanced network switch verification with multiple attempts
  const verifyNetworkSwitch = useCallback(async (wallet: any, targetChainId: number, maxAttempts: number = 8): Promise<boolean> => {
    console.log(`🔄 Starting enhanced network switch verification for chainId: ${targetChainId}`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`📡 Verification attempt ${attempt}/${maxAttempts}`);
      
      // Progressive delay: start with 1s, then 2s, 3s, etc.
      const delay = 1000 * attempt;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Check wallet provider health before verification
      if (!health.isHealthy) {
        console.log(`⚠️ Wallet provider unhealthy on attempt ${attempt}, attempting recovery...`);
        await attemptRecovery();
        continue;
      }
      
      try {
        const { chainId } = await detectCurrentNetwork(wallet);
        
        if (chainId === targetChainId) {
          console.log(`✅ Network switch verified successfully on attempt ${attempt}`);
          return true;
        }
        
        console.log(`⏳ Verification attempt ${attempt} failed. Current: ${chainId}, Target: ${targetChainId}`);
        
        // On later attempts, try to refresh wallet connection
        if (attempt >= 4) {
          console.log('🔄 Refreshing wallet connection...');
          await attemptRecovery();
        }
        
      } catch (error) {
        console.error(`❌ Verification attempt ${attempt} error:`, error);
        
        // If we get provider errors, attempt recovery
        if (error.message?.includes('properties of null') || error.message?.includes('chainId')) {
          console.log('🚨 Provider error detected, attempting recovery...');
          await attemptRecovery();
        }
      }
    }
    
    console.error(`❌ Network switch verification failed after ${maxAttempts} attempts`);
    return false;
  }, [health, detectCurrentNetwork, attemptRecovery]);

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  useEffect(() => {
    if (!shouldSwitch) return;

    const validateAndSwitchNetwork = async () => {
      setIsValidating(true);
      
      try {
        // Check wallet provider health first
        if (!health.isHealthy) {
          console.log('Wallet provider is unhealthy, waiting for recovery...');
          setIsValidating(false);
          return;
        }

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

        // Enhanced network detection with error handling
        const { chainId: currentChainId, chainName: currentChainName } = await detectCurrentNetwork(activeWallet);
        
        if (!currentChainId) {
          console.error('Unable to detect current network - wallet provider may be in error state');
          setIsCorrectNetwork(false);
          setCurrentChain(null);
          setIsValidating(false);
          
          // Attempt recovery if chain detection fails
          if (!health.isRecovering) {
            console.log('🔄 Attempting recovery due to chain detection failure...');
            await attemptRecovery();
          }
          
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
            
            // Use safe wallet access for switch chain
            const switchChainMethod = safeWalletAccess(activeWallet, 'switchChain');
            if (!switchChainMethod || typeof switchChainMethod !== 'function') {
              throw new Error('Wallet does not support network switching');
            }
            
            await switchChainMethod(targetChainId);
            console.log('📡 Switch chain command sent, starting enhanced verification...');
            
            // Enhanced verification with recovery capabilities
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
            
            // Enhanced error handling with provider error detection
            const errorMessage = switchError?.message || switchError?.toString() || '';
            const isProviderError = errorMessage.includes('properties of null') ||
                                   errorMessage.includes('chainId') ||
                                   errorMessage.includes('undefined');
            const isUserRejection = errorMessage.toLowerCase().includes('user') || 
                                   errorMessage.toLowerCase().includes('rejected') ||
                                   errorMessage.toLowerCase().includes('denied') ||
                                   errorMessage.toLowerCase().includes('cancelled');
            const isUnsupportedNetwork = errorMessage.toLowerCase().includes('unsupported') ||
                                        errorMessage.toLowerCase().includes('not supported');
            
            let title = "Network Switch Required";
            let description = `Please manually switch to ${targetChain} network in your wallet to continue.`;
            
            if (isProviderError) {
              title = "Wallet Provider Error";
              description = "Wallet connection issue detected. Attempting to recover...";
              // Trigger recovery for provider errors
              setTimeout(attemptRecovery, 1000);
            } else if (isUserRejection) {
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
        
        // Check if this is a provider error
        const errorMessage = error?.message || '';
        if (errorMessage.includes('properties of null') || errorMessage.includes('chainId')) {
          console.log('🚨 Provider error in network validation, triggering recovery...');
          setTimeout(attemptRecovery, 1000);
          
          toast({
            title: "Wallet Provider Error",
            description: "Wallet connection issue detected. Attempting to recover...",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Network Error",
            description: "Failed to validate network connection. Please try again.",
            variant: "destructive"
          });
        }
      } finally {
        setIsValidating(false);
      }
    };

    validateAndSwitchNetwork();
  }, [wallets, targetChain, shouldSwitch, authenticated, user, retryConfig.attempts, health, getActiveWallet, detectCurrentNetwork, verifyNetworkSwitch, safeWalletAccess, attemptRecovery]);

  return {
    isCorrectNetwork,
    currentChain,
    isValidating,
    targetChain,
    walletHealth: health
  };
};
