
import DashboardHeader from "@/components/DashboardHeader";
import WalletOverview from "@/components/WalletOverview";
import EmbeddedServices from "@/components/EmbeddedServices";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background transition-colors duration-200">
      <DashboardHeader />
      <main className="flex-1 px-8 py-8 max-w-7xl mx-auto w-full">
        <WalletOverview />
        <h2 className="text-2xl font-bold my-6">Embedded Services</h2>
        <EmbeddedServices />
      </main>
    </div>
  );
};

export default Index;
