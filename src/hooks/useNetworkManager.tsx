import { useEffect } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { mainnet, celo } from 'viem/chains';
import { toast } from '@/hooks/use-toast';

export const useNetworkManager = (targetChain: 'celo' | 'ethereum', shouldSwitch: boolean = true) => {
  const { wallets } = useWallets();

  useEffect(() => {
    if (!shouldSwitch || !wallets[0]) return;

    const switchToTargetChain = async () => {
      try {
        const chainId = targetChain === 'celo' ? celo.id : mainnet.id;
        await wallets[0].switchChain(chainId);
      } catch (error) {
        console.error(`Failed to switch to ${targetChain}:`, error);
        toast({
          title: "Network Switch Failed",
          description: `Could not switch to ${targetChain}. Please try again.`,
          variant: "destructive",
        });
      }
    };

    switchToTargetChain();

    // Return cleanup function to switch back to Ethereum when component unmounts
    return () => {
      if (targetChain === 'celo' && wallets[0]) {
        wallets[0].switchChain(mainnet.id).catch(console.error);
      }
    };
  }, [wallets, targetChain, shouldSwitch]);
};