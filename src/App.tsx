
import React, { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { PrivyProvider } from '@privy-io/react-auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from "@/components/ui/toaster"
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PrivyErrorBoundary } from '@/components/PrivyErrorBoundary';
import { AuthErrorBoundary } from '@/components/AuthErrorBoundary';
import WalletConnectionGuard from '@/components/WalletConnectionGuard';
import Index from '@/pages/Index';
import Wallet from '@/pages/Wallet';
import Withdraw from '@/pages/Withdraw';
import WithdrawWallet from '@/pages/WithdrawWallet';
import WithdrawMobileMoney from '@/pages/WithdrawMobileMoney';
import Profile from '@/pages/Profile';
import Terms from '@/pages/Terms';
import ServiceProviderMotivation from '@/pages/ServiceProviderMotivation';
import Subscription from '@/pages/Subscription';
import NotFound from '@/pages/NotFound';
import LendingPoolDetail from '@/pages/LendingPoolDetail';
import LendingTokenSelection from '@/pages/LendingTokenSelection';
import Portfolio from '@/pages/Portfolio';
import { WagmiProvider } from 'wagmi';
import { wagmiConfig } from '@/lib/wagmi';
import { supabase } from '@/integrations/supabase/client';
import { AuthProvider } from '@/contexts/AuthContext';

const queryClient = new QueryClient();

function App() {
  const [privyAppId, setPrivyAppId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrivyConfig = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-privy-config');
        
        if (error) {
          console.error('Error fetching Privy config:', error);
          setError('Failed to load Privy configuration');
          return;
        }
        
        if (data?.appId) {
          setPrivyAppId(data.appId);
        } else {
          setError('Privy app ID not found');
        }
      } catch (err) {
        console.error('Error fetching Privy config:', err);
        setError('Failed to load configuration');
      } finally {
        setLoading(false);
      }
    };

    fetchPrivyConfig();
  }, []);

  const handlePrivyRetry = () => {
    setError(null);
    setLoading(true);
    // Retry fetching Privy config
    setTimeout(() => {
      const fetchPrivyConfig = async () => {
        try {
          const { data, error } = await supabase.functions.invoke('get-privy-config');
          
          if (error) {
            console.error('Error fetching Privy config:', error);
            setError('Failed to load Privy configuration');
            return;
          }
          
          if (data?.appId) {
            setPrivyAppId(data.appId);
          } else {
            setError('Privy app ID not found');
          }
        } catch (err) {
          console.error('Error fetching Privy config:', err);
          setError('Failed to load configuration');
        } finally {
          setLoading(false);
        }
      };

      fetchPrivyConfig();
    }, 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (error || !privyAppId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Error: {error || 'Failed to load Privy configuration'}</div>
      </div>
    );
  }

  return (
    <PrivyErrorBoundary onRetry={handlePrivyRetry}>
      <PrivyProvider
        appId={privyAppId}
        config={{
          loginMethods: ['email', 'wallet'],
          appearance: {
            accentColor: '#6366F1',
            theme: 'light',
            logo: '/logo.svg',
          },
          embeddedWallets: {
            createOnLogin: 'users-without-wallets',
          },
        }}
      >
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <AuthErrorBoundary>
              <AuthProvider>
                <Toaster />
                <ErrorBoundary>
                  <BrowserRouter>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/wallet" element={<Wallet />} />
                      <Route path="/withdraw" element={<Withdraw />} />
                      <Route 
                        path="/withdraw/wallet" 
                        element={
                          <WalletConnectionGuard requireWallet={true}>
                            <WithdrawWallet />
                          </WalletConnectionGuard>
                        } 
                      />
                      <Route 
                        path="/withdraw/mobile-money" 
                        element={
                          <WalletConnectionGuard requireWallet={true}>
                            <WithdrawMobileMoney />
                          </WalletConnectionGuard>
                        } 
                      />
                      <Route 
                        path="/lending-pool/:id" 
                        element={
                          <WalletConnectionGuard requireWallet={true}>
                            <LendingPoolDetail />
                          </WalletConnectionGuard>
                        } 
                      />
                      <Route 
                        path="/lending/:poolId/tokens" 
                        element={
                          <WalletConnectionGuard requireWallet={true}>
                            <LendingTokenSelection />
                          </WalletConnectionGuard>
                        } 
                      />
                      <Route 
                        path="/portfolio" 
                        element={
                          <WalletConnectionGuard requireWallet={true}>
                            <Portfolio />
                          </WalletConnectionGuard>
                        } 
                      />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/terms" element={<Terms />} />
                      <Route path="/service-provider-motivation" element={<ServiceProviderMotivation />} />
                      <Route path="/subscription" element={<Subscription />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </BrowserRouter>
                </ErrorBoundary>
              </AuthProvider>
            </AuthErrorBoundary>
          </QueryClientProvider>
        </WagmiProvider>
      </PrivyProvider>
    </PrivyErrorBoundary>
  );
}

export default App;
