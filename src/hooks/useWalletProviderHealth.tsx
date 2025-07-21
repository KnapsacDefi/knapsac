
import { useState, useEffect, useCallback, useRef } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { toast } from '@/hooks/use-toast';
import { getChainNameFromId } from '@/constants/tokens';
import { debugLog } from '@/utils/debugConfig';

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
  cooldownUntil: number;
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
    isOpen: false,
    cooldownUntil: 0
  });

  // Add refs to prevent excessive health checks
  const lastHealthCheckRef = useRef<number>(0);
  const healthCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isHealthCheckingRef = useRef<boolean>(false);

  const parseEIP155ChainId = useCallback((chainIdValue: any): number | null => {
    if (!chainIdValue) return null;
    
    const chainIdStr = String(chainIdValue);
    debugLog('WALLET_HEALTH', 'Parsing chain ID value:', chainIdStr);
    
    // Handle EIP155 format variations
    if (chainIdStr.includes('eip155:') || chainIdStr.includes('EIP155:')) {
      const parts = chainIdStr.split(':');
      if (parts.length >= 2) {
        const numericPart = parts[1];
        
        if (numericPart.startsWith('0x')) {
          const parsed = parseInt(numericPart, 16);
          if (!isNaN(parsed) && parsed > 0) {
            debugLog('WALLET_HEALTH', 'EIP155 hex format parsed:', parsed);
            return parsed;
          }
        } else {
          const parsed = parseInt(numericPart, 10);
          if (!isNaN(parsed) && parsed > 0) {
            debugLog('WALLET_HEALTH', 'EIP155 decimal format parsed:', parsed);
            return parsed;
          }
        }
      }
    }
    
    // Handle hex format directly
    if (chainIdStr.startsWith('0x')) {
      const parsed = parseInt(chainIdStr, 16);
      if (!isNaN(parsed) && parsed > 0) {
        debugLog('WALLET_HEALTH', 'Direct hex format parsed:', parsed);
        return parsed;
      }
    }
    
    // Handle direct numeric values
    const parsed = typeof chainIdValue === 'string' ? parseInt(chainIdValue, 10) : Number(chainIdValue);
    if (!isNaN(parsed) && parsed > 0) {
      debugLog('WALLET_HEALTH', 'Direct numeric format parsed:', parsed);
      return parsed;
    }
    
    debugLog('WALLET_HEALTH', 'Could not parse chain ID:', chainIdValue);
    return null;
  }, []);

  const safeWalletAccess = useCallback((wallet: any, property: string): any => {
    try {
      if (!wallet || typeof wallet !== 'object') return null;
      return wallet[property];
    } catch (error) {
      debugLog('WALLET_HEALTH', `Error accessing wallet.${property}:`, error);
      return null;
    }
  }, []);

  const detectChainId = useCallback(async (wallet: any): Promise<number | null> => {
    debugLog('WALLET_HEALTH', 'Starting chain ID detection...');
    
    if (!wallet) return null;

    const detectionMethods = [
      () => parseEIP155ChainId(safeWalletAccess(wallet, 'chainId')),
      () => {
        const chain = safeWalletAccess(wallet, 'chain');
        return chain ? parseEIP155ChainId(safeWalletAccess(chain, 'id')) : null;
      },
      () => parseEIP155ChainId(safeWalletAccess(wallet, 'connectedChain')),
      () => {
        const network = safeWalletAccess(wallet, 'network');
        return network ? parseEIP155ChainId(safeWalletAccess(network, 'chainId')) : null;
      },
      async () => {
        try {
          if (typeof window !== 'undefined' && window.ethereum && typeof window.ethereum.request === 'function') {
            const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
            if (chainIdHex) {
              const parsed = parseInt(chainIdHex, 16);
              return !isNaN(parsed) && parsed > 0 ? parsed : null;
            }
          }
        } catch (error) {
          debugLog('WALLET_HEALTH', 'ethereum.request failed:', error);
        }
        return null;
      }
    ];

    for (let i = 0; i < detectionMethods.length; i++) {
      try {
        const result = await detectionMethods[i]();
        if (result && result > 0) {
          const chainName = getChainNameFromId(result);
          debugLog('WALLET_HEALTH', `Method ${i + 1} success - Chain: ${chainName || 'Unknown'} (${result})`);
          return result;
        }
      } catch (error) {
        debugLog('WALLET_HEALTH', `Method ${i + 1} failed:`, error);
      }
    }

    debugLog('WALLET_HEALTH', 'All chain ID detection methods failed');
    return null;
  }, [safeWalletAccess, parseEIP155ChainId]);

  // Enhanced circuit breaker with cooldown
  const isCircuitBreakerOpen = useCallback((): boolean => {
    const now = Date.now();
    
    // Check if we're in a cooldown period
    if (circuitBreaker.cooldownUntil > now) {
      return true;
    }
    
    // Reset circuit breaker after cooldown
    if (circuitBreaker.cooldownUntil > 0 && circuitBreaker.cooldownUntil <= now) {
      setCircuitBreaker(prev => ({ 
        ...prev, 
        failures: 0, 
        isOpen: false, 
        cooldownUntil: 0 
      }));
      return false;
    }
    
    const timeSinceLastFailure = now - circuitBreaker.lastFailure;
    const shortCooldown = 5000; // 5 seconds
    
    return circuitBreaker.failures >= 3 && timeSinceLastFailure < shortCooldown;
  }, [circuitBreaker]);

  const recordFailure = useCallback(() => {
    const now = Date.now();
    setCircuitBreaker(prev => {
      const newFailures = prev.failures + 1;
      const cooldownDuration = Math.min(30000, 5000 * Math.pow(2, newFailures - 1)); // Exponential backoff, max 30s
      
      return {
        failures: newFailures,
        lastFailure: now,
        isOpen: newFailures >= 3,
        cooldownUntil: newFailures >= 3 ? now + cooldownDuration : 0
      };
    });
  }, []);

  const validateWalletState = useCallback((): boolean => {
    if (wallets && wallets.length > 0) {
      const wallet = wallets[0];
      const address = safeWalletAccess(wallet, 'address');
      if (address) {
        debugLog('WALLET_HEALTH', 'Wallet state valid - address found:', address);
        return true;
      }
    }
    
    debugLog('WALLET_HEALTH', 'Wallet state not ready - no address found');
    return false;
  }, [wallets, safeWalletAccess]);

  // Debounced health check with proper throttling
  const performHealthCheck = useCallback(async () => {
    const now = Date.now();
    
    // Prevent excessive health checks - minimum 2 seconds between checks
    if (now - lastHealthCheckRef.current < 2000) {
      debugLog('WALLET_HEALTH', 'Health check throttled');
      return;
    }
    
    // Prevent concurrent health checks
    if (isHealthCheckingRef.current) {
      debugLog('WALLET_HEALTH', 'Health check already in progress');
      return;
    }
    
    // Skip if circuit breaker is open
    if (isCircuitBreakerOpen()) {
      debugLog('WALLET_HEALTH', 'Circuit breaker is open, skipping health check');
      return;
    }

    isHealthCheckingRef.current = true;
    lastHealthCheckRef.current = now;

    try {
      if (!validateWalletState()) {
        setHealth(prev => ({ 
          ...prev, 
          isHealthy: true, // Stay optimistic during initialization
          lastError: null,
          chainId: null 
        }));
        return;
      }

      const wallet = wallets[0];
      const chainId = await detectChainId(wallet);
      
      if (chainId) {
        const chainName = getChainNameFromId(chainId);
        const isValidChain = !!chainName;
        
        if (isValidChain) {
          setHealth({
            isHealthy: true,
            lastError: null,
            chainId,
            isRecovering: false
          });

          debugLog('WALLET_HEALTH', `Health check passed - Chain: ${chainName} (${chainId})`);
          
          // Reset circuit breaker on success
          setCircuitBreaker(prev => ({ 
            ...prev, 
            failures: 0, 
            isOpen: false, 
            cooldownUntil: 0 
          }));
        } else {
          setHealth({
            isHealthy: false,
            lastError: `Unsupported chain ID: ${chainId}`,
            chainId,
            isRecovering: false
          });
        }
      } else {
        // Chain detection failed but wallet exists - stay optimistic
        setHealth(prev => ({ 
          ...prev, 
          isHealthy: true,
          lastError: 'Chain detection pending...',
          isRecovering: false 
        }));
      }

    } catch (error) {
      console.error('Wallet health check error:', error);
      
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
      }
    } finally {
      isHealthCheckingRef.current = false;
    }
  }, [wallets, detectChainId, isCircuitBreakerOpen, validateWalletState, recordFailure]);

  const attemptRecovery = useCallback(async () => {
    if (isCircuitBreakerOpen()) {
      debugLog('WALLET_HEALTH', 'Circuit breaker is open, skipping recovery');
      return;
    }

    debugLog('WALLET_HEALTH', 'Attempting wallet provider recovery...');
    setHealth(prev => ({ ...prev, isRecovering: true }));

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await performHealthCheck();
      setHealth(prev => ({ ...prev, isRecovering: false }));
    } catch (error) {
      console.error('Wallet recovery failed:', error);
      setHealth(prev => ({ 
        ...prev, 
        isRecovering: false,
        lastError: `Recovery failed: ${error.message}`
      }));
      recordFailure();
    }
  }, [performHealthCheck, isCircuitBreakerOpen, recordFailure]);

  // Properly debounced health monitoring with much longer delay
  useEffect(() => {
    if (healthCheckTimeoutRef.current) {
      clearTimeout(healthCheckTimeoutRef.current);
    }
    
    healthCheckTimeoutRef.current = setTimeout(() => {
      performHealthCheck();
    }, 1000); // Increased from 50ms to 1000ms

    return () => {
      if (healthCheckTimeoutRef.current) {
        clearTimeout(healthCheckTimeoutRef.current);
      }
    };
  }, [wallets.length]); // Only depend on wallet count, not the entire wallets array

  // Less aggressive auto-recovery with proper notifications
  useEffect(() => {
    if (!health.isHealthy && !health.isRecovering && health.lastError && !isCircuitBreakerOpen()) {
      const isSeriousIssue = health.lastError.includes('properties of null') || 
                            health.lastError.includes('Recovery failed') ||
                            health.lastError.includes('Unsupported chain');
      
      if (isSeriousIssue) {
        console.warn('Wallet health issue detected:', health.lastError);
        
        // Only show toast for critical issues, not during normal operation
        if (health.lastError.includes('Recovery failed')) {
          toast({
            title: "Wallet Connection Issue",
            description: "Attempting to restore wallet connection...",
            variant: "destructive"
          });
        }
        
        // Attempt recovery with delay
        setTimeout(attemptRecovery, 3000); // Increased delay
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
