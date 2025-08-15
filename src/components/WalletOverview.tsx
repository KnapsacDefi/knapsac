
import { Banknote, Eye, EyeOff, Coins } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFundWallet } from "@privy-io/react-auth";
import { useState, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import WalletOverviewSkeleton from "./skeletons/WalletOverviewSkeleton";
import { isWalletConnected, getWalletAddress } from "@/utils/walletUtils";
import { useCreditScore } from "@/hooks/useCreditScore";

interface WalletOverviewProps {
  userProfile?: any;
  hasSubscription?: boolean;
  balance?: string;
  loading?: {
    profile?: boolean;
    subscription?: boolean;
    usdc?: boolean;
  };
  user?: any;
  wallets?: any[];
}

const WalletOverview = ({ 
  userProfile,
  hasSubscription,
  balance = "0.00",
  loading = {},
  user,
  wallets = []
}: WalletOverviewProps) => {
  // ALWAYS call ALL hooks at the beginning - never conditionally
  const navigate = useNavigate();
  const [showBalance, setShowBalance] = useState(true);

  // Use unified wallet connection check
  const hasWallet = isWalletConnected(wallets, user);
  
  // Get wallet address for credit score
  const walletAddress = getWalletAddress(wallets, user);
  const { score } = useCreditScore(walletAddress || undefined);
  
  // ALWAYS call useFundWallet hook to maintain consistent hook order
  const fundWalletHook = useFundWallet({
    onUserExited: (params) => {
      if (params.balance > 0) {
        toast({
          title: "Wallet Funded Successfully",
          description: `New balance: ${params.balance}`,
        });
      }
    }
  });

  const handleDeposit = useCallback(async () => {
    try {
      if (!hasWallet) {
        toast({
          title: "No Wallet Available",
          description: "Please connect a wallet first.",
          variant: "destructive"
        });
        return;
      }

      // Use the first available wallet address for funding
      const walletToFund = wallets.length > 0 ? wallets[0] : user?.wallet;
      if (walletToFund?.address) {
        await fundWalletHook.fundWallet(walletToFund.address);
      }
    } catch (error: any) {
      console.error('Deposit error:', error);
      
      // Handle browser extension conflicts
      if (error.message?.includes('inpage') || error.message?.includes('MetaMask')) {
        toast({
          title: "Browser Extension Conflict",
          description: "Please disable other wallet extensions and try again.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Deposit Failed",
          description: "Unable to open funding interface. Please try again.",
          variant: "destructive"
        });
      }
    }
  }, [hasWallet, wallets, user, fundWalletHook]);

  const handleCreditClick = useCallback(() => {
    if (score !== null && score < 500) {
      toast({
        title: "Credit Score Below Threshold",
        description: `Your current credit score is ${score}. A score of 500 or higher is required for credit features.`,
        variant: "default"
      });
    } else if (score !== null) {
      toast({
        title: "Credit Score Verified", 
        description: `Your credit score of ${score} qualifies you for credit features.`,
        variant: "default"
      });
    } else {
      toast({
        title: "Credit Score Loading",
        description: "Please wait while we fetch your credit score...",
        variant: "default"
      });
    }
  }, [score]);

  // NOW check for loading state AFTER all hooks are called
  const isLoading = loading.usdc;

  // Show skeleton while essential data is loading - but AFTER all hooks are called
  if (loading.profile || loading.usdc) {
    return <WalletOverviewSkeleton />;
  }

  const displayBalance = isLoading ? "Loading..." : `$${balance}`;

  const isStartup = userProfile?.profile_type === 'Startup';
  const isLender = userProfile?.profile_type === 'Lender';
  const isServiceProvider = userProfile?.profile_type === 'Service Provider';
  const hasSignedTerms = userProfile?.signed_terms_hash && userProfile.signed_terms_hash.trim() !== '';

  // Calculate visible buttons for dynamic grid layout
  const buttons = [];
  
  // Deposit button - for all user types
  buttons.push('deposit');
  
  // Withdraw button - for all user types
  buttons.push('withdraw');
  
  // Claim button - for Lenders only
  if (isLender) {
    buttons.push('claim');
  }
  
  // Credit button - for Startups with signed terms
  if (isStartup && hasSignedTerms) {
    buttons.push('credit');
  }

  const gridCols = buttons.length === 3 ? 'grid-cols-3' : buttons.length === 2 ? 'grid-cols-2' : 'grid-cols-1';

  return (
    <section className="bg-card p-6 rounded-2xl shadow-lg border">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-sm text-muted-foreground">Wallet Balance</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setShowBalance(!showBalance)}
          >
            {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </Button>
        </div>
        
        <div className="flex items-center justify-center">
          <Banknote className="w-6 h-6 mr-2 text-blue-500" />
          <div className="text-center">
            <div className="text-2xl font-bold">
              {showBalance ? displayBalance : "••••••"}
            </div>
            <div className="text-xs text-muted-foreground">USDC</div>
          </div>
        </div>
        
        {/* All Tokens Badge */}
        <div className="flex justify-center mt-2 mb-4">
          <Badge 
            variant="outline" 
            className="cursor-pointer hover:bg-muted transition-colors flex items-center gap-1"
            onClick={() => navigate('/withdraw')}
          >
            <Coins className="w-3 h-3" />
            All Tokens
          </Badge>
        </div>
      </div>

      <div className={`grid ${gridCols} gap-2`}>
        {/* Deposit button - for all user types */}
        <Button 
          className="h-12 flex flex-col gap-1 bg-primary text-white"
          disabled={!hasWallet}
          onClick={handleDeposit}
        >
          <span className="text-xs">Deposit</span>
        </Button>
        
        {/* Withdraw button - for all user types */}
        <Button 
          variant="outline" 
          className="h-12 flex flex-col gap-1"
          onClick={() => navigate('/withdraw')}
        >
          <span className="text-xs">Withdraw</span>
        </Button>
        
        {/* Claim button - for Lenders only */}
        {isLender && (
          <Button 
            variant="outline" 
            className="h-12 flex flex-col gap-1"
            onClick={() => navigate('/portfolio')}
          >
            <span className="text-xs">Claim</span>
          </Button>
        )}
        
        {/* Credit button - for Startups with signed terms */}
        {isStartup && hasSignedTerms && (
          <Button 
            variant="outline" 
            className="h-12 flex flex-col gap-1"
            onClick={handleCreditClick}
          >
            <span className="text-xs">Credit</span>
          </Button>
        )}
      </div>

    </section>
  );
};

export default WalletOverview;
