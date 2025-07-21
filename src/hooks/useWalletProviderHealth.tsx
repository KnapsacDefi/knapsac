
import { useState, useEffect, useCallback } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { toast } from '@/hooks/use-toast';

interface WalletProviderHealth {
  isHealthy: boolean;
  lastError: string | null;
  chainId: number | null;
  isRecovering: boolean;
}

export const useWalletProviderHealth = () => {
  const { wallets } = useWallets();
  const [health, setHealth] = useState<WalletProviderHealth>({
    isHealthy: true,
    lastError: null,
    chainId: null,
    isRecovering: false
  });

  // Safely access wallet properties with error handling
  const safeWalletAccess = useCallback((wallet: any, property: string): any => {
    try {
      if (!wallet || typeof wallet !== 'object') {
        console.warn('Wallet object is null or invalid');
        return null;
      }
      
      // Use bracket notation to safely access properties
      const value = wallet[property];
      console.log(`Safe wallet access - ${property}:`, value);
      return value;
    } catch (error) {
      console.error(`Error accessing wallet.${property}:`, error);
      setHealth(prev => ({ 
        ...prev, 
        isHealthy: false, 
        lastError: `Failed to access wallet.${property}: ${error.message}` 
      }));
      return null;
    }
  }, []);

  // Multiple methods to detect chain ID with fallbacks
  const detectChainId = useCallback(async (wallet: any): Promise<number | null> => {
    console.log('🔍 Starting chain ID detection with multiple methods...');
    
    // Method 1: Direct chainId property
    try {
      const directChainId = safeWalletAccess(wallet, 'chainId');
      if (directChainId && directChainId !== 'undefined' && directChainId !== 'null') {
        const parsed = typeof directChainId === 'string' ? parseInt(directChainId, 10) : directChainId;
        if (!isNaN(parsed) && parsed > 0) {
          console.log('✅ Method 1 success - Direct chainId:', parsed);
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
        if (chainId && chainId !== 'undefined' && chainId !== 'null') {
          const parsed = typeof chainId === 'string' ? parseInt(chainId, 10) : chainId;
          if (!isNaN(parsed) && parsed > 0) {
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
      if (typeof window !== 'undefined' && window.ethereum) {
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
      if (networkVersion && networkVersion !== 'undefined' && networkVersion !== 'null') {
        const parsed = typeof networkVersion === 'string' ? parseInt(networkVersion, 10) : networkVersion;
        if (!isNaN(parsed) && parsed > 0) {
          console.log('✅ Method 4 success - networkVersion:', parsed);
          return parsed;
        }
      }
    } catch (error) {
      console.warn('❌ Method 4 failed - networkVersion access:', error);
    }

    console.error('❌ All chain ID detection methods failed');
    return null;
  }, [safeWalletAccess]);

  // Health check function
  const performHealthCheck = useCallback(async () => {
    if (!wallets || wallets.length === 0) {
      setHealth(prev => ({ 
        ...prev, 
        isHealthy: false, 
        lastError: 'No wallets available',
        chainId: null 
      }));
      return;
    }

    const wallet = wallets[0];
    
    try {
      // Check basic wallet properties
      const address = safeWalletAccess(wallet, 'address');
      if (!address) {
        throw new Error('Wallet address not accessible');
      }

      // Detect chain ID with fallbacks
      const chainId = await detectChainId(wallet);
      
      setHealth({
        isHealthy: !!chainId,
        lastError: chainId ? null : 'Chain ID detection failed',
        chainId,
        isRecovering: false
      });

      if (chainId) {
        console.log('✅ Wallet health check passed - Chain ID:', chainId);
      } else {
        console.error('❌ Wallet health check failed - No valid chain ID');
      }

    } catch (error) {
      console.error('💥 Wallet health check error:', error);
      setHealth(prev => ({ 
        ...prev, 
        isHealthy: false, 
        lastError: error.message,
        isRecovering: false 
      }));
    }
  }, [wallets, detectChainId, safeWalletAccess]);

  // Recovery function
  const attemptRecovery = useCallback(async () => {
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
    }
  }, [performHealthCheck, health.isHealthy]);

  // Monitor wallet health
  useEffect(() => {
    performHealthCheck();
  }, [performHealthCheck]);

  // Auto-recovery when wallet becomes unhealthy
  useEffect(() => {
    if (!health.isHealthy && !health.isRecovering && health.lastError) {
      console.log('🚨 Wallet health issue detected:', health.lastError);
      
      // Show user notification for provider issues
      if (health.lastError.includes('properties of null') || 
          health.lastError.includes('Chain ID detection failed')) {
        toast({
          title: "Wallet Connection Issue",
          description: "Attempting to restore wallet connection...",
          variant: "destructive"
        });
        
        // Attempt recovery after a delay
        setTimeout(attemptRecovery, 1000);
      }
    }
  }, [health.isHealthy, health.isRecovering, health.lastError, attemptRecovery]);

  return {
    health,
    performHealthCheck,
    attemptRecovery,
    detectChainId: (wallet: any) => detectChainId(wallet),
    safeWalletAccess
  };
};
