
import { createConfig, http } from 'wagmi';
import { celo, fuse, mainnet, base } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

// Create wagmi config that works with Privy
export const wagmiConfig = createConfig({
  chains: [celo, fuse, mainnet, base],
  connectors: [injected()],
  transports: {
    [celo.id]: http('https://forno.celo.org'),
    [fuse.id]: http('https://rpc.fuse.io'),
    [mainnet.id]: http(),
    [base.id]: http(),
  },
});
