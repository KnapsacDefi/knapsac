
import { Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";

const WalletOverview = () => (
  <section className="bg-card p-8 rounded-2xl shadow-lg grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
    <div className="flex flex-col items-center col-span-1 md:items-start">
      <span className="text-sm text-muted-foreground mb-1">Wallet Balance</span>
      <div className="flex items-center mt-1 mb-4 md:mb-0">
        <Banknote className="w-10 h-10 mr-3 text-green-500" />
        <span className="text-3xl font-bold tracking-tight">$12,000</span>
      </div>
      <span className="text-xs text-muted-foreground">
        Powered by <span className="font-medium text-primary">Privy</span>
      </span>
    </div>
    <div className="flex flex-col justify-center items-center md:col-span-2">
      <div className="flex gap-4 w-full justify-end">
        <Button className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/80">
          Deposit
        </Button>
        <Button className="bg-secondary px-6 py-2 rounded-lg hover:bg-secondary/90 text-primary">
          Withdraw
        </Button>
        <Button className="bg-muted px-6 py-2 rounded-lg hover:bg-muted/80 text-primary">
          Buy Crypto
        </Button>
      </div>
      <div className="w-full text-xs text-muted-foreground text-right pt-2">
        Privy wallet integration coming soon
      </div>
    </div>
  </section>
);

export default WalletOverview;
