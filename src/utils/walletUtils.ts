
/**
 * Unified wallet address resolution utility
 * Ensures consistent wallet address detection across all components
 */
export const getWalletAddress = (wallets: any[], user: any): string | null => {
  // Primary source: wallets array (more stable and real-time)
  if (wallets && wallets.length > 0 && wallets[0]?.address) {
    return wallets[0].address;
  }
  
  // Fallback: user wallet address (from Privy user object)
  if (user?.wallet?.address) {
    return user.wallet.address;
  }
  
  return null;
};

/**
 * Check if wallet is properly connected
 */
export const isWalletConnected = (wallets: any[], user: any): boolean => {
  return !!getWalletAddress(wallets, user);
};

/**
 * Format wallet address for display
 */
export const formatWalletAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};
