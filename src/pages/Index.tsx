
import { usePrivy } from "@privy-io/react-auth";
import DashboardHeader from "@/components/DashboardHeader";
import WalletOverview from "@/components/WalletOverview";
import EmbeddedServices from "@/components/EmbeddedServices";
import AuthScreen from "@/components/AuthScreen";

const Index = () => {
  const { ready, authenticated } = usePrivy();

  if (!ready) {
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
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <DashboardHeader />
      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full space-y-6">
        <WalletOverview />
        <div>
          <h2 className="text-xl font-bold mb-4">Services</h2>
          <EmbeddedServices />
        </div>
      </main>
    </div>
  );
};

export default Index;
