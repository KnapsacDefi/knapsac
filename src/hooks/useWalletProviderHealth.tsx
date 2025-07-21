
import { useState, useEffect, useCallback } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { toast } from '@/hooks/use-toast';
import { getChainNameFromId } from '@/constants/tokens';

interface WalletProviderHealth {
  isHealthy: boolean;
  lastError: string | null;
  chainId: number | null;
  isRecovering: boolean;
}

interface CircuitBreaker {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}

export const useWalletProviderHealth = () => {
  const { wallets } = useWallets();
  const [health, setHealth] = useState<WalletProviderHealth>({
    isHealthy: true,
    lastError: null,
    chainId: null,
    isRecovering: false
  });
  
  const [circuitBreaker, setCircuitBreaker] = useState<CircuitBreaker>({
    failures: 0,
    lastFailure: 0,
    isOpen: false
  });

  // Enhanced EIP155 parsing with multiple format support
  const parseEIP155ChainId = useCallback((chainIdValue: any): number | null => {
    if (!chainIdValue) return null;
    
    const chainIdStr = String(chainIdValue);
    console.log('🔍 Parsing chain ID value:', chainIdStr, 'Type:', typeof chainIdValue);
    
    // Handle EIP155 format variations: "eip155:42220", "eip155:0x42220", etc.
    if (chainIdStr.includes('eip155:') || chainIdStr.includes('EIP155:')) {
      const parts = chainIdStr.split(':');
      if (parts.length >= 2) {
        const numericPart = parts[1];
        
        // Handle hex format in EIP155
        if (numericPart.startsWith('0x')) {
          const parsed = parseInt(numericPart, 16);
          if (!isNaN(parsed) && parsed > 0) {
            console.log('✅ EIP155 hex format parsed successfully:', parsed);
            return parsed;
          }
        } else {
          // Handle decimal format in EIP155
          const parsed = parseInt(numericPart, 10);
          if (!isNaN(parsed) && parsed > 0) {
            console.log('✅ EIP155 decimal format parsed successfully:', parsed);
            return parsed;
          }
        }
      }
    }
    
    // Handle hex format directly: "0x42220"
    if (chainIdStr.startsWith('0x')) {
      const parsed = parseInt(chainIdStr, 16);
      if (!isNaN(parsed) && parsed > 0) {
        console.log('✅ Direct hex format parsed successfully:', parsed);
        return parsed;
      }
    }
    
    // Handle direct numeric values (string or number)
    const parsed = typeof chainIdValue === 'string' ? parseInt(chainIdValue, 10) : Number(chainIdValue);
    if (!isNaN(parsed) && parsed > 0) {
      console.log('✅ Direct numeric format parsed successfully:', parsed);
      return parsed;
    }
    
    console.warn('❌ Could not parse chain ID:', chainIdValue);
    return null;
  }, []);

  // Safely access wallet properties with error handling
  const safeWalletAccess = useCallback((wallet: any, property: string): any => {
    try {
      if (!wallet || typeof wallet !== 'object') {
        console.warn('Wallet object is null or invalid');
        return null;
      }
      
      const value = wallet[property];
      console.log(`Safe wallet access - ${property}:`, value);
      return value;
    } catch (error) {
      console.error(`Error accessing wallet.${property}:`, error);
      return null;
    }
  }, []);

  // Enhanced chain ID detection with comprehensive fallbacks
  const detectChainId = useCallback(async (wallet: any): Promise<number | null> => {
    console.log('🔍 Starting comprehensive chain ID detection...');
    
    if (!wallet) {
      console.warn('❌ No wallet provided for chain detection');
      return null;
    }

    const detectionMethods = [
      // Method 1: Direct chainId property
      () => {
        const directChainId = safeWalletAccess(wallet, 'chainId');
        console.log('🔍 Method 1 - Direct chainId:', directChainId);
        return parseEIP155ChainId(directChainId);
      },
      
      // Method 2: wallet.chain.id
      () => {
        const chain = safeWalletAccess(wallet, 'chain');
        if (chain && typeof chain === 'object') {
          const chainId = safeWalletAccess(chain, 'id');
          console.log('🔍 Method 2 - Chain.id:', chainId);
          return parseEIP155ChainId(chainId);
        }
        return null;
      },
      
      // Method 3: wallet.connectedChain
      () => {
        const connectedChain = safeWalletAccess(wallet, 'connectedChain');
        if (connectedChain) {
          console.log('🔍 Method 3 - ConnectedChain:', connectedChain);
          return parseEIP155ChainId(connectedChain);
        }
        return null;
      },
      
      // Method 4: wallet.network.chainId
      () => {
        const network = safeWalletAccess(wallet, 'network');
        if (network && typeof network === 'object') {
          const chainId = safeWalletAccess(network, 'chainId');
          console.log('🔍 Method 4 - Network.chainId:', chainId);
          return parseEIP155ChainId(chainId);
        }
        return null;
      },
      
      // Method 5: ethereum.request for chainId
      async () => {
        try {
          if (typeof window !== 'undefined' && window.ethereum && typeof window.ethereum.request === 'function') {
            const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
            console.log('🔍 Method 5 - ethereum.request result:', chainIdHex);
            if (chainIdHex) {
              const parsed = parseInt(chainIdHex, 16);
              return !isNaN(parsed) && parsed > 0 ? parsed : null;
            }
          }
        } catch (error) {
          console.warn('❌ Method 5 failed - ethereum.request:', error);
        }
        return null;
      }
    ];

    // Try each method sequentially
    for (let i = 0; i < detectionMethods.length; i++) {
      try {
        const result = await detectionMethods[i]();
        if (result && result > 0) {
          const chainName = getChainNameFromId(result);
          console.log(`✅ Method ${i + 1} success - Chain: ${chainName || 'Unknown'} (${result})`);
          return result;
        }
      } catch (error) {
        console.warn(`❌ Method ${i + 1} failed:`, error);
      }
    }

    console.error('❌ All chain ID detection methods failed');
    return null;
  }, [safeWalletAccess, parseEIP155ChainId]);

  // Circuit breaker check with reduced threshold
  const isCircuitBreakerOpen = useCallback((): boolean => {
    const now = Date.now();
    const timeSinceLastFailure = now - circuitBreaker.lastFailure;
    const cooldownPeriod = 15000; // Reduced to 15 seconds
    
    if (circuitBreaker.failures >= 2 && timeSinceLastFailure < cooldownPeriod) { // Reduced threshold
      return true;
    }
    
    // Reset circuit breaker after cooldown
    if (timeSinceLastFailure > cooldownPeriod) {
      setCircuitBreaker(prev => ({ ...prev, failures: 0, isOpen: false }));
      return false;
    }
    
    return false;
  }, [circuitBreaker]);

  // Record circuit breaker failure
  const recordFailure = useCallback(() => {
    setCircuitBreaker(prev => ({
      failures: prev.failures + 1,
      lastFailure: Date.now(),
      isOpen: prev.failures + 1 >= 2 // Reduced threshold
    }));
  }, []);

  // Improved wallet state validation - be more lenient
  const validateWalletState = useCallback((): boolean => {
    // If wallets array exists and has items with addresses, that's valid
    if (wallets && wallets.length > 0) {
      const wallet = wallets[0];
      const address = safeWalletAccess(wallet, 'address');
      if (address) {
        console.log('✅ Wallet state valid - address found:', address);
        return true;
      }
    }
    
    console.log('⚠️ Wallet state not ready - no address found');
    return false;
  }, [wallets, safeWalletAccess]);

  // Optimistic health check - assume healthy unless proven otherwise
  const performHealthCheck = useCallback(async () => {
    // Skip if circuit breaker is open
    if (isCircuitBreakerOpen()) {
      console.log('🚨 Circuit breaker is open, skipping health check');
      return;
    }

    // Check if we have a basic valid wallet first
    if (!validateWalletState()) {
      // Only set as unhealthy if we actually expect a wallet but it's invalid
      // Don't mark as unhealthy during normal initialization
      console.log('ℹ️ No valid wallet state - normal during initialization');
      setHealth(prev => ({ 
        ...prev, 
        isHealthy: true, // Stay optimistic
        lastError: null,
        chainId: null 
      }));
      return;
    }

    const wallet = wallets[0];
    
    try {
      // We have a valid wallet, now try to detect chain
      const chainId = await detectChainId(wallet);
      
      if (chainId) {
        // Validate that the detected chain is supported
        const chainName = getChainNameFromId(chainId);
        const isValidChain = !!chainName;
        
        if (isValidChain) {
          setHealth({
            isHealthy: true,
            lastError: null,
            chainId,
            isRecovering: false
          });

          console.log(`✅ Wallet health check passed - Chain: ${chainName} (${chainId})`);
          
          // Reset circuit breaker on success
          setCircuitBreaker(prev => ({ ...prev, failures: 0, isOpen: false }));
        } else {
          // Detected chain but it's not supported
          console.warn(`⚠️ Detected unsupported chain ID: ${chainId}`);
          setHealth({
            isHealthy: false,
            lastError: `Unsupported chain ID: ${chainId}. Please switch to a supported network (Ethereum, Celo, or Base).`,
            chainId,
            isRecovering: false
          });
        }
      } else {
        // Can't detect chain but wallet exists - be more lenient
        console.warn('⚠️ Chain detection failed but wallet exists - staying optimistic');
        setHealth(prev => ({ 
          ...prev, 
          isHealthy: true, // Stay optimistic - maybe chain detection will work later
          lastError: 'Chain ID detection failed - retrying...',
          isRecovering: false 
        }));
      }

    } catch (error) {
      console.error('💥 Wallet health check error:', error);
      
      // Only mark as unhealthy for serious errors
      const isSeriousError = error.message?.includes('properties of null') || 
                            error.message?.includes('undefined');
      
      if (isSeriousError) {
        setHealth(prev => ({ 
          ...prev, 
          isHealthy: false, 
          lastError: error.message,
          isRecovering: false 
        }));
        recordFailure();
      } else {
        // For minor errors, stay optimistic
        setHealth(prev => ({ 
          ...prev, 
          isHealthy: true,
          lastError: null,
          isRecovering: false 
        }));
      }
    }
  }, [wallets, detectChainId, isCircuitBreakerOpen, validateWalletState, recordFailure]);

  // Recovery function with circuit breaker
  const attemptRecovery = useCallback(async () => {
    if (isCircuitBreakerOpen()) {
      console.log('🚨 Circuit breaker is open, skipping recovery attempt');
      return;
    }

    console.log('🔄 Attempting wallet provider recovery...');
    setHealth(prev => ({ ...prev, isRecovering: true }));

    try {
      // Shorter wait for wallet state to settle
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Perform health check again
      await performHealthCheck();
      
      setHealth(prev => ({ ...prev, isRecovering: false }));
      
    } catch (error) {
      console.error('❌ Wallet recovery failed:', error);
      setHealth(prev => ({ 
        ...prev, 
        isRecovering: false,
        lastError: `Recovery failed: ${error.message}`
      }));
      recordFailure();
    }
  }, [performHealthCheck, isCircuitBreakerOpen, recordFailure]);

  // Monitor wallet health with debouncing - reduced delay
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performHealthCheck();
    }, 50); // Reduced delay

    return () => clearTimeout(timeoutId);
  }, [performHealthCheck]);

  // Less aggressive auto-recovery
  useEffect(() => {
    if (!health.isHealthy && !health.isRecovering && health.lastError && !isCircuitBreakerOpen()) {
      console.log('🚨 Wallet health issue detected:', health.lastError);
      
      // Only show notifications for serious issues
      const isSeriousIssue = health.lastError.includes('properties of null') || 
                            health.lastError.includes('Recovery failed');
      
      if (isSeriousIssue) {
        toast({
          title: "Wallet Connection Issue",
          description: "Attempting to restore wallet connection...",
          variant: "destructive"
        });
        
        // Attempt recovery after a delay
        setTimeout(attemptRecovery, 1500);
      }
    }
  }, [health.isHealthy, health.isRecovering, health.lastError, attemptRecovery, isCircuitBreakerOpen]);

  return {
    health,
    performHealthCheck,
    attemptRecovery,
    detectChainId: (wallet: any) => detectChainId(wallet),
    safeWalletAccess,
    parseEIP155ChainId
  };
};
