import { useState, useCallback } from 'react';

export interface PrivyConnectionState {
  isReady: boolean;
  isConnecting: boolean;
  hasError: boolean;
  errorMessage?: string;
  retryCount: number;
  isWalletReady: boolean;
  connectionQuality: 'good' | 'poor' | 'failed';
}

export const usePrivyConnectionState = () => {
  const [connectionState, setConnectionState] = useState<PrivyConnectionState>({
    isReady: false,
    isConnecting: true,
    hasError: false,
    retryCount: 0,
    isWalletReady: false,
    connectionQuality: 'poor',
  });

  const updateConnectionState = useCallback((updates: Partial<PrivyConnectionState>) => {
    setConnectionState(prev => ({ ...prev, ...updates }));
  }, []);

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

  return {
    connectionState,
    updateConnectionState,
    resetConnection,
    handleConnectionError,
  };
};