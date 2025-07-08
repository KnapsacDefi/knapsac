import { useState, useEffect, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { usePrivyConnectionState } from '@/services/privyConnectionState';
import { usePrivyErrorHandler } from '@/services/privyErrorHandler';
import { useWalletReadinessChecker } from '@/services/walletReadinessChecker';

export const usePrivyConnection = () => {
  const { ready, authenticated } = usePrivy();
  const [connectionTimeout, setConnectionTimeout] = useState<NodeJS.Timeout | null>(null);
  
  const {
    connectionState,
    updateConnectionState,
    resetConnection,
    handleConnectionError,
  } = usePrivyConnectionState();

  // Set up error handlers
  usePrivyErrorHandler(handleConnectionError, updateConnectionState);
  
  // Set up wallet readiness checker
  useWalletReadinessChecker(updateConnectionState);

  // Handle connection timeout
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!ready) {
        handleConnectionError('Connection timeout - Privy failed to initialize');
      }
    }, 15000);

    setConnectionTimeout(timeout);

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [ready, handleConnectionError]);

  // Handle ready state changes
  useEffect(() => {
    if (ready) {
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
      }
      
      updateConnectionState({
        isReady: true,
        isConnecting: false,
        hasError: false,
        errorMessage: undefined,
      });
    }
  }, [ready, connectionTimeout, updateConnectionState]);

  const retryConnection = useCallback(() => {
    console.log(`Retry attempt ${connectionState.retryCount + 1}/5`);
    
    if (connectionState.retryCount < 5) {
      resetConnection();
      
      // Progressive retry strategy
      if (connectionState.retryCount >= 2) {
        try {
          localStorage.removeItem('privy:connections');
          localStorage.removeItem('privy:wallet');
          sessionStorage.clear();
        } catch (e) {
          console.warn('Could not clear storage:', e);
        }
      }
      
      if (connectionState.retryCount >= 4) {
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } else {
      handleConnectionError('Maximum retry attempts reached. Please refresh the page.');
    }
  }, [connectionState.retryCount, resetConnection, handleConnectionError]);

  const forceWalletReconnect = useCallback(() => {
    console.log('Forcing wallet reconnection...');
    updateConnectionState({
      isWalletReady: false,
      connectionQuality: 'poor',
      isConnecting: true,
      hasError: false,
    });
    
    try {
      localStorage.removeItem('privy:connections');
      localStorage.removeItem('privy:wallet');
    } catch (e) {
      console.warn('Could not clear wallet storage:', e);
    }
    
    setTimeout(() => {
      retryConnection();
    }, 500);
  }, [retryConnection, updateConnectionState]);

  return {
    ...connectionState,
    authenticated,
    retryConnection,
    resetConnection,
    forceWalletReconnect,
  };
};