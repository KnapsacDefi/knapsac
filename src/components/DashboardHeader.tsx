
import { Wallet, LogOut, Settings } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";

const DashboardHeader = () => {
  const { logout, user } = usePrivy();

  return (
    <header className="flex items-center justify-between px-4 py-4 border-b bg-background sticky top-0 z-10">
      <div className="flex items-center gap-2">
        <Wallet className="text-primary w-8 h-8" />
        <span className="text-xl font-bold text-primary">
          Privy Crypto
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon">
          <Settings className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={logout}>
          <LogOut className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
};

export default DashboardHeader;
