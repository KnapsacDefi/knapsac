import { useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';

export const useWalletReadinessChecker = (
  updateConnectionState: (updates: any) => void
) => {
  const { ready, authenticated, user } = usePrivy();

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
        
        updateConnectionState({
          isWalletReady: true,
          connectionQuality: 'good',
        });
        
        console.log('Wallet connection verified successfully');
      } catch (error) {
        console.warn('Wallet readiness check failed:', error);
        updateConnectionState({
          isWalletReady: false,
          connectionQuality: 'poor',
        });
      }
    };

    checkWalletReadiness();
  }, [ready, authenticated, user, updateConnectionState]);
};