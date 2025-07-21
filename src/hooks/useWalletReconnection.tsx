
import { useState, useEffect, useCallback } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useToast } from '@/hooks/use-toast';

export const useWalletReconnection = () => {
  const { ready, authenticated, connectWallet } = usePrivy();
  const { wallets } = useWallets();
  const { toast } = useToast();
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [hasShownDisconnectWarning, setHasShownDisconnectWarning] = useState(false);

  // Track wallet disconnection and show warning
  useEffect(() => {
    if (ready && authenticated && wallets.length === 0 && !hasShownDisconnectWarning) {
      console.warn('Wallet disconnection detected - no wallets available');
      setHasShownDisconnectWarning(true);
    }
    
    // Reset warning flag when wallet is reconnected
    if (wallets.length > 0 && hasShownDisconnectWarning) {
      setHasShownDisconnectWarning(false);
      console.log('Wallet reconnected successfully');
    }
  }, [ready, authenticated, wallets.length, hasShownDisconnectWarning]);

  const reconnectWallet = useCallback(async () => {
    if (isReconnecting) return;
    
    setIsReconnecting(true);
    
    try {
      console.log('Attempting to reconnect wallet...');
      await connectWallet();
      
      // Wait a moment for wallet state to update
      setTimeout(() => {
        if (wallets.length > 0) {
          toast({
            title: "Wallet Reconnected",
            description: "Your wallet has been successfully reconnected.",
          });
        }
        setIsReconnecting(false);
      }, 1500);
      
    } catch (error) {
      console.error('Wallet reconnection failed:', error);
      toast({
        title: "Reconnection Failed",
        description: "Failed to reconnect wallet. Please try again.",
        variant: "destructive"
      });
      setIsReconnecting(false);
    }
  }, [connectWallet, wallets.length, toast, isReconnecting]);

  const hasWallet = wallets.length > 0 && wallets[0]?.address;
  const needsReconnection = ready && authenticated && !hasWallet;

  return {
    hasWallet,
    needsReconnection,
    isReconnecting,
    reconnectWallet,
    walletAddress: wallets[0]?.address || null
  };
};
