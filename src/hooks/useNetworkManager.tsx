
import { useEffect, useState, useCallback } from 'react';
import { useWallets, usePrivy } from '@privy-io/react-auth';
import { toast } from '@/hooks/use-toast';
import { getChainIdFromName, getChainNameFromId } from '@/constants/tokens';
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
  const [retryConfig, setRetryConfig] = useState<RetryConfig>({ attempts: 0, maxAttempts: 2, delay: 500 }); // Reduced retries and delay

  const { health, detectChainId, safeWalletAccess, attemptRecovery } = useWalletProviderHealth();

  // More lenient wallet detection
  const getActiveWallet = useCallback(() => {
    // Check for basic wallet availability - don't wait for perfect health
    if (wallets && wallets.length > 0 && wallets[0]?.address) {
      console.log('✅ Active wallet found:', wallets[0].address);
      return wallets[0];
    }
    
    // Fallback: if authenticated but wallets array is empty, wait briefly
    if (authenticated && user?.wallet?.address && (!wallets || wallets.length === 0)) {
      console.log('⚠️ Wallet state inconsistency - will retry');
      return null; // Return null to trigger retry
    }
    
    console.log('ℹ️ No active wallet available');
    return null;
  }, [wallets, authenticated, user]);

  // Enhanced network detection with timeout
  const detectCurrentNetwork = useCallback(async (wallet: any): Promise<{ chainId: number | null; chainName: SupportedChain | null }> => {
    console.log('🔍 Detecting network for wallet:', safeWalletAccess(wallet, 'address'));
    
    try {
      // Add timeout to chain detection
      const detectionPromise = detectChainId(wallet);
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => reject(new Error('Chain detection timeout')), 5000);
      });
      
      const chainId = await Promise.race([detectionPromise, timeoutPromise]);
      
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

  // Simplified network switch verification
  const verifyNetworkSwitch = useCallback(async (wallet: any, targetChainId: number, maxAttempts: number = 3): Promise<boolean> => {
    console.log(`🔄 Starting network switch verification for chainId: ${targetChainId}`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`📡 Verification attempt ${attempt}/${maxAttempts}`);
      
      // Shorter progressive delay
      const delay = 800 * attempt;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      try {
        const { chainId } = await detectCurrentNetwork(wallet);
        
        if (chainId === targetChainId) {
          console.log(`✅ Network switch verified successfully on attempt ${attempt}`);
          return true;
        }
        
        console.log(`⏳ Verification attempt ${attempt} failed. Current: ${chainId}, Target: ${targetChainId}`);
        
      } catch (error) {
        console.error(`❌ Verification attempt ${attempt} error:`, error);
      }
    }
    
    console.error(`❌ Network switch verification failed after ${maxAttempts} attempts`);
    return false;
  }, [detectCurrentNetwork]);

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  useEffect(() => {
    if (!shouldSwitch) return;

    const validateAndSwitchNetwork = async () => {
      setIsValidating(true);
      
      try {
        // Don't wait for health recovery - proceed if we have basic wallet
        const activeWallet = getActiveWallet();
        
        // Implement simple retry logic for wallet state
        if (!activeWallet && authenticated && retryConfig.attempts < retryConfig.maxAttempts) {
          console.log(`Wallet not ready, retrying... (attempt ${retryConfig.attempts + 1}/${retryConfig.maxAttempts})`);
          await sleep(retryConfig.delay);
          setRetryConfig(prev => ({ 
            ...prev, 
            attempts: prev.attempts + 1, 
            delay: Math.min(prev.delay * 1.2, 1000) // Smaller backoff
          }));
          return;
        }

        // Reset retry config on successful wallet detection or max retries reached
        if (activeWallet || retryConfig.attempts >= retryConfig.maxAttempts) {
          setRetryConfig({ attempts: 0, maxAttempts: 2, delay: 500 });
        }

        if (!activeWallet) {
          console.log('No active wallet found after retries');
          setIsCorrectNetwork(false);
          setCurrentChain(null);
          setIsValidating(false);
          return;
        }

        // Proceed with network detection even if health is not perfect
        const { chainId: currentChainId, chainName: currentChainName } = await detectCurrentNetwork(activeWallet);
        
        if (!currentChainId) {
          console.error('Unable to detect current network');
          setIsCorrectNetwork(false);
          setCurrentChain(null);
          setIsValidating(false);
          
          // Only attempt recovery for serious health issues
          if (!health.isRecovering && health.lastError?.includes('properties of null')) {
            console.log('🔄 Attempting recovery due to serious health issue...');
            setTimeout(attemptRecovery, 1000);
          }
          
          return;
        }

        setCurrentChain(currentChainName);

        // Check if we're on the correct network
        const targetChainId = getChainIdFromName(targetChain);
        const isCorrect = currentChainId === targetChainId;
        setIsCorrectNetwork(isCorrect);

        console.log(`Network status: Current=${currentChainName} (${currentChainId}), Target=${targetChain} (${targetChainId}), IsCorrect=${isCorrect}`);

        // Provide clearer feedback about network mismatch
        if (!isCorrect) {
          console.warn(`❌ Wrong network detected: Currently on ${currentChainName || 'Unknown'} (${currentChainId}), need ${targetChain} (${targetChainId})`);
        }

        // If not on correct network, attempt to switch
        if (!isCorrect) {
          try {
            console.log(`🔄 Attempting to switch from ${currentChainName} (${currentChainId}) to ${targetChain} (${targetChainId})`);
            
            const switchChainMethod = safeWalletAccess(activeWallet, 'switchChain');
            if (!switchChainMethod || typeof switchChainMethod !== 'function') {
              throw new Error('Wallet does not support network switching');
            }
            
            await switchChainMethod(targetChainId);
            console.log('📡 Switch chain command sent, starting verification...');
            
            // Simplified verification
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
            console.error(`❌ Failed to switch to ${targetChain}:`, switchError);
            
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
  }, [wallets, targetChain, shouldSwitch, authenticated, user, retryConfig.attempts, getActiveWallet, detectCurrentNetwork, verifyNetworkSwitch, safeWalletAccess, health.isRecovering, health.lastError, attemptRecovery]);

  return {
    isCorrectNetwork,
    currentChain,
    isValidating,
    targetChain,
    walletHealth: health
  };
};
