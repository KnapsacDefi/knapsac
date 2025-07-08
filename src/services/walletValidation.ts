import { useWallets } from "@privy-io/react-auth";
import { validateWallet, logWalletState } from "@/utils/walletValidation";

export interface WalletValidationResult {
  isValid: boolean;
  address?: string;
  error?: string;
}

export const useWalletValidation = () => {
  const { wallets } = useWallets();

  const validateCurrentWallet = (userWallet?: any): WalletValidationResult => {
    logWalletState(wallets, userWallet);
    return validateWallet(wallets, userWallet);
  };

  return {
    validateCurrentWallet,
    wallets,
  };
};