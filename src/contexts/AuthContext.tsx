
import React, { createContext, useContext, ReactNode, useMemo, useEffect, useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useStableAuth } from '@/hooks/useStableAuth';

interface AuthContextType {
  // Privy auth data
  ready: boolean;
  authenticated: boolean;
  user: any;
  login: () => void;
  logout: () => Promise<void>;
  
  // Wallet data
  wallets: any[];
  
  // Combined stable state
  isStable: boolean;
  
  // Wallet connection status
  hasConnectedWallet: boolean;
  walletAddress: string | null;
  walletsLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Get all auth data from Privy hooks in one place - ALWAYS call these hooks
  const privyAuth = usePrivy();
  const { wallets } = useWallets(); 
  const stableAuth = useStableAuth();  
  const [walletsLoading, setWalletsLoading] = useState(false);
  
  // Extract what we need from the hooks (stable data)
  const { login, logout } = privyAuth;
  const { ready, authenticated, user } = stableAuth;
  
  // Consider stable when auth is ready
  const isStable = ready;

  // Wallet loading detection logic
  useEffect(() => {
    if (authenticated && ready) {
      // Start wallet loading detection
      setWalletsLoading(true);
      
      // Set a timeout to stop waiting for wallets after reasonable time
      const walletTimeout = setTimeout(() => {
        console.log('AuthContext: Wallet loading timeout reached');
        setWalletsLoading(false);
      }, 10000); // 10 second timeout
      
      // Check if wallets are already loaded
      if (wallets && wallets.length > 0) {
        console.log('AuthContext: Wallets already loaded');
        setWalletsLoading(false);
        clearTimeout(walletTimeout);
      }
      
      return () => {
        clearTimeout(walletTimeout);
      };
    } else {
      setWalletsLoading(false);
    }
  }, [authenticated, ready, wallets?.length]);

  // Enhanced logging for wallet state changes
  useEffect(() => {
    console.log('AuthContext: Wallet state update', {
      ready,
      authenticated,
      walletsLength: wallets?.length || 0,
      firstWalletAddress: wallets?.[0]?.address || null,
      privyReady: privyAuth.ready,
      privyAuthenticated: privyAuth.authenticated,
      privyWalletsLength: wallets?.length || 0,
      userEmail: user?.email?.address || 'N/A',
      walletsLoading
    });
  }, [ready, authenticated, wallets, privyAuth.ready, privyAuth.authenticated, user?.email?.address, walletsLoading]);

  // Extract stable primitive values for memoization dependencies
  const walletsLength = useMemo(() => wallets?.length || 0, [wallets?.length]);
  const firstWalletAddress = useMemo(() => wallets?.[0]?.address || null, [
    walletsLength > 0 ? wallets[0]?.address : null
  ]);

  // Stabilize wallets array to prevent unnecessary re-renders
  const stableWallets = useMemo(() => {
    console.log('AuthContext: Recalculating stableWallets', { 
      walletsLength, 
      firstWalletAddress 
    });
    return wallets;
  }, [walletsLength, firstWalletAddress]);

  // Wallet connection status
  const hasConnectedWallet = Boolean(walletsLength > 0 && firstWalletAddress);
  const walletAddress = firstWalletAddress;

  // Memoize the context value to prevent unnecessary re-renders
  const value: AuthContextType = useMemo(() => ({
    ready,
    authenticated,
    user,
    login,
    logout,
    wallets: stableWallets,
    isStable,
    hasConnectedWallet,
    walletAddress,
    walletsLoading,
  }), [ready, authenticated, user, stableWallets, isStable, hasConnectedWallet, walletAddress, walletsLoading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
