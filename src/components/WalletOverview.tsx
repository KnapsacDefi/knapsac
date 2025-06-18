
import { Banknote, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePrivy } from "@privy-io/react-auth";
import { useState } from "react";

const WalletOverview = () => {
  const { user } = usePrivy();
  const [showBalance, setShowBalance] = useState(true);

  return (
    <section className="bg-card p-6 rounded-2xl shadow-lg border">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-sm text-muted-foreground">Total Balance</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setShowBalance(!showBalance)}
          >
            {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </Button>
        </div>
        <div className="flex items-center justify-center mb-2">
          <Banknote className="w-8 h-8 mr-2 text-green-500" />
          <span className="text-3xl font-bold">
            {showBalance ? "$12,000.00" : "••••••"}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          Powered by <span className="font-medium text-primary">Privy</span>
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Button className="h-12 flex flex-col gap-1 bg-primary text-white">
          <span className="text-xs">Deposit</span>
        </Button>
        <Button variant="secondary" className="h-12 flex flex-col gap-1">
          <span className="text-xs">Lend</span>
        </Button>
        <Button variant="outline" className="h-12 flex flex-col gap-1">
          <span className="text-xs">Credit</span>
        </Button>
      </div>
    </section>
  );
};

export default WalletOverview;
