
import { usePrivy } from "@privy-io/react-auth";
import { Copy, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const UserAddressDisplay = () => {
  const { user } = usePrivy();
  const { toast } = useToast();

  const walletAddress = user?.wallet?.address;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Wallet address copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Could not copy address to clipboard",
        variant: "destructive",
      });
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!walletAddress) {
    return (
      <section className="bg-card p-4 rounded-2xl shadow-lg border">
        <div className="flex items-center gap-2 mb-2">
          <Wallet className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold">Wallet Address</h3>
        </div>
        <p className="text-sm text-muted-foreground">No wallet connected</p>
      </section>
    );
  }

  return (
    <section className="bg-card p-4 rounded-2xl shadow-lg border">
      <div className="flex items-center gap-2 mb-2">
        <Wallet className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Wallet Address</h3>
      </div>
      <div className="flex items-center justify-between bg-muted p-3 rounded-lg">
        <div className="flex flex-col">
          <span className="text-sm font-mono text-muted-foreground">
            {formatAddress(walletAddress)}
          </span>
          <span className="text-xs text-muted-foreground mt-1">
            Click to copy full address
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => copyToClipboard(walletAddress)}
          className="h-8 w-8"
        >
          <Copy className="w-4 h-4" />
        </Button>
      </div>
    </section>
  );
};

export default UserAddressDisplay;
