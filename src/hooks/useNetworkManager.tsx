import { useEffect } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { celo, mainnet } from 'viem/chains';
import { toast } from '@/hooks/use-toast';

export const useNetworkManager = (targetChain: 'celo' | 'ethereum', shouldSwitch: boolean = true) => {
  const { wallets } = useWallets();

  useEffect(() => {
    if (!shouldSwitch || !wallets[0]) return;

    const switchToTargetChain = async () => {
      try {
        const chainId = targetChain === 'celo' ? celo.id : mainnet.id;
        await wallets[0].switchChain(chainId);
        
        toast({
          title: "Network Switched",
          description: `Successfully switched to ${targetChain} network.`,
        });
      } catch (error) {
        console.error(`Failed to switch to ${targetChain}:`, error);
        toast({
          title: "Network Switch Required",
          description: `Please manually switch to ${targetChain} network in your wallet.`,
        });
      }
    };

    switchToTargetChain();
  }, [wallets, targetChain, shouldSwitch]);
};