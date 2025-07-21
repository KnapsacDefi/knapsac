
import { useEffect, useState } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { celo, mainnet, base } from 'viem/chains';
import { toast } from '@/hooks/use-toast';
import { getChainIdFromName, getChainNameFromId, SupportedChain } from '@/utils/withdrawalValidation';

export const useNetworkManager = (targetChain: SupportedChain, shouldSwitch: boolean = true) => {
  const { wallets } = useWallets();
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const [currentChain, setCurrentChain] = useState<SupportedChain | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    if (!shouldSwitch || !wallets[0]) return;

    const validateAndSwitchNetwork = async () => {
      setIsValidating(true);
      
      try {
        // Get current chain ID
        const currentChainId = await wallets[0].getChainId();
        const currentChainName = getChainNameFromId(currentChainId);
        setCurrentChain(currentChainName);

        // Check if we're on the correct network
        const targetChainId = getChainIdFromName(targetChain);
        const isCorrect = currentChainId === targetChainId;
        setIsCorrectNetwork(isCorrect);

        // If not on correct network, attempt to switch
        if (!isCorrect) {
          console.log(`Current chain: ${currentChainName} (${currentChainId}), Target: ${targetChain} (${targetChainId})`);
          
          await wallets[0].switchChain(targetChainId);
          
          toast({
            title: "Network Switched",
            description: `Successfully switched to ${targetChain} network.`,
          });
          
          setIsCorrectNetwork(true);
          setCurrentChain(targetChain);
        }
      } catch (error) {
        console.error(`Failed to switch to ${targetChain}:`, error);
        
        toast({
          title: "Network Switch Required",
          description: `Please manually switch to ${targetChain} network in your wallet to continue.`,
          variant: "destructive"
        });
        
        setIsCorrectNetwork(false);
      } finally {
        setIsValidating(false);
      }
    };

    validateAndSwitchNetwork();
  }, [wallets, targetChain, shouldSwitch]);

  return {
    isCorrectNetwork,
    currentChain,
    isValidating,
    targetChain
  };
};
