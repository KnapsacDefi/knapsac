import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { PrivyProvider } from '@privy-io/react-auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from "@/components/ui/toaster"
import { ErrorBoundary } from '@/components/ErrorBoundary';
import Index from '@/pages/Index';
import Wallet from '@/pages/Wallet';
import Profile from '@/pages/Profile';
import Terms from '@/pages/Terms';
import GoodDollarClaim from '@/pages/GoodDollarClaim';
import ServiceProviderMotivation from '@/pages/ServiceProviderMotivation';
import Subscription from '@/pages/Subscription';
import NotFound from '@/pages/NotFound';
import { WagmiProvider } from 'wagmi';
import { wagmiConfig } from '@/lib/wagmi';

const queryClient = new QueryClient();

function App() {
  return (
    <PrivyProvider
      appId="clz0upvvw06pr9b1xo1p4g9nz"
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
          <Toaster />
          <ErrorBoundary>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/wallet" element={<Wallet />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/claim" element={<GoodDollarClaim />} />
                <Route path="/service-provider-motivation" element={<ServiceProviderMotivation />} />
                <Route path="/subscription" element={<Subscription />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </ErrorBoundary>
        </QueryClientProvider>
      </WagmiProvider>
    </PrivyProvider>
  );
}

export default App;
