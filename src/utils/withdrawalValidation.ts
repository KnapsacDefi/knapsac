
import { isAddress, getAddress } from 'viem';
import { 
  SUPPORTED_TOKENS, 
  SupportedChain, 
  getChainIdFromName, 
  getChainNameFromId 
} from '@/constants/tokens';

export const validateAddress = (address: string): boolean => {
  try {
    return isAddress(address);
  } catch {
    return false;
  }
};

export const checksumAddress = (address: string): string => {
  try {
    return getAddress(address);
  } catch {
    throw new Error('Invalid address format');
  }
};

export const validateTokenForChain = (
  tokenAddress: string, 
  chain: SupportedChain
): boolean => {
  const chainTokens = SUPPORTED_TOKENS[chain];
  return chainTokens.some(token => 
    token.address.toLowerCase() === tokenAddress.toLowerCase()
  );
};

// Re-export chain utility functions from tokens.ts for backward compatibility
export { getChainIdFromName, getChainNameFromId } from '@/constants/tokens';
