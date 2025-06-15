
import { Wallet, Banknote, CreditCard, Gift } from "lucide-react";

const DashboardHeader = () => (
  <header className="flex items-center justify-between px-8 py-6 border-b bg-background">
    <div className="flex items-center gap-3">
      <Wallet className="text-primary w-9 h-9" />
      <span className="text-2xl font-bold tracking-tight text-primary">
        Privy Crypto Hub
      </span>
    </div>
    <nav className="flex gap-6 items-center text-muted-foreground">
      {/* Future location for notifications, settings, profile */}
    </nav>
  </header>
);

export default DashboardHeader;
