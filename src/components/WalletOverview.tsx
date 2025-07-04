
import { Banknote, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useState, useEffect } from "react";
import { formatEther } from "viem";

const WalletOverview = () => {
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const [showBalance, setShowBalance] = useState(true);
  const [balance, setBalance] = useState("0.00");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBalance = async () => {
      if (wallets.length > 0) {
        try {
          setIsLoading(true);
          const wallet = wallets[0]; // Use the first wallet
          const provider = await wallet.getEthereumProvider();
          
          // Get balance in wei
          const balanceWei = await provider.request({
            method: 'eth_getBalance',
            params: [wallet.address, 'latest']
          });
          
          // Convert from wei to ether and format
          const balanceEth = formatEther(BigInt(balanceWei));
          const formattedBalance = parseFloat(balanceEth).toFixed(4);
          setBalance(formattedBalance);
        } catch (error) {
          console.error('Error fetching balance:', error);
          setBalance("0.00");
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    fetchBalance();
  }, [wallets]);

  const displayBalance = isLoading ? "Loading..." : `${balance} ETH`;

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
            {showBalance ? displayBalance : "••••••"}
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
