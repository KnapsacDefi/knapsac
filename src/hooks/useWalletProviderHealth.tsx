
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

    // Method 4: networkVersion fallback
    try {
      const networkVersion = safeWalletAccess(wallet, 'networkVersion');
      if (networkVersion) {
        const parsed = parseEIP155ChainId(networkVersion);
        if (parsed) {
          console.log('✅ Method 4 success - networkVersion:', parsed);
          return parsed;
        }
      }
    } catch (error) {
      console.warn('❌ Method 4 failed - networkVersion access:', error);
    }

    console.error('❌ All chain ID detection methods failed');
    return null;
  }, [safeWalletAccess, parseEIP155ChainId]);

  // Circuit breaker check
  const isCircuitBreakerOpen = useCallback((): boolean => {
    const now = Date.now();
    const timeSinceLastFailure = now - circuitBreaker.lastFailure;
    const cooldownPeriod = 30000; // 30 seconds
    
    if (circuitBreaker.failures >= 3 && timeSinceLastFailure < cooldownPeriod) {
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
      isOpen: prev.failures + 1 >= 3
    }));
  }, []);

  // Validate wallet state before performing health check
  const validateWalletState = useCallback((): boolean => {
    // If wallets array exists and has items, validate them
    if (wallets && wallets.length > 0) {
      const wallet = wallets[0];
      const address = safeWalletAccess(wallet, 'address');
      return !!address;
    }
    
    // If no wallets but we're not authenticated, that's expected
    return false;
  }, [wallets, safeWalletAccess]);

  // Health check function with improved logic
  const performHealthCheck = useCallback(async () => {
    // Skip if circuit breaker is open
    if (isCircuitBreakerOpen()) {
      console.log('🚨 Circuit breaker is open, skipping health check');
      return;
    }

    // Validate wallet state first
    if (!validateWalletState()) {
      // Only set as unhealthy if we have wallets array but invalid state
      if (wallets && wallets.length > 0) {
        console.warn('❌ Invalid wallet state detected');
        setHealth(prev => ({ 
          ...prev, 
          isHealthy: false, 
          lastError: 'Invalid wallet state - wallet exists but missing address',
          chainId: null 
        }));
        recordFailure();
      } else {
        // No wallets available - this is normal state, not an error
        console.log('ℹ️ No wallets available - normal state');
        setHealth(prev => ({ 
          ...prev, 
          isHealthy: true, // Don't mark as unhealthy when no wallets
          lastError: null,
          chainId: null 
        }));
      }
      return;
    }

    const wallet = wallets[0];
    
    try {
      // Check basic wallet properties
      const address = safeWalletAccess(wallet, 'address');
      if (!address) {
        throw new Error('Wallet address not accessible');
      }

      // Detect chain ID with enhanced methods
      const chainId = await detectChainId(wallet);
      
      // Validate that the detected chain is supported
      const chainName = chainId ? getChainNameFromId(chainId) : null;
      const isValidChain = !!chainName;
      
      setHealth({
        isHealthy: !!chainId && isValidChain,
        lastError: chainId ? (isValidChain ? null : `Unsupported chain ID: ${chainId}`) : 'Chain ID detection failed',
        chainId,
        isRecovering: false
      });

      if (chainId && isValidChain) {
        console.log(`✅ Wallet health check passed - Chain: ${chainName} (${chainId})`);
        // Reset circuit breaker on success
        setCircuitBreaker(prev => ({ ...prev, failures: 0, isOpen: false }));
      } else {
        console.error(`❌ Wallet health check failed - Chain ID: ${chainId}, Valid: ${isValidChain}`);
        recordFailure();
      }

    } catch (error) {
      console.error('💥 Wallet health check error:', error);
      setHealth(prev => ({ 
        ...prev, 
        isHealthy: false, 
        lastError: error.message,
        isRecovering: false 
      }));
      recordFailure();
    }
  }, [wallets, detectChainId, safeWalletAccess, isCircuitBreakerOpen, validateWalletState, recordFailure]);

  // Recovery function with circuit breaker
  const attemptRecovery = useCallback(async () => {
    if (isCircuitBreakerOpen()) {
      console.log('🚨 Circuit breaker is open, skipping recovery attempt');
      return;
    }

    console.log('🔄 Attempting wallet provider recovery...');
    setHealth(prev => ({ ...prev, isRecovering: true }));

    try {
      // Wait for wallet state to settle
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Perform health check again
      await performHealthCheck();
      
      if (health.isHealthy) {
        toast({
          title: "Wallet Recovered",
          description: "Wallet connection has been restored.",
        });
        console.log('✅ Wallet recovery successful');
      } else {
        console.warn('⚠️ Wallet recovery incomplete');
      }
    } catch (error) {
      console.error('❌ Wallet recovery failed:', error);
      setHealth(prev => ({ 
        ...prev, 
        isRecovering: false,
        lastError: `Recovery failed: ${error.message}`
      }));
      recordFailure();
    }
  }, [performHealthCheck, health.isHealthy, isCircuitBreakerOpen, recordFailure]);

  // Monitor wallet health with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performHealthCheck();
    }, 100); // Small delay to let wallet state settle

    return () => clearTimeout(timeoutId);
  }, [performHealthCheck]);

  // Improved auto-recovery logic
  useEffect(() => {
    if (!health.isHealthy && !health.isRecovering && health.lastError && !isCircuitBreakerOpen()) {
      console.log('🚨 Wallet health issue detected:', health.lastError);
      
      // Only show notifications and attempt recovery for genuine provider issues
      const isProviderError = health.lastError.includes('properties of null') || 
                             health.lastError.includes('Chain ID detection failed') ||
                             health.lastError.includes('Invalid wallet state');
      
      const isUnsupportedChain = health.lastError.includes('Unsupported chain ID');
      
      if (isProviderError) {
        toast({
          title: "Wallet Connection Issue",
          description: "Attempting to restore wallet connection...",
          variant: "destructive"
        });
        
        // Attempt recovery after a delay
        setTimeout(attemptRecovery, 2000);
      } else if (isUnsupportedChain) {
        toast({
          title: "Unsupported Network",
          description: "Please switch to a supported network in your wallet.",
          variant: "destructive"
        });
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
