import { useState, useEffect, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';

interface PrivyConnectionState {
  isReady: boolean;
  isConnecting: boolean;
  hasError: boolean;
  errorMessage?: string;
  retryCount: number;
  isWalletReady: boolean;
  connectionQuality: 'good' | 'poor' | 'failed';
}

export const usePrivyConnection = (): PrivyConnectionState & {
  authenticated: boolean;
  retryConnection: () => void;
  resetConnection: () => void;
  forceWalletReconnect: () => void;
} => {
  const { ready, authenticated, user } = usePrivy();
  const [connectionState, setConnectionState] = useState<PrivyConnectionState>({
    isReady: false,
    isConnecting: true,
    hasError: false,
    retryCount: 0,
    isWalletReady: false,
    connectionQuality: 'poor',
  });

  const [connectionTimeout, setConnectionTimeout] = useState<NodeJS.Timeout | null>(null);

  const resetConnection = useCallback(() => {
    setConnectionState(prev => ({
      ...prev,
      isConnecting: true,
      hasError: false,
      errorMessage: undefined,
      retryCount: prev.retryCount + 1,
    }));
  }, []);

  const handleConnectionError = useCallback((error: string) => {
    console.error('Privy connection error:', error);
    setConnectionState(prev => ({
      ...prev,
      isConnecting: false,
      hasError: true,
      errorMessage: error,
    }));
  }, []);

  useEffect(() => {
    // Set up connection timeout
    const timeout = setTimeout(() => {
      if (!ready) {
        handleConnectionError('Connection timeout - Privy failed to initialize');
      }
    }, 15000); // 15 second timeout

    setConnectionTimeout(timeout);

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [ready, handleConnectionError]);

  useEffect(() => {
    if (ready) {
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
      }
      
      setConnectionState(prev => ({
        ...prev,
        isReady: true,
        isConnecting: false,
        hasError: false,
        errorMessage: undefined,
      }));
    }
  }, [ready, connectionTimeout]);

  // Enhanced wallet readiness monitoring
  useEffect(() => {
    if (!ready || !authenticated) return;

    const checkWalletReadiness = async () => {
      try {
        // Wait for iframe to be properly loaded
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if we can access wallet functionality
        const testConnection = () => {
          return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Wallet test timeout')), 3000);
            
            try {
              // Test if Privy iframe is responsive
              if (window.frames && window.frames.length > 0) {
                clearTimeout(timeout);
                resolve(true);
              } else {
                clearTimeout(timeout);
                reject(new Error('No iframe detected'));
              }
            } catch (error) {
              clearTimeout(timeout);
              reject(error);
            }
          });
        };

        await testConnection();
        
        setConnectionState(prev => ({
          ...prev,
          isWalletReady: true,
          connectionQuality: 'good',
        }));
        
        console.log('Wallet connection verified successfully');
      } catch (error) {
        console.warn('Wallet readiness check failed:', error);
        setConnectionState(prev => ({
          ...prev,
          isWalletReady: false,
          connectionQuality: 'poor',
        }));
      }
    };

    checkWalletReadiness();
  }, [ready, authenticated, user]);

  // Listen for iframe errors and postMessage issues with enhanced handling
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const errorMessage = event.error?.message || event.message;
      
      console.log('Window error detected:', errorMessage);
      
      if (errorMessage.includes('Could not establish connection') ||
          errorMessage.includes('postMessage') ||
          errorMessage.includes('DataCloneError') ||
          errorMessage.includes('Unable to connect to wallet') ||
          errorMessage.includes('iframe')) {
        
        setConnectionState(prev => ({
          ...prev,
          connectionQuality: 'failed',
          isWalletReady: false,
        }));
        
        handleConnectionError(`Wallet connection error: ${errorMessage}`);
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason?.message || event.reason;
      
      console.log('Unhandled rejection detected:', reason);
      
      if (typeof reason === 'string' && (
          reason.includes('Could not establish connection') ||
          reason.includes('postMessage') ||
          reason.includes('DataCloneError') ||
          reason.includes('Unable to connect to wallet'))) {
        
        setConnectionState(prev => ({
          ...prev,
          connectionQuality: 'failed',
          isWalletReady: false,
        }));
        
        handleConnectionError(`Wallet promise rejection: ${reason}`);
      }
    };

    // Enhanced postMessage error detection
    const handlePostMessageError = (event: MessageEvent) => {
      if (event.data && event.data.type === 'PRIVY_ERROR') {
        console.log('Privy iframe error:', event.data);
        handleConnectionError(`Privy iframe communication error: ${event.data.message}`);
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('message', handlePostMessageError);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('message', handlePostMessageError);
    };
  }, [handleConnectionError]);

  const retryConnection = useCallback(() => {
    console.log(`Retry attempt ${connectionState.retryCount + 1}/5`);
    
    if (connectionState.retryCount < 5) {
      resetConnection();
      
      // Progressive retry strategy
      if (connectionState.retryCount >= 2) {
        // Try clearing any stored auth state
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
    setConnectionState(prev => ({
      ...prev,
      isWalletReady: false,
      connectionQuality: 'poor',
      isConnecting: true,
      hasError: false,
    }));
    
    // Clear any cached connections
    try {
      localStorage.removeItem('privy:connections');
      localStorage.removeItem('privy:wallet');
    } catch (e) {
      console.warn('Could not clear wallet storage:', e);
    }
    
    // Give iframe time to reset
    setTimeout(() => {
      retryConnection();
    }, 500);
  }, [retryConnection]);

  return {
    ...connectionState,
    authenticated,
    retryConnection,
    resetConnection,
    forceWalletReconnect,
  };
};