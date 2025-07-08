import { useEffect } from 'react';

export const usePrivyErrorHandler = (
  handleConnectionError: (error: string) => void,
  updateConnectionState: (updates: any) => void
) => {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const errorMessage = event.error?.message || event.message;
      
      console.log('Window error detected:', errorMessage);
      
      if (errorMessage.includes('Could not establish connection') ||
          errorMessage.includes('postMessage') ||
          errorMessage.includes('DataCloneError') ||
          errorMessage.includes('Unable to connect to wallet') ||
          errorMessage.includes('iframe')) {
        
        updateConnectionState({
          connectionQuality: 'failed',
          isWalletReady: false,
        });
        
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
        
        updateConnectionState({
          connectionQuality: 'failed',
          isWalletReady: false,
        });
        
        handleConnectionError(`Wallet promise rejection: ${reason}`);
      }
    };

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
  }, [handleConnectionError, updateConnectionState]);
};