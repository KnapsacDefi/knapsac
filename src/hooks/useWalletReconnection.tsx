
import { useState, useEffect, useCallback, useRef } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useToast } from '@/hooks/use-toast';

export const useWalletReconnection = () => {
  const { ready, authenticated, connectWallet } = usePrivy();
  const { wallets } = useWallets();
  const { toast } = useToast();
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [hasShownDisconnectWarning, setHasShownDisconnectWarning] = useState(false);
  const [autoReconnectAttempts, setAutoReconnectAttempts] = useState(0);
  const [isAutoReconnecting, setIsAutoReconnecting] = useState(false);
  const [autoReconnectFailed, setAutoReconnectFailed] = useState(false);
  
  const autoReconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const maxAutoReconnectAttempts = 3;

  // Automatic reconnection function
  const attemptAutoReconnection = useCallback(async () => {
    if (autoReconnectAttempts >= maxAutoReconnectAttempts || isAutoReconnecting) {
      console.log('Max auto-reconnect attempts reached or already reconnecting');
      setAutoReconnectFailed(true);
      setIsAutoReconnecting(false);
      return;
    }

    setIsAutoReconnecting(true);
    setAutoReconnectAttempts(prev => prev + 1);
    
    console.log(`Auto-reconnect attempt ${autoReconnectAttempts + 1}/${maxAutoReconnectAttempts}`);
    
    try {
      await connectWallet();
      
      // Wait for wallet state to update
      setTimeout(() => {
        if (wallets.length > 0) {
          console.log('Auto-reconnection successful');
          setAutoReconnectAttempts(0);
          setIsAutoReconnecting(false);
          setAutoReconnectFailed(false);
          toast({
            title: "Wallet Reconnected",
            description: "Your wallet has been automatically reconnected.",
          });
        } else {
          // Schedule next attempt with exponential backoff
          const delay = Math.min(1000 * Math.pow(2, autoReconnectAttempts), 8000);
          autoReconnectTimeoutRef.current = setTimeout(() => {
            attemptAutoReconnection();
          }, delay);
        }
      }, 1500);
      
    } catch (error) {
      console.error(`Auto-reconnect attempt ${autoReconnectAttempts + 1} failed:`, error);
      
      // Schedule next attempt with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, autoReconnectAttempts), 8000);
      autoReconnectTimeoutRef.current = setTimeout(() => {
        attemptAutoReconnection();
      }, delay);
    }
  }, [connectWallet, autoReconnectAttempts, isAutoReconnecting, wallets.length, toast]);

  // Track wallet disconnection and trigger automatic reconnection
  useEffect(() => {
    if (ready && authenticated && wallets.length === 0 && !hasShownDisconnectWarning && !isAutoReconnecting && !autoReconnectFailed) {
      console.warn('Wallet disconnection detected - starting auto-reconnection');
      setHasShownDisconnectWarning(true);
      
      // Start automatic reconnection after a short delay
      autoReconnectTimeoutRef.current = setTimeout(() => {
        attemptAutoReconnection();
      }, 500);
    }
    
    // Reset warning flag and attempts when wallet is reconnected
    if (wallets.length > 0 && hasShownDisconnectWarning) {
      setHasShownDisconnectWarning(false);
      setAutoReconnectAttempts(0);
      setIsAutoReconnecting(false);
      setAutoReconnectFailed(false);
      console.log('Wallet reconnected successfully');
    }
  }, [ready, authenticated, wallets.length, hasShownDisconnectWarning, isAutoReconnecting, autoReconnectFailed, attemptAutoReconnection]);

  // Manual reconnection function
  const reconnectWallet = useCallback(async () => {
    if (isReconnecting) return;
    
    // Clear any ongoing auto-reconnection
    if (autoReconnectTimeoutRef.current) {
      clearTimeout(autoReconnectTimeoutRef.current);
    }
    
    setIsReconnecting(true);
    setIsAutoReconnecting(false);
    
    try {
      console.log('Manual wallet reconnection attempt...');
      await connectWallet();
      
      // Wait a moment for wallet state to update
      setTimeout(() => {
        if (wallets.length > 0) {
          toast({
            title: "Wallet Reconnected",
            description: "Your wallet has been successfully reconnected.",
          });
          setAutoReconnectAttempts(0);
          setAutoReconnectFailed(false);
        }
        setIsReconnecting(false);
      }, 1500);
      
    } catch (error) {
      console.error('Manual wallet reconnection failed:', error);
      toast({
        title: "Reconnection Failed",
        description: "Failed to reconnect wallet. Please try again.",
        variant: "destructive"
      });
      setIsReconnecting(false);
    }
  }, [connectWallet, wallets.length, toast, isReconnecting]);

  // Reset auto-reconnection state
  const resetAutoReconnection = useCallback(() => {
    if (autoReconnectTimeoutRef.current) {
      clearTimeout(autoReconnectTimeoutRef.current);
    }
    setAutoReconnectAttempts(0);
    setIsAutoReconnecting(false);
    setAutoReconnectFailed(false);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoReconnectTimeoutRef.current) {
        clearTimeout(autoReconnectTimeoutRef.current);
      }
    };
  }, []);

  const hasWallet = wallets.length > 0 && wallets[0]?.address;
  const needsReconnection = ready && authenticated && !hasWallet;

  return {
    hasWallet,
    needsReconnection,
    isReconnecting,
    isAutoReconnecting,
    autoReconnectAttempts,
    autoReconnectFailed,
    maxAutoReconnectAttempts,
    reconnectWallet,
    resetAutoReconnection,
    walletAddress: wallets[0]?.address || null
  };
};
