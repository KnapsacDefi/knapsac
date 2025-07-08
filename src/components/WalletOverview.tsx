
import { Banknote, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePrivy, useWallets, useSignMessage } from "@privy-io/react-auth";
import { useState, useEffect } from "react";
import { formatEther } from "viem";
import { supabase } from "@/integrations/supabase/client";

const WalletOverview = () => {
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const [showBalance, setShowBalance] = useState(true);
  const [balance, setBalance] = useState("0.00");
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.email?.address) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_email', user.email.address)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
        } else {
          setUserProfile(data);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      }
    };

    fetchUserProfile();
  }, [user?.email?.address]);

  useEffect(() => {
    const fetchBalance = async () => {
      if (wallets.length > 0) {
        try {
          setIsLoading(true);
          const wallet = wallets[0]; // Use the first wallet
          
          // Fetch USDC balance using our edge function
          const response = await supabase.functions.invoke('get-usdc-balance', {
            body: { walletAddress: wallet.address }
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

  const displayBalance = isLoading ? "Loading..." : `$${balance}`;

  const isStartup = userProfile?.profile_type === 'Startup';
  const isLender = userProfile?.profile_type === 'Lender';
  const isServiceProvider = userProfile?.profile_type === 'Service Provider';

  const { signMessage } = useSignMessage({
    onSuccess: ({ signature }) => {
      console.log('✅ Signature successful:', signature);
      console.log('✅ Signature type:', typeof signature);
      console.log('✅ Signature length:', signature?.length);
      alert(`Deposit request signed successfully! Signature: ${signature}`);
    },
    onError: (error) => {
      console.error('❌ Signature error details:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error code:', error);
      
      // Convert error to string for display
      const errorMessage = typeof error === 'string' ? error : JSON.stringify(error);
      alert(`Error signing deposit request: ${errorMessage}`);
    }
  });

  const handleDeposit = async () => {
    console.log('🔄 Starting deposit signing process...');
    console.log('🔄 User profile type:', userProfile?.profile_type);
    console.log('🔄 Wallets available:', wallets?.length);
    
    const messageToSign = 'I hereby confirm my deposit request to the Knapsac platform.';
    const uiOptions = {
      title: 'Confirm Deposit Request',
      description: 'Please sign this message to confirm your deposit request. This action will be recorded securely.',
      buttonText: 'Confirm Deposit'
    };

    console.log('📝 Message to sign:', messageToSign);
    console.log('⚙️ UI options:', uiOptions);

    try {
      console.log('🚀 Calling signMessage...');
      await signMessage(
        { message: messageToSign },
        { uiOptions }
      );
      console.log('✅ signMessage call completed successfully');
    } catch (e) {
      console.error("❌ Exception in handleDeposit:", e);
      console.error("❌ Exception type:", typeof e);
      console.error("❌ Exception message:", e?.message);
      console.error("❌ Exception stack:", e?.stack);
      alert(`Failed to initiate signing: ${e?.message || 'Unknown error'}`);
    }
  };

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
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Button 
          className="h-12 flex flex-col gap-1 bg-primary text-white"
          disabled={isServiceProvider}
          onClick={handleDeposit}
        >
          <span className="text-xs">Deposit</span>
        </Button>
        <Button 
          variant="secondary" 
          className="h-12 flex flex-col gap-1"
          disabled={isStartup || isServiceProvider}
        >
          <span className="text-xs">Lend</span>
        </Button>
        <Button 
          variant="outline" 
          className="h-12 flex flex-col gap-1"
          disabled={isLender || isServiceProvider}
        >
          <span className="text-xs">Credit</span>
        </Button>
      </div>
    </section>
  );
};

export default WalletOverview;
