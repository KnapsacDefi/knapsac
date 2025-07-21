
import React, { createContext, useContext, ReactNode, useMemo } from 'react';
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

  // Stabilize wallets array to prevent unnecessary re-renders
  const stableWallets = useMemo(() => wallets, [wallets.length, wallets[0]?.address]);

  // Memoize the context value to prevent unnecessary re-renders
  // NOTE: login and logout functions are NOT included in dependencies as they recreate on every render
  const value: AuthContextType = useMemo(() => ({
    ready,
    authenticated,
    user,
    login,
    logout,
    wallets: stableWallets,
    isStable,
  }), [ready, authenticated, user, stableWallets, isStable]);

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
