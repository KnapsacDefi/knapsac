
import { useState, useEffect } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { supabase } from "@/integrations/supabase/client";

interface WalletData {
  userProfile: any;
  hasSubscription: boolean;
  balance: string;
  gooddollarBalance: string;
  loading: {
    profile: boolean;
    subscription: boolean;
    usdc: boolean;
    gooddollar: boolean;
  };
  errors: {
    profile: string | null;
    subscription: string | null;
    usdc: string | null;
    gooddollar: string | null;
  };
}

export const useWalletData = () => {
  const { ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  
  const [data, setData] = useState<WalletData>({
    userProfile: null,
    hasSubscription: false,
    balance: "0.00",
    gooddollarBalance: "0.00",
    loading: {
      profile: true,
      subscription: true,
      usdc: true,
      gooddollar: true,
    },
    errors: {
      profile: null,
      subscription: null,
      usdc: null,
      gooddollar: null,
    },
  });

  useEffect(() => {
    if (!ready || !authenticated || wallets.length === 0) return;

    const walletAddress = wallets[0]?.address || user?.wallet?.address;
    if (!walletAddress) return;

    const fetchProfileData = async () => {
      try {
        const { data: profileResult, error: profileError } = await supabase.functions.invoke('secure-profile-operations', {
          body: {
            operation: 'get',
            walletAddress: walletAddress
          }
        });

        let profile = null;
        if (profileResult && typeof profileResult === 'string') {
          try {
            const parsedResult = JSON.parse(profileResult);
            profile = parsedResult?.profile || null;
          } catch (parseError) {
            console.error('Failed to parse profile result:', parseError);
          }
        } else if (profileResult?.profile) {
          profile = profileResult.profile;
        }

        setData(prev => ({
          ...prev,
          userProfile: profile,
          loading: { ...prev.loading, profile: false },
          errors: { ...prev.errors, profile: profileError ? 'Failed to load profile' : null }
        }));
      } catch (error) {
        console.error('Error fetching profile:', error);
        setData(prev => ({
          ...prev,
          loading: { ...prev.loading, profile: false },
          errors: { ...prev.errors, profile: 'Failed to load profile' }
        }));
      }
    };

    const fetchSubscriptionData = async () => {
      try {
        const { data: subscription, error: subscriptionError } = await supabase.functions.invoke('secure-subscription-operations', {
          body: {
            operation: 'get',
            walletAddress: walletAddress,
            signature: '',
            message: '',
            privyUserId: user.id
          }
        });

        setData(prev => ({
          ...prev,
          hasSubscription: !!subscription?.subscription,
          loading: { ...prev.loading, subscription: false },
          errors: { ...prev.errors, subscription: subscriptionError ? 'Failed to load subscription' : null }
        }));
      } catch (error) {
        console.error('Error fetching subscription:', error);
        setData(prev => ({
          ...prev,
          loading: { ...prev.loading, subscription: false },
          errors: { ...prev.errors, subscription: 'Failed to load subscription' }
        }));
      }
    };

    const fetchUSDCBalance = async () => {
      try {
        const walletId = user?.wallet?.id;
        if (!walletId) {
          setData(prev => ({
            ...prev,
            loading: { ...prev.loading, usdc: false },
            errors: { ...prev.errors, usdc: 'No wallet ID found' }
          }));
          return;
        }

        const response = await supabase.functions.invoke('get-usdc-balance', {
          body: { walletId }
        });

        if (response.error) {
          throw new Error(response.error);
        }

        const formattedBalance = parseFloat(response.data?.balance || 0).toFixed(2);
        setData(prev => ({
          ...prev,
          balance: formattedBalance,
          loading: { ...prev.loading, usdc: false },
          errors: { ...prev.errors, usdc: null }
        }));
      } catch (error) {
        console.error('Error fetching USDC balance:', error);
        setData(prev => ({
          ...prev,
          balance: "0.00",
          loading: { ...prev.loading, usdc: false },
          errors: { ...prev.errors, usdc: 'Failed to load USDC balance' }
        }));
      }
    };

    const fetchGoodDollarBalance = async () => {
      try {
        const { data: result, error } = await supabase.functions.invoke('get-gooddollar-balance', {
          body: { walletAddress: walletAddress }
        });

        if (error) {
          throw new Error(error);
        }

        setData(prev => ({
          ...prev,
          gooddollarBalance: result?.balanceFormatted || '0.00',
          loading: { ...prev.loading, gooddollar: false },
          errors: { ...prev.errors, gooddollar: null }
        }));
      } catch (error) {
        console.error('Error fetching GoodDollar balance:', error);
        setData(prev => ({
          ...prev,
          gooddollarBalance: '0.00',
          loading: { ...prev.loading, gooddollar: false },
          errors: { ...prev.errors, gooddollar: 'Failed to load GoodDollar balance' }
        }));
      }
    };

    // Execute all API calls in parallel
    Promise.all([
      fetchProfileData(),
      fetchSubscriptionData(),
      fetchUSDCBalance(),
      fetchGoodDollarBalance()
    ]);

  }, [ready, authenticated, user, wallets]);

  return data;
};
