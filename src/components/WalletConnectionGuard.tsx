
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Wallet, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useWalletReconnection } from '@/hooks/useWalletReconnection';
import DashboardHeader from '@/components/DashboardHeader';
import BottomNavigation from '@/components/BottomNavigation';

interface WalletConnectionGuardProps {
  children: React.ReactNode;
  requireWallet?: boolean;
}

const WalletConnectionGuard: React.FC<WalletConnectionGuardProps> = ({ 
  children, 
  requireWallet = true 
}) => {
  const navigate = useNavigate();
  const { ready, authenticated } = useAuth();
  const { 
    hasWallet, 
    needsReconnection, 
    isReconnecting, 
    isAutoReconnecting,
    autoReconnectAttempts,
    autoReconnectFailed,
    maxAutoReconnectAttempts,
    reconnectWallet,
    resetAutoReconnection
  } = useWalletReconnection();

  // Don't show anything while auth is loading
  if (!ready) {
    return (
      <div className="min-h-screen flex flex-col bg-background pb-20">
        <DashboardHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p>Loading...</p>
          </div>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  // Redirect to home if not authenticated
  if (!authenticated) {
    navigate('/');
    return null;
  }

  // Show wallet connection screens if required but not available
  if (requireWallet && needsReconnection) {
    // Show automatic reconnection in progress
    if (isAutoReconnecting && !autoReconnectFailed) {
      return (
        <div className="min-h-screen flex flex-col bg-background pb-20">
          <DashboardHeader />
          
          <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full flex items-center justify-center">
            <Card className="w-full">
              <CardHeader className="text-center">
                <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
                <CardTitle>Reconnecting Wallet</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <Alert>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <AlertDescription>
                    Automatically reconnecting your wallet... 
                    (Attempt {autoReconnectAttempts}/{maxAutoReconnectAttempts})
                  </AlertDescription>
                </Alert>
                
                <p className="text-muted-foreground text-sm">
                  Please wait while we restore your wallet connection.
                </p>
                
                <Button 
                  variant="outline"
                  onClick={() => {
                    resetAutoReconnection();
                    navigate('/');
                  }}
                  className="w-full"
                >
                  Cancel & Return to Dashboard
                </Button>
              </CardContent>
            </Card>
          </main>

          <BottomNavigation />
        </div>
      );
    }

    // Show manual reconnection as fallback
    return (
      <div className="min-h-screen flex flex-col bg-background pb-20">
        <DashboardHeader />
        
        <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full flex items-center justify-center">
          <Card className="w-full">
            <CardHeader className="text-center">
              <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <CardTitle>Wallet Connection Required</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <Alert>
                <Wallet className="h-4 w-4" />
                <AlertDescription>
                  {autoReconnectFailed 
                    ? `Automatic reconnection failed after ${maxAutoReconnectAttempts} attempts. Please try reconnecting manually.`
                    : "A wallet connection is required to access withdrawal features. Your wallet may have been disconnected during navigation."
                  }
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <Button 
                  onClick={reconnectWallet}
                  disabled={isReconnecting}
                  className="w-full"
                >
                  {isReconnecting ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Reconnecting...
                    </>
                  ) : (
                    <>
                      <Wallet className="w-4 h-4 mr-2" />
                      Reconnect Wallet
                    </>
                  )}
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => navigate('/')}
                  className="w-full"
                >
                  Return to Dashboard
                </Button>

                {autoReconnectFailed && (
                  <Button 
                    variant="ghost"
                    size="sm"
                    onClick={resetAutoReconnection}
                    className="w-full text-xs"
                  >
                    Try Automatic Reconnection Again
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </main>

        <BottomNavigation />
      </div>
    );
  }

  // Show children if wallet is connected or not required
  return <>{children}</>;
};

export default WalletConnectionGuard;
