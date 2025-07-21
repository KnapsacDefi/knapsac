
import React from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { SupportedChain } from '@/constants/tokens';

interface NetworkStatusProps {
  isCorrectNetwork: boolean;
  currentChain: SupportedChain | null;
  targetChain: SupportedChain;
  isValidating: boolean;
  isSwitching: boolean;
  switchError: string | null;
  onRetry: () => void;
  showWhenCorrect?: boolean;
}

const NetworkStatus: React.FC<NetworkStatusProps> = ({
  isCorrectNetwork,
  currentChain,
  targetChain,
  isValidating,
  isSwitching,
  switchError,
  onRetry,
  showWhenCorrect = false
}) => {
  const formatChainName = (chain: string) => {
    return chain.charAt(0).toUpperCase() + chain.slice(1);
  };

  // Show success state only if explicitly requested
  if (isCorrectNetwork && showWhenCorrect) {
    return (
      <Alert className="mb-4 border-green-200 bg-green-50">
        <Wifi className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          Connected to {formatChainName(targetChain)} network
        </AlertDescription>
      </Alert>
    );
  }

  // Show switching state
  if (isSwitching || isValidating) {
    return (
      <Alert className="mb-4">
        <RefreshCw className="h-4 w-4 animate-spin" />
        <AlertDescription>
          {isSwitching ? `Switching to ${formatChainName(targetChain)} network...` : 
           isValidating ? `Validating ${formatChainName(targetChain)} network...` : 
           `Connecting to ${formatChainName(targetChain)} network...`}
        </AlertDescription>
      </Alert>
    );
  }

  // Show error state
  if (!isCorrectNetwork) {
    const currentDisplay = currentChain ? formatChainName(currentChain) : 'Unknown';
    const targetDisplay = formatChainName(targetChain);
    
    return (
      <Alert className="mb-4" variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="space-y-2">
          <div>
            {switchError || `Connected to ${currentDisplay} network. Please switch to ${targetDisplay} network to continue.`}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="h-8"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Retry
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Show manual instructions
                const instructions = `To switch manually:\n1. Open your wallet\n2. Go to network settings\n3. Select ${targetDisplay} network`;
                navigator.clipboard?.writeText(instructions);
              }}
              className="h-8"
            >
              <WifiOff className="w-3 h-3 mr-1" />
              Manual Switch
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};

export default NetworkStatus;
