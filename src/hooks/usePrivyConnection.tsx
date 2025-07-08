import { useState, useEffect, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';

interface PrivyConnectionState {
  isReady: boolean;
  isConnecting: boolean;
  hasError: boolean;
  errorMessage?: string;
  retryCount: number;
}

export const usePrivyConnection = () => {
  const { ready, authenticated } = usePrivy();
  const [connectionState, setConnectionState] = useState<PrivyConnectionState>({
    isReady: false,
    isConnecting: true,
    hasError: false,
    retryCount: 0,
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

  // Listen for iframe errors and postMessage issues
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const errorMessage = event.error?.message || event.message;
      
      if (errorMessage.includes('Could not establish connection') ||
          errorMessage.includes('postMessage') ||
          errorMessage.includes('DataCloneError') ||
          errorMessage.includes('iframe')) {
        handleConnectionError(`Authentication service error: ${errorMessage}`);
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason?.message || event.reason;
      
      if (typeof reason === 'string' && (
          reason.includes('Could not establish connection') ||
          reason.includes('postMessage') ||
          reason.includes('DataCloneError'))) {
        handleConnectionError(`Authentication promise rejection: ${reason}`);
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [handleConnectionError]);

  const retryConnection = useCallback(() => {
    if (connectionState.retryCount < 3) {
      resetConnection();
      // Force reload if multiple retries
      if (connectionState.retryCount >= 2) {
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } else {
      handleConnectionError('Maximum retry attempts reached. Please refresh the page.');
    }
  }, [connectionState.retryCount, resetConnection, handleConnectionError]);

  return {
    ...connectionState,
    authenticated,
    retryConnection,
    resetConnection,
  };
};