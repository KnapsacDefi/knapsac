import { ConnectedWallet } from "@privy-io/react-auth";

export interface WalletValidationResult {
  isValid: boolean;
  address: string | null;
  error?: string;
}

export const validateWallet = (wallets: ConnectedWallet[], userWallet?: any): WalletValidationResult => {
  // Get wallet address from either wallets array or user object
  const walletAddress = wallets[0]?.address || userWallet?.address;
  
  if (!walletAddress) {
    return {
      isValid: false,
      address: null,
      error: "No wallet address found"
    };
  }

  // Check if we have a wallet object (not just address)
  const wallet = wallets[0];
  if (!wallet && !userWallet) {
    return {
      isValid: false,
      address: walletAddress,
      error: "Wallet object not available"
    };
  }

  return {
    isValid: true,
    address: walletAddress,
  };
};

export const logWalletState = (wallets: ConnectedWallet[], userWallet?: any) => {
  console.log("=== Wallet State Debug ===");
  console.log("Wallets array:", wallets);
  console.log("User wallet:", userWallet);
  console.log("Wallets count:", wallets.length);
  
  if (wallets[0]) {
    console.log("First wallet:", {
      address: wallets[0].address,
      walletClientType: wallets[0].walletClientType,
      imported: wallets[0].imported,
    });
  }
  
  const validation = validateWallet(wallets, userWallet);
  console.log("Validation result:", validation);
  console.log("=========================");
};