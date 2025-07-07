import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";
import { createConfig, http } from "wagmi";
import { mainnet, polygon, base } from "wagmi/chains";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import Index from "./pages/Index";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import Wallet from "./pages/Wallet";
import Subscription from "./pages/Subscription";
import ServiceProviderMotivation from "./pages/ServiceProviderMotivation";
import Terms from "./pages/Terms";

console.log("App.tsx: Top-level entry");

const queryClient = new QueryClient();

// Define Tron network
const tron = {
  id: 728126428,
  name: 'Tron',
  network: 'tron',
  nativeCurrency: {
    decimals: 6,
    name: 'TRX',
    symbol: 'TRX',
  },
  rpcUrls: {
    public: { http: ['https://api.trongrid.io'] },
    default: { http: ['https://api.trongrid.io'] },
  },
  blockExplorers: {
    default: { name: 'Tronscan', url: 'https://tronscan.org' },
  },
};

const wagmiConfig = createConfig({
  chains: [mainnet, tron, polygon, base],
  transports: {
    [mainnet.id]: http(),
    [tron.id]: http(),
    [polygon.id]: http(),
    [base.id]: http(),
  },
});

const App = () => {
  const [privyAppId, setPrivyAppId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  console.log("App.tsx: Inside App() function.");

  useEffect(() => {
    const fetchPrivyAppId = async () => {
      try {
        console.log("App.tsx: Fetching PRIVY_APP_ID from Supabase...");
        
        const { data, error } = await supabase.functions.invoke('get-secret', {
          body: { secret_name: 'PRIVY_APP_ID' }
        });
        
        console.log("App.tsx: Supabase response:", { data, error });
        
        if (error) {
          console.error('Error fetching PRIVY_APP_ID:', error);
          setError(`Error fetching PRIVY_APP_ID: ${error.message || 'Unknown error'}`);
          setPrivyAppId(null);
        } else if (data?.secret_value) {
          // Trim whitespace from the secret value
          const trimmedSecret = data.secret_value.trim();
          console.log("App.tsx: Successfully retrieved PRIVY_APP_ID");
          console.log("App.tsx: Original value:", JSON.stringify(data.secret_value));
          console.log("App.tsx: Trimmed value:", JSON.stringify(trimmedSecret));
          setPrivyAppId(trimmedSecret);
          setError(null);
        } else {
          console.error('No secret value returned from get-secret function');
          setError('No secret value returned from get-secret function');
          setPrivyAppId(null);
        }
      } catch (err) {
        console.error('Error fetching PRIVY_APP_ID:', err);
        setError(`Error fetching PRIVY_APP_ID: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setPrivyAppId(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPrivyAppId();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error if there's an issue fetching the secret
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-red-600 mb-4 text-xl font-bold">Configuration Error</div>
          <div className="mb-2 text-muted-foreground">{error}</div>
          <div className="text-sm text-muted-foreground mt-4">
            Please check that the <b>PRIVY_APP_ID</b> secret is properly set in Supabase.
          </div>
        </div>
      </div>
    );
  }

  // Show a helpful UI if no Privy App ID is present
  if (!privyAppId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-red-600 mb-4 text-xl font-bold">Missing PRIVY_APP_ID secret</div>
          <div className="mb-2 text-muted-foreground">You must set the <b>PRIVY_APP_ID</b> secret in Supabase before this app will work.</div>
        </div>
      </div>
    );
  }

  // Validate that privyAppId looks like a valid Privy App ID
  if (typeof privyAppId !== 'string' || privyAppId.trim().length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-red-600 mb-4 text-xl font-bold">Invalid PRIVY_APP_ID</div>
          <div className="mb-2 text-muted-foreground">The PRIVY_APP_ID secret appears to be empty or invalid.</div>
          <div className="text-sm text-muted-foreground">Current value: "{privyAppId}"</div>
        </div>
      </div>
    );
  }

  console.log("App.tsx: Initializing PrivyProvider with app ID:", privyAppId);

  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        appearance: {
          theme: "light",
          accentColor: "#676FFF",
        },
        embeddedWallets: {
          createOnLogin: "users-without-wallets",
        },
        defaultChain: mainnet,
        supportedChains: [mainnet, tron, polygon, base],
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
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
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
};

export default App;
