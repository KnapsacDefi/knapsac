
import React, { createContext, useContext, ReactNode, useMemo, useEffect } from 'react';
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
  
  // Extract what we need from the hooks (stable data)
  const { login, logout } = privyAuth;
  const { ready, authenticated, user } = stableAuth;
  
  // Consider stable when auth is ready
  const isStable = ready;

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
      userEmail: user?.email?.address || 'N/A'
    });
  }, [ready, authenticated, wallets, privyAuth.ready, privyAuth.authenticated, user?.email?.address]);

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
  }), [ready, authenticated, user, stableWallets, isStable, hasConnectedWallet, walletAddress]);

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
