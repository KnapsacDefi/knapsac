import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { PrivyProvider, PrivyErrorBoundary } from '@privy-io/react-auth';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import ErrorBoundary from './ErrorBoundary';
import LandingPage from './LandingPage';
import Dashboard from './Dashboard';
import Wallet from './Wallet';
import Profile from './Profile';
import TermsOfService from './TermsOfService';
import PrivacyPolicy from './PrivacyPolicy';
import GoodDollarClaim from './GoodDollarClaim';
import ServiceProviderMotivation from './ServiceProviderMotivation';
import { WagmiProvider } from 'wagmi';
import { wagmiConfig } from '@/lib/wagmi';

const queryClient = new QueryClient();

function App() {
  return (
    <PrivyProvider
      appId={import.meta.env.VITE_PRIVY_APP_ID}
      config={{
        loginMethods: ['email', 'wallet'],
        appearance: {
          accentColor: '#6366F1',
          theme: 'light',
          borderRadius: 8,
          fontFamily: 'Inter, sans-serif',
          logo: '/logo.svg',
        },
        embeddedWallets: {
          requestUsersky: true,
        },
      }}
    >
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
            <Toaster />
            <PrivyErrorBoundary>
              <ErrorBoundary>
                <BrowserRouter>
                  <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/wallet" element={<Wallet />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/terms" element={<TermsOfService />} />
                    <Route path="/privacy" element={<PrivacyPolicy />} />
                    <Route path="/claim" element={<GoodDollarClaim />} />
                    <Route path="/service-provider-motivation" element={<ServiceProviderMotivation />} />
                  </Routes>
                </BrowserRouter>
              </ErrorBoundary>
            </PrivyErrorBoundary>
          </ThemeProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </PrivyProvider>
  );
}

export default App;
