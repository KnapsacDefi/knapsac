import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PrivyErrorBoundary } from "@/components/PrivyErrorBoundary";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PrivyProvider } from "@privy-io/react-auth";
import { mainnet, polygon, base } from "viem/chains";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import Index from "./pages/Index";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import Wallet from "./pages/Wallet";
import Subscription from "./pages/Subscription";
import ServiceProviderMotivation from "./pages/ServiceProviderMotivation";
import Terms from "./pages/Terms";



const queryClient = new QueryClient();

const App = () => {
  // Replace with your actual Privy App ID - this is a public identifier, not a secret
  const privyAppId = 'cmby0t9xh037old0ngdyu15ct';

  

  return (
    <ErrorBoundary>
      <PrivyErrorBoundary onRetry={() => window.location.reload()}>
        <PrivyProvider
        appId={privyAppId}
        config={{
          appearance: {
            theme: "light",
            accentColor: "#676FFF",
          },
          embeddedWallets: {
            createOnLogin: "all-users",
            requireUserPasswordOnCreate: false,
          },
          loginMethods: ['wallet', 'email'],
          defaultChain: mainnet,
          supportedChains: [mainnet, polygon, base]
        }}
      >
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/wallet" element={<Wallet />} />
                <Route path="/subscription" element={<Subscription />} />
                <Route path="/service-provider-motivation" element={<ServiceProviderMotivation />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </QueryClientProvider>
      </PrivyProvider>
      </PrivyErrorBoundary>
    </ErrorBoundary>
  );
};

export default App;
