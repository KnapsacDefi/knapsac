
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSimpleWalletLoading } from '@/hooks/useSimpleWalletLoading';
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
  const { hasWallet, isWalletLoading } = useSimpleWalletLoading();

  // Don't show anything while auth is loading
  if (!ready) {
    return (
      <div className="min-h-screen flex flex-col bg-background pb-20">
        <DashboardHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
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

  // Show wallet loading screen if required but still loading
  if (requireWallet && isWalletLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background pb-20">
        <DashboardHeader />
        
        <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full flex items-center justify-center">
          <Card className="w-full">
            <CardHeader className="text-center">
              <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
              <CardTitle>Loading Wallet</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                Please wait while we load your wallet information...
              </p>
              
              <Button 
                variant="outline"
                onClick={() => navigate('/')}
                className="w-full"
              >
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </main>

        <BottomNavigation />
      </div>
    );
  }

  // Show children if wallet is loaded or not required
  return <>{children}</>;
};

export default WalletConnectionGuard;
