
import { useMemo } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';

export const useSimpleWalletLoading = () => {
  const { ready, authenticated } = usePrivy();
  const { wallets } = useWallets();

  const walletState = useMemo(() => {
    const hasWallet = wallets.length > 0 && wallets[0]?.address;
    const isWalletLoading = ready && authenticated && !hasWallet;
    
    return {
      hasWallet,
      isWalletLoading,
      walletAddress: wallets[0]?.address || null,
      needsWallet: ready && authenticated && !hasWallet
    };
  }, [ready, authenticated, wallets]);

  return walletState;
};
