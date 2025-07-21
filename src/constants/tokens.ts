
export const SUPPORTED_TOKENS = {
  ethereum: [
    { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
    { symbol: 'USDT', address: '0xdac17f958d2ee523a2206206994597c13d831ec7', decimals: 6 }
  ],
  celo: [
    { symbol: 'USDC', address: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C', decimals: 6 },
    { symbol: 'USDT', address: '0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e', decimals: 6 },
    { symbol: 'G$', address: '0x62b8b11039fcfe5ab0c56e502b1c372a3d2a9c7a', decimals: 18 }
  ],
  base: [
    { symbol: 'USDC', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
    { symbol: 'USDT', address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2', decimals: 6 }
  ]
};

// Centralized chain configuration
export const CHAIN_CONFIG = {
  ethereum: {
    id: 1,
    name: 'ethereum',
    displayName: 'Ethereum',
    nativeCurrency: 'ETH'
  },
  celo: {
    id: 42220,
    name: 'celo',
    displayName: 'Celo',
    nativeCurrency: 'CELO'
  },
  base: {
    id: 8453,
    name: 'base',
    displayName: 'Base',
    nativeCurrency: 'ETH'
  }
} as const;

export type SupportedChain = keyof typeof SUPPORTED_TOKENS;
export type TokenInfo = {
  symbol: string;
  address: string;
  decimals: number;
};

export type ChainConfig = typeof CHAIN_CONFIG[SupportedChain];

// Utility functions for chain ID conversion
export const getChainIdFromName = (chain: SupportedChain): number => {
  const config = CHAIN_CONFIG[chain];
  if (!config) {
    throw new Error(`Unsupported chain: ${chain}`);
  }
  return config.id;
};

export const getChainNameFromId = (chainId: number): SupportedChain | null => {
  for (const [chainName, config] of Object.entries(CHAIN_CONFIG)) {
    if (config.id === chainId) {
      return chainName as SupportedChain;
    }
  }
  return null;
};

export const getAllSupportedChainIds = (): number[] => {
  return Object.values(CHAIN_CONFIG).map(config => config.id);
};

export const getChainConfig = (chain: SupportedChain): ChainConfig => {
  const config = CHAIN_CONFIG[chain];
  if (!config) {
    throw new Error(`Unsupported chain: ${chain}`);
  }
  return config;
};

// Shared recipient address for all payment flows
export const RECIPIENT_ADDRESS = '0x9ec14B42b5F4526C518F0021E26C417fa76D710d' as const;
