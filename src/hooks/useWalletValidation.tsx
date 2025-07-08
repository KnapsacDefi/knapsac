import { useState, useEffect } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";

export const useWalletValidation = () => {
  const { user, ready, connectWallet } = usePrivy();
  const { wallets } = useWallets();
  const [walletReady, setWalletReady] = useState(false);

  // Check wallet readiness
  useEffect(() => {
    const checkWalletReady = () => {
      const walletAddress = wallets[0]?.address || user?.wallet?.address;
      const isReady = ready && (wallets.length > 0 || user?.wallet?.address) && walletAddress;
      console.log('Wallet readiness check:', { ready, walletsLength: wallets.length, userWallet: !!user?.wallet?.address, walletAddress, isReady });
      setWalletReady(!!isReady);
    };

    checkWalletReady();
  }, [ready, wallets, user?.wallet?.address]);

  const walletAddress = wallets[0]?.address || user?.wallet?.address;
  const hasWallet = !!walletAddress && walletReady;

  const ensureWalletConnection = async () => {
    if (!ready) {
      throw new Error("Wallet is still initializing. Please wait a moment.");
    }

    const currentWalletAddress = wallets[0]?.address || user?.wallet?.address;
    if (!currentWalletAddress || !walletReady) {
      console.log('Wallet not ready, attempting to connect...', { 
        walletAddress: currentWalletAddress, 
        walletReady, 
        walletsLength: wallets.length 
      });
      
      await connectWallet();
      
      // Wait a moment for wallet to initialize
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newWalletAddress = wallets[0]?.address || user?.wallet?.address;
      if (!newWalletAddress) {
        throw new Error("Please connect your wallet to continue.");
      }
    }

    return wallets[0]?.address || user?.wallet?.address;
  };

  return {
    walletAddress,
    hasWallet,
    walletReady,
    privyReady: ready,
    ensureWalletConnection,
  };
};