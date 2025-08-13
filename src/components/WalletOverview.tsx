
import { Banknote, Eye, EyeOff, TrendingUp, Briefcase } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useFundWallet } from "@privy-io/react-auth";
import { useState, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import WalletOverviewSkeleton from "./skeletons/WalletOverviewSkeleton";
import { isWalletConnected } from "@/utils/walletUtils";
import { useLendingPools } from "@/hooks/useLendingPools";

interface WalletOverviewProps {
  userProfile?: any;
  hasSubscription?: boolean;
  balance?: string;
  gooddollarBalance?: string;
  loading?: {
    profile?: boolean;
    subscription?: boolean;
    usdc?: boolean;
    gooddollar?: boolean;
  };
  user?: any;
  wallets?: any[];
}

const WalletOverview = ({ 
  userProfile,
  hasSubscription,
  balance = "0.00",
  gooddollarBalance = "0.00",
  loading = {},
  user,
  wallets = []
}: WalletOverviewProps) => {
  // ALWAYS call ALL hooks at the beginning - never conditionally
  const navigate = useNavigate();
  const [showBalance, setShowBalance] = useState(true);
  const { lendingPools, isLoading: poolsLoading } = useLendingPools();

  // Use unified wallet connection check
  const hasWallet = isWalletConnected(wallets, user);
  
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

  // NOW check for loading state AFTER all hooks are called
  const isLoading = loading.usdc || loading.gooddollar;

  // Show skeleton while essential data is loading - but AFTER all hooks are called
  if (loading.profile || loading.usdc || loading.gooddollar) {
    return <WalletOverviewSkeleton />;
  }

  const displayBalance = isLoading ? "Loading..." : `$${balance}`;
  const displayGooddollarBalance = isLoading ? "Loading..." : `${gooddollarBalance} G$`;

  const isStartup = userProfile?.profile_type === 'Startup';
  const isLender = userProfile?.profile_type === 'Lender';
  const isServiceProvider = userProfile?.profile_type === 'Service Provider';
  const hasSignedTerms = userProfile?.signed_terms_hash && userProfile.signed_terms_hash.trim() !== '';

  return (
    <section className="bg-card p-6 rounded-2xl shadow-lg border">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-sm text-muted-foreground">Wallet Balances</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setShowBalance(!showBalance)}
          >
            {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </Button>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-center">
            <Banknote className="w-6 h-6 mr-2 text-blue-500" />
            <div className="text-center">
              <div className="text-2xl font-bold">
                {showBalance ? displayBalance : "••••••"}
              </div>
              <div className="text-xs text-muted-foreground">USDC</div>
            </div>
          </div>
          
          <div className="flex items-center justify-center">
            <Banknote className="w-6 h-6 mr-2 text-green-500" />
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {showBalance ? displayGooddollarBalance : "••••••"}
              </div>
              <div className="text-xs text-muted-foreground">GoodDollar</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Button 
          className="h-12 flex flex-col gap-1 bg-primary text-white"
          disabled={isServiceProvider || !hasWallet}
          onClick={handleDeposit}
        >
          <span className="text-xs">Deposit</span>
        </Button>
        <Button 
          variant="outline" 
          className="h-12 flex flex-col gap-1"
          onClick={() => navigate('/withdraw')}
        >
          <span className="text-xs">{isLender ? 'Claim' : 'Withdraw'}</span>
        </Button>
        {isStartup && hasSignedTerms && (
          <Button 
            variant="outline" 
            className="h-12 flex flex-col gap-1"
          >
            <span className="text-xs">Credit</span>
          </Button>
        )}
      </div>

      {/* Lending Pools Section for Lenders */}
      {isLender && hasSignedTerms && !poolsLoading && lendingPools.length > 0 && (
        <div className="mt-6 space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Available Lending Pools
          </h3>
          <div className="space-y-3">
            {lendingPools.slice(0, 3).map((pool) => (
              <Card key={pool.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-primary" />
                      <span className="font-medium">${pool.target_amount.toLocaleString()}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-green-600">
                        {pool.monthly_interest}% monthly
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {pool.min_lend_period}-{pool.max_lend_period} days
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Funding Progress</span>
                      <span>{pool.funding_progress.toFixed(0)}%</span>
                    </div>
                    <Progress value={pool.funding_progress} className="h-1.5" />
                  </div>
                  <Button 
                    size="sm" 
                    className="w-full mt-3"
                    onClick={() => navigate(`/lending-pool/${pool.id}`)}
                  >
                    Lend Now
                  </Button>
                </CardContent>
              </Card>
            ))}
            {lendingPools.length > 3 && (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/wallet')}
              >
                View All Pools ({lendingPools.length})
              </Button>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default WalletOverview;
