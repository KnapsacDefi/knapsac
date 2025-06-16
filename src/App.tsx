
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
import NotFound from "./pages/NotFound";

console.log("App.tsx: Top-level entry");

const queryClient = new QueryClient();

const wagmiConfig = createConfig({
  chains: [mainnet, polygon, base],
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [base.id]: http(),
  },
});

const App = () => {
  const [privyAppId, setPrivyAppId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  console.log("App.tsx: Inside App() function.");

  useEffect(() => {
    const fetchPrivyAppId = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-secret', {
          body: { secret_name: 'PRIVY_APP_ID' }
        });
        
        if (error) {
          console.error('Error fetching PRIVY_APP_ID:', error);
          setPrivyAppId(null);
        } else {
          setPrivyAppId(data?.secret_value || null);
        }
      } catch (error) {
        console.error('Error fetching PRIVY_APP_ID:', error);
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
