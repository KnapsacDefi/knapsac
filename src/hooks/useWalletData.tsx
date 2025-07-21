
import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getWalletAddress } from "@/utils/walletUtils";

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

interface UseWalletDataParams {
  ready: boolean;
  authenticated: boolean;
  user: any;
  wallets: any[];
  isStable: boolean;
}

export const useWalletData = ({ ready, authenticated, user, wallets, isStable }: UseWalletDataParams) => {
  // ALWAYS call hooks in the same order - move all hooks to the top
  const hasInitialized = useRef(false);
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

  // Use unified wallet address resolution
  const walletAddress = useMemo(() => {
    const address = getWalletAddress(wallets, user);
    console.log('useWalletData: Unified wallet address:', address);
    return address;
  }, [wallets, user?.wallet?.address]);

  const userId = useMemo(() => {
    const id = user?.id;
    console.log('useWalletData: Extracting userId:', id);
    return id || null;
  }, [user?.id]);

  useEffect(() => {
    console.log('useWalletData: useEffect triggered', { 
      ready, 
      authenticated, 
      user: !!user,
      isStable,
      walletsLength: wallets?.length || 0,
      walletAddress,
      userId,
      hasInit: hasInitialized.current
    });

    // Use state flags instead of early returns to prevent hook ordering issues
    const canFetchData = ready && authenticated && user && isStable && walletAddress;
    const shouldFetch = canFetchData && !hasInitialized.current;
    
    if (!shouldFetch) {
      if (!canFetchData) {
        console.log('useWalletData: Not ready for API calls');
      }
      return;
    }

    console.log('useWalletData: Starting API calls with wallet:', walletAddress);
    hasInitialized.current = true;

    const fetchProfileData = async () => {
      try {
        console.log('useWalletData: Fetching profile data');
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
        console.log('useWalletData: Fetching subscription data');
        const { data: subscription, error: subscriptionError } = await supabase.functions.invoke('secure-subscription-operations', {
          body: {
            operation: 'get',
            walletAddress: walletAddress,
            signature: '',
            message: '',
            privyUserId: userId
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
        console.log('useWalletData: Fetching USDC balance');
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
        console.log('useWalletData: Fetching GoodDollar balance');
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

    // Execute all API calls in parallel with error isolation
    Promise.allSettled([
      fetchProfileData(),
      fetchSubscriptionData(),
      fetchUSDCBalance(),
      fetchGoodDollarBalance()
    ]).then(results => {
      console.log('useWalletData: All API calls completed', results);
    });

    // Note: Don't reset hasInitialized in cleanup to prevent re-initialization

  // Use unified wallet address and userId in dependencies
  }, [ready, authenticated, isStable, walletAddress, userId]);

  return data;
};
