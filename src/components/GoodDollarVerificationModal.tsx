import { useState, useEffect } from 'react';
import { X, Shield } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface GoodDollarVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerificationComplete: () => void;
  walletAddress: string;
}

export const GoodDollarVerificationModal = ({
  isOpen,
  onClose,
  onVerificationComplete,
  walletAddress
}: GoodDollarVerificationModalProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [verificationStarted, setVerificationStarted] = useState(false);

  const verificationUrl = `https://wallet.gooddollar.org/?screen=FaceVerification&web3Provider=WalletConnect&address=${walletAddress}&redirect=${encodeURIComponent(window.location.origin + '/wallet')}`;

  useEffect(() => {
    if (!isOpen) {
      setIsLoading(true);
      setVerificationStarted(false);
      return;
    }

    // Listen for postMessage from iframe
    const handleMessage = (event: MessageEvent) => {
      // Verify origin for security
      if (event.origin !== 'https://wallet.gooddollar.org') {
        return;
      }

      // Handle verification completion
      if (event.data?.type === 'verification_complete' || event.data?.verified) {
        toast({
          title: "Verification Complete",
          description: "Your identity has been verified with GoodDollar.",
        });
        onVerificationComplete();
        onClose();
      }
    };

    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [isOpen, onVerificationComplete, onClose]);

  const handleIframeLoad = () => {
    setIsLoading(false);
    setVerificationStarted(true);
  };

  const handleCancel = () => {
    toast({
      title: "Verification Cancelled",
      description: "You can start verification again when ready.",
      variant: "destructive"
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-primary" />
              <DialogTitle>GoodDollar Identity Verification</DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Complete your face verification with GoodDollar to enable token claiming.
          </p>
        </DialogHeader>

        <div className="relative flex-1 min-h-[600px] p-6 pt-0">
          {isLoading && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground">Loading GoodDollar verification...</p>
              </div>
            </div>
          )}
          
          <iframe
            src={verificationUrl}
            className="w-full h-[600px] border rounded-lg"
            onLoad={handleIframeLoad}
            title="GoodDollar Identity Verification"
            allow="camera; microphone"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
          />
          
          {verificationStarted && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                💡 <strong>Tip:</strong> Follow the instructions in the frame above to complete your face verification. 
                This process helps secure the GoodDollar network and enables you to claim tokens.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};