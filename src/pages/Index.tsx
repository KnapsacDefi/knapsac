import { usePrivy } from "@privy-io/react-auth";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardHeader from "@/components/DashboardHeader";
import WalletOverview from "@/components/WalletOverview";
import EmbeddedServices from "@/components/EmbeddedServices";
import AuthScreen from "@/components/AuthScreen";
import UserAddressDisplay from "@/components/UserAddressDisplay";

const Index = () => {
  const { ready, authenticated } = usePrivy();
  const navigate = useNavigate();

  console.log("Index.tsx: rendered, ready:", ready, "authenticated:", authenticated);

  useEffect(() => {
    if (ready && authenticated) {
      console.log("Index.tsx: user authenticated, redirecting to profile");
      navigate('/profile');
    }
  }, [ready, authenticated, navigate]);

  if (!ready) {
    console.log("Index.tsx: Privy is not ready.");
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    console.log("Index.tsx: user NOT authenticated");
    return <AuthScreen />;
  }

  // This should not be reached due to the useEffect redirect, but keeping as fallback
  console.log("Index.tsx: user authenticated, rendering dashboard");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <DashboardHeader />
      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full space-y-6">
        <WalletOverview />
        <UserAddressDisplay />
        <div>
          <h2 className="text-xl font-bold mb-4">Services</h2>
          <EmbeddedServices />
        </div>
      </main>
    </div>
  );
};

export default Index;
