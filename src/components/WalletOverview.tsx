
import { Banknote, Eye, EyeOff } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { usePrivy, useWallets, useFundWallet } from "@privy-io/react-auth";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import WalletOverviewSkeleton from "./skeletons/WalletOverviewSkeleton";

interface WalletOverviewProps {
  startIdentityVerification: () => Promise<any>;
  isVerifying: boolean;
  checkIdentityVerification: () => Promise<any>;
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
}

const WalletOverview = ({ 
  startIdentityVerification, 
  isVerifying, 
  checkIdentityVerification,
  userProfile,
  hasSubscription,
  balance = "0.00",
  gooddollarBalance = "0.00",
  loading = {}
}: WalletOverviewProps) => {
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const navigate = useNavigate();
  const [showBalance, setShowBalance] = useState(true);

  const isLoading = loading.usdc || loading.gooddollar;

  // Show skeleton while essential data is loading
  if (loading.profile || loading.usdc || loading.gooddollar) {
    return <WalletOverviewSkeleton />;
  }

  const displayBalance = isLoading ? "Loading..." : `$${balance}`;
  const displayGooddollarBalance = isLoading ? "Loading..." : `${gooddollarBalance} G$`;

  const isStartup = userProfile?.profile_type === 'Startup';
  const isLender = userProfile?.profile_type === 'Lender';
  const isServiceProvider = userProfile?.profile_type === 'Service Provider';
  const hasSignedTerms = userProfile?.signed_terms_hash && userProfile.signed_terms_hash.trim() !== '';

  const { fundWallet } = useFundWallet({
    onUserExited: (params) => {
      if (params.balance > 0) {
        alert(`Successfully funded wallet! New balance: ${params.balance}`);
      }
    }
  });

  const handleDeposit = () => {
    if (wallets.length > 0) {
      fundWallet(wallets[0].address);
    }
  };

  const handleClaimClick = async () => {
    try {
      const identityCheck = await checkIdentityVerification();
      
      if (!identityCheck.isVerified) {
        toast({
          title: "Identity Verification Required",
          description: "You'll be redirected to GoodDollar to complete face verification.",
        });
        
        await startIdentityVerification();
        
        toast({
          title: "Return After Verification",
          description: "After completing verification, return here and click 'Claim G$' again.",
          duration: 5000,
        });
        
      } else {
        navigate('/claim');
      }
    } catch (error) {
      console.error('Error in claim flow:', error);
      toast({
        title: "Error",
        description: "Failed to check verification status. Please try again.",
        variant: "destructive"
      });
    }
  };

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
          disabled={isServiceProvider}
          onClick={handleDeposit}
        >
          <span className="text-xs">Deposit</span>
        </Button>
        <Button 
          variant="outline" 
          className="h-12 flex flex-col gap-1"
          onClick={() => navigate('/withdraw')}
        >
          <span className="text-xs">Withdraw</span>
        </Button>
        {isLender && hasSignedTerms && (
          <Button 
            variant="secondary" 
            className="h-12 flex flex-col gap-1"
          >
            <span className="text-xs">Lend</span>
          </Button>
        )}
        {isStartup && hasSignedTerms && (
          <Button 
            variant="outline" 
            className="h-12 flex flex-col gap-1"
          >
            <span className="text-xs">Credit</span>
          </Button>
        )}
      </div>
    </section>
  );
};

export default WalletOverview;
