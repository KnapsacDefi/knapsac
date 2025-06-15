
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";
import { createConfig, http } from "wagmi";
import { mainnet, polygon, base } from "wagmi/chains";
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

// Read PRIVY_APP_ID from secrets injected by Lovable
const PRIVY_APP_ID =
  typeof window !== "undefined" && (window as any).lovableSecrets
    ? (window as any).lovableSecrets["PRIVY_APP_ID"]
    : undefined;

const App = () => {
  console.log("App.tsx: Inside App() function.");

  // Show a helpful UI if no Privy App ID is present
  if (!PRIVY_APP_ID) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-red-600 mb-4 text-xl font-bold">Missing PRIVY_APP_ID secret</div>
          <div className="mb-2 text-muted-foreground">You must set the <b>PRIVY_APP_ID</b> secret in Lovable before this app will work.</div>
        </div>
      </div>
    );
  }

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
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

