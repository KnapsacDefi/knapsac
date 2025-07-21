
import { isAddress, getAddress } from 'viem';
import { SUPPORTED_TOKENS, SupportedChain } from '@/constants/tokens';

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

export const getChainIdFromName = (chain: SupportedChain): number => {
  switch (chain) {
    case 'ethereum': return 1;
    case 'celo': return 42220;
    case 'base': return 8453;
    default: throw new Error(`Unsupported chain: ${chain}`);
  }
};

export const getChainNameFromId = (chainId: number): SupportedChain | null => {
  switch (chainId) {
    case 1: return 'ethereum';
    case 42220: return 'celo';
    case 8453: return 'base';
    default: return null;
  }
};
