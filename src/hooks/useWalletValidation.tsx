
import { useState, useEffect, useCallback } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";

export const useWalletValidation = () => {
  const { user, ready, connectWallet } = usePrivy();
  const { wallets } = useWallets();
  const [walletReady, setWalletReady] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Enhanced wallet readiness check with retry logic
  useEffect(() => {
    const checkWalletReady = () => {
      const hasConnectedWallet = wallets.length > 0;
      const walletAddress = wallets[0]?.address;
      const isReady = ready && hasConnectedWallet && walletAddress;
      
      console.log('Wallet readiness check (enhanced):', { 
        ready, 
        walletsLength: wallets.length, 
        walletAddress, 
        isReady,
        userEmail: user?.email?.address || 'N/A'
      });
      
      setWalletReady(!!isReady);
      
      // Clear connection error if wallet is ready
      if (isReady) {
        setConnectionError(null);
      } else if (ready && !hasConnectedWallet) {
        // Set a specific error when wallet is disconnected
        setConnectionError("Wallet disconnected. Please reconnect your wallet.");
      }
    };

    // Immediate check
    checkWalletReady();
    
    // Also check after a small delay to catch async updates
    const timeoutId = setTimeout(checkWalletReady, 100);
    return () => clearTimeout(timeoutId);
  }, [ready, wallets, user?.email?.address]);

  const walletAddress = wallets[0]?.address;
  const hasWallet = !!walletAddress && walletReady;

  const ensureWalletConnection = useCallback(async () => {
    setConnectionError(null);
    
    if (!ready) {
      const error = "Wallet service is still initializing. Please wait a moment.";
      setConnectionError(error);
      throw new Error(error);
    }

    // Check if we already have a connected wallet
    if (wallets.length > 0 && wallets[0]?.address) {
      console.log('Wallet already connected:', wallets[0].address);
      return wallets[0].address;
    }

    try {
      console.log('Attempting to connect wallet...');
      
      await connectWallet();
      
      // Wait for wallet state to update with retry logic
      const timeout = 8000; // Increased timeout
      const startTime = Date.now();
      
      while (Date.now() - startTime < timeout) {
        if (wallets.length > 0 && wallets[0]?.address) {
          console.log('Wallet connected successfully:', wallets[0].address);
          return wallets[0].address;
        }
        await new Promise(resolve => setTimeout(resolve, 100)); // More frequent checks
      }
      
      throw new Error("Wallet connection timed out. Please try again.");
      
    } catch (error: any) {
      console.error('Wallet connection failed:', error);
      
      let errorMessage = "Failed to connect wallet. Please try again.";
      
      // Handle specific error cases
      if (error.message?.includes('User rejected')) {
        errorMessage = "Wallet connection was cancelled. Please try again.";
      } else if (error.message?.includes('timeout')) {
        errorMessage = "Wallet connection timed out. Please check your wallet and try again.";
      } else if (error.message?.includes('network')) {
        errorMessage = "Network issue detected. Please check your connection and try again.";
      }
      
      setConnectionError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [ready, wallets, connectWallet]);

  return {
    walletAddress,
    hasWallet,
    walletReady,
    privyReady: ready,
    connectionError,
    ensureWalletConnection,
  };
};
