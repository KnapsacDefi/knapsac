import { Banknote, Eye, EyeOff, Coins } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { usePrivy, useWallets, useFundWallet } from "@privy-io/react-auth";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGoodDollarIdentity } from "@/hooks/useGoodDollarIdentity";
import { useGoodDollarWagmi } from "@/hooks/useGoodDollarWagmi";
import { toast } from "@/hooks/use-toast";

const WalletOverview = () => {
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const navigate = useNavigate();
  const [showBalance, setShowBalance] = useState(true);
  const [balance, setBalance] = useState("0.00");
  const [gooddollarBalance, setGooddollarBalance] = useState("0.00");
  const [isLoading, setIsLoading] = useState(true);
  const [isGooddollarLoading, setIsGooddollarLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  const { startIdentityVerification, isVerifying } = useGoodDollarIdentity();
  const { isWhitelisted, checkIdentityVerification } = useGoodDollarWagmi();

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (wallets.length === 0) return;

      const walletAddress = wallets[0]?.address;
      if (!walletAddress) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('crypto_address', walletAddress)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching profile:', error);
        } else {
          setUserProfile(data);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      }
    };

    fetchUserProfile();
  }, [wallets]);

  useEffect(() => {
    const fetchBalance = async () => {
      if (wallets.length > 0) {
        try {
          setIsLoading(true);
          
          const walletId = user?.wallet?.id;
          console.log('Using wallet ID from user.wallet.id:', walletId);
          
          if (!walletId) {
            console.error('No wallet ID found in user object');
            setIsLoading(false);
            return;
          }
          
          const response = await supabase.functions.invoke('get-usdc-balance', {
            body: { walletId }
          });
          
          if (response.error) {
            console.error('Error fetching USDC balance:', response.error);
            setBalance("0.00");
          } else {
            const formattedBalance = parseFloat(response.data?.balance || 0).toFixed(2);
            setBalance(formattedBalance);
          }
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

  useEffect(() => {
    const fetchGooddollarBalance = async () => {
      if (!wallets[0]?.address) {
        setIsGooddollarLoading(false);
        return;
      }

      try {
        setIsGooddollarLoading(true);
        const { data, error } = await supabase.functions.invoke('get-gooddollar-balance', {
          body: { walletAddress: wallets[0].address }
        });

        if (error) {
          console.error('Error fetching GoodDollar balance:', error);
          setGooddollarBalance('0.00');
        } else {
          setGooddollarBalance(data.balanceFormatted || '0.00');
        }
      } catch (error) {
        console.error('Error fetching GoodDollar balance:', error);
        setGooddollarBalance('0.00');
      } finally {
        setIsGooddollarLoading(false);
      }
    };

    fetchGooddollarBalance();
  }, [wallets]);

  const displayBalance = isLoading ? "Loading..." : `$${balance}`;
  const displayGooddollarBalance = isGooddollarLoading ? "Loading..." : `${gooddollarBalance} G$`;

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
              <div className="text-xs text-muted-foreground">GoodDollar (Wagmi)</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
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
          onClick={async () => {
            // Use Wagmi hook to check if identity is verified
            if (!isWhitelisted) {
              // Start verification process
              await startIdentityVerification();
            } else {
              // Navigate to claim page if verified
              navigate('/claim');
            }
          }}
          disabled={isVerifying}
        >
          <Coins className="w-4 h-4" />
          <span className="text-xs">{isVerifying ? 'Verifying...' : 'Claim G$'}</span>
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
