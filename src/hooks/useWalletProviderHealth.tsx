
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

  // Parse EIP155 format chain IDs (e.g., "eip155:42220" -> 42220)
  const parseEIP155ChainId = useCallback((chainIdValue: any): number | null => {
    if (!chainIdValue) return null;
    
    const chainIdStr = String(chainIdValue);
    
    // Handle EIP155 format: "eip155:42220"
    if (chainIdStr.startsWith('eip155:')) {
      const numericPart = chainIdStr.split(':')[1];
      const parsed = parseInt(numericPart, 10);
      if (!isNaN(parsed) && parsed > 0) {
        console.log('✅ EIP155 format parsed successfully:', parsed);
        return parsed;
      }
    }
    
    // Handle direct numeric values
    const parsed = typeof chainIdValue === 'string' ? parseInt(chainIdValue, 10) : chainIdValue;
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
    
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

  // Enhanced chain ID detection with EIP155 support
  const detectChainId = useCallback(async (wallet: any): Promise<number | null> => {
    console.log('🔍 Starting chain ID detection with multiple methods...');
    
    // Method 1: Direct chainId property (prioritize EIP155 format)
    try {
      const directChainId = safeWalletAccess(wallet, 'chainId');
      if (directChainId) {
        const parsed = parseEIP155ChainId(directChainId);
        if (parsed) {
          console.log('✅ Method 1 success - Direct chainId (EIP155):', parsed);
          return parsed;
        }
      }
    } catch (error) {
      console.warn('❌ Method 1 failed - Direct chainId access:', error);
    }

    // Method 2: wallet.chain.id
    try {
      const chain = safeWalletAccess(wallet, 'chain');
      if (chain && typeof chain === 'object') {
        const chainId = safeWalletAccess(chain, 'id');
        if (chainId) {
          const parsed = parseEIP155ChainId(chainId);
          if (parsed) {
            console.log('✅ Method 2 success - Chain.id:', parsed);
            return parsed;
          }
        }
      }
    } catch (error) {
      console.warn('❌ Method 2 failed - Chain.id access:', error);
    }

    // Method 3: ethereum.request for chainId
    try {
      if (typeof window !== 'undefined' && window.ethereum && typeof window.ethereum.request === 'function') {
        const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
        if (chainIdHex && typeof chainIdHex === 'string') {
          const parsed = parseInt(chainIdHex, 16);
          if (!isNaN(parsed) && parsed > 0) {
            console.log('✅ Method 3 success - ethereum.request:', parsed);
            return parsed;
          }
        }
      }
    } catch (error) {
      console.warn('❌ Method 3 failed - ethereum.request:', error);
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
        
        setHealth({
          isHealthy: true, // Mark as healthy if we can detect chain
          lastError: isValidChain ? null : `Unsupported chain ID: ${chainId}`,
          chainId,
          isRecovering: false
        });

        console.log(`✅ Wallet health check passed - Chain: ${chainName || 'Unknown'} (${chainId})`);
        
        // Reset circuit breaker on success
        setCircuitBreaker(prev => ({ ...prev, failures: 0, isOpen: false }));
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
