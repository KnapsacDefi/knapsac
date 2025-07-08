import { useState, useEffect, useCallback } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";

export const useWalletValidation = () => {
  const { user, ready, connectWallet } = usePrivy();
  const { wallets } = useWallets();
  const [walletReady, setWalletReady] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Check wallet readiness using current SDK patterns
  useEffect(() => {
    const checkWalletReady = () => {
      // Use wallets array as primary source, fallback to user.wallet only if needed
      const hasConnectedWallet = wallets.length > 0;
      const walletAddress = wallets[0]?.address;
      const isReady = ready && hasConnectedWallet && walletAddress;
      
      console.log('Wallet readiness check:', { 
        ready, 
        walletsLength: wallets.length, 
        walletAddress, 
        isReady 
      });
      
      setWalletReady(!!isReady);
      
      // Clear connection error if wallet is ready
      if (isReady) {
        setConnectionError(null);
      }
    };

    checkWalletReady();
  }, [ready, wallets]);

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
      return wallets[0].address;
    }

    try {
      console.log('Attempting to connect wallet...');
      
      // Use connectWallet method from latest SDK
      await connectWallet();
      
      // Wait for wallet connection to complete with timeout
      const timeout = 10000; // 10 seconds
      const startTime = Date.now();
      
      while (Date.now() - startTime < timeout) {
        if (wallets.length > 0 && wallets[0]?.address) {
          console.log('Wallet connected successfully:', wallets[0].address);
          return wallets[0].address;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
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