
import { Copy, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatWalletAddress } from "@/utils/walletUtils";

interface UserAddressDisplayProps {
  walletAddress?: string | null;
  isLoading?: boolean;
}

const UserAddressDisplay = ({ walletAddress, isLoading }: UserAddressDisplayProps) => {
  const { toast } = useToast();

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

  if (isLoading) {
    return (
      <section className="bg-card p-4 rounded-2xl shadow-lg border">
        <div className="flex items-center gap-2 mb-2">
          <Wallet className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold">Wallet Address</h3>
        </div>
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-muted rounded w-1/2"></div>
        </div>
      </section>
    );
  }

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
            {formatWalletAddress(walletAddress)}
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
