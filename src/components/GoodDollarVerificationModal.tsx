
import { useState, useEffect } from 'react';
import { X, Shield, ExternalLink, AlertCircle } from 'lucide-react';
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
  onOpenInNewTab?: () => void;
}

export const GoodDollarVerificationModal = ({
  isOpen,
  onClose,
  onVerificationComplete,
  walletAddress,
  onOpenInNewTab
}: GoodDollarVerificationModalProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [verificationStarted, setVerificationStarted] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const verificationUrl = `https://wallet.gooddollar.org/?screen=FaceVerification&web3Provider=WalletConnect&address=${walletAddress}&redirect=${encodeURIComponent(window.location.origin + '/wallet')}`;

  useEffect(() => {
    console.log('🔄 Modal state changed - isOpen:', isOpen);
    
    if (!isOpen) {
      console.log('🔄 Resetting modal state');
      setIsLoading(true);
      setVerificationStarted(false);
      setHasError(false);
      setErrorMessage('');
      return;
    }

    console.log('📱 Setting up verification modal for:', walletAddress);

    // Listen for postMessage from iframe
    const handleMessage = (event: MessageEvent) => {
      console.log('📨 Received postMessage:', {
        origin: event.origin,
        data: event.data,
        expectedOrigin: 'https://wallet.gooddollar.org'
      });

      // Verify origin for security - be more specific about GoodDollar messages
      if (event.origin !== 'https://wallet.gooddollar.org') {
        console.log('⚠️ Ignoring message from unexpected origin:', event.origin);
        return;
      }

      // Handle verification completion with more specific checks
      if (event.data?.type === 'verification_complete' || 
          event.data?.verified === true ||
          (event.data?.status === 'success' && event.data?.verified)) {
        console.log('✅ Verification completed via postMessage');
        toast({
          title: "Verification Complete",
          description: "Your identity has been verified with GoodDollar.",
        });
        onVerificationComplete();
        onClose();
      }

      // Handle verification errors
      if (event.data?.type === 'verification_error' || event.data?.error) {
        console.error('❌ Verification error via postMessage:', event.data);
        setHasError(true);
        setErrorMessage(event.data?.message || 'Verification failed');
      }
    };

    window.addEventListener('message', handleMessage);
    
    return () => {
      console.log('🧹 Cleaning up message listener');
      window.removeEventListener('message', handleMessage);
    };
  }, [isOpen, onVerificationComplete, onClose, walletAddress]);

  const handleIframeLoad = () => {
    console.log('✅ Iframe loaded successfully');
    setIsLoading(false);
    setVerificationStarted(true);
    setHasError(false);
  };

  const handleIframeError = () => {
    console.error('❌ Iframe failed to load');
    setIsLoading(false);
    setHasError(true);
    setErrorMessage('Failed to load verification interface');
  };

  const handleCancel = () => {
    console.log('❌ Verification cancelled by user');
    toast({
      title: "Verification Cancelled",
      description: "You can start verification again when ready.",
      variant: "destructive"
    });
    onClose();
  };

  const handleOpenInNewTab = () => {
    console.log('🔗 Opening verification in new tab (from modal)');
    if (onOpenInNewTab) {
      onOpenInNewTab();
    }
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  console.log('🎭 Rendering modal with state:', {
    isLoading,
    verificationStarted,
    hasError,
    errorMessage
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 z-[100]">
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
          {isLoading && !hasError && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground">Loading GoodDollar verification...</p>
              </div>
            </div>
          )}

          {hasError ? (
            <div className="flex flex-col items-center justify-center h-[600px] space-y-6">
              <AlertCircle className="h-16 w-16 text-destructive" />
              <div className="text-center space-y-4">
                <h3 className="text-lg font-semibold">Verification Interface Error</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  {errorMessage || 'The verification interface failed to load. You can try opening it in a new tab instead.'}
                </p>
                <div className="flex gap-3">
                  <Button onClick={handleOpenInNewTab} className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Open in New Tab
                  </Button>
                  <Button variant="outline" onClick={() => window.location.reload()}>
                    Retry
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <iframe
                src={verificationUrl}
                className="w-full h-[600px] border rounded-lg"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                title="GoodDollar Identity Verification"
                allow="camera; microphone"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
              />
              
              {verificationStarted && !hasError && (
                <div className="mt-4 space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      💡 <strong>Tip:</strong> Follow the instructions in the frame above to complete your face verification. 
                      This process helps secure the GoodDollar network and enables you to claim tokens.
                    </p>
                  </div>
                  
                  <div className="flex justify-center">
                    <Button 
                      variant="outline" 
                      onClick={handleOpenInNewTab}
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Having trouble? Open in New Tab
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
