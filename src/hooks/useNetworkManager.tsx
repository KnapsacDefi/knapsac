import { useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

export const useNetworkManager = (targetChain: 'celo' | 'ethereum', shouldSwitch: boolean = true) => {
  useEffect(() => {
    if (!shouldSwitch) return;

    // Show a toast notification about network switching
    if (targetChain === 'celo') {
      toast({
        title: "Network Switch Required",
        description: "Please switch to Celo network in your wallet for GoodDollar claims.",
      });
    }

    // Return cleanup function
    return () => {
      if (targetChain === 'celo') {
        toast({
          title: "Network Switch",
          description: "You can now switch back to Ethereum network.",
        });
      }
    };
  }, [targetChain, shouldSwitch]);
};