
import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getWalletAddress } from "@/utils/walletUtils";
import { profileService } from "@/services/profileService";

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
  walletsLoading: boolean;
}

export const useWalletData = ({ ready, authenticated, user, wallets, isStable, walletsLoading }: UseWalletDataParams) => {
  // ALWAYS call hooks in the same order - move all hooks to the top
  const hasInitialized = useRef(false);
  const walletWaitTimeoutRef = useRef<NodeJS.Timeout>();
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
      hasInit: hasInitialized.current,
      walletsLoading
    });

    // Clear any existing timeout
    if (walletWaitTimeoutRef.current) {
      clearTimeout(walletWaitTimeoutRef.current);
    }

    // Check if we have basic requirements
    const hasBasicRequirements = ready && authenticated && user && isStable;
    
    if (!hasBasicRequirements) {
      console.log('useWalletData: Basic requirements not met');
      return;
    }

    // If we have wallet address, proceed immediately
    if (walletAddress && !hasInitialized.current) {
      console.log('useWalletData: Wallet address available, starting API calls');
      hasInitialized.current = true;
      startApiCalls();
      return;
    }

    // If wallets are still loading, wait for them
    if (walletsLoading && !walletAddress) {
      console.log('useWalletData: Waiting for wallets to load...');
      return;
    }

    // If wallets finished loading but no address, wait a bit more
    if (!walletsLoading && !walletAddress && !hasInitialized.current) {
      console.log('useWalletData: Wallets finished loading but no address, waiting 3 more seconds...');
      walletWaitTimeoutRef.current = setTimeout(() => {
        console.log('useWalletData: Additional wait complete, checking wallet address again');
        const currentAddress = getWalletAddress(wallets, user);
        if (currentAddress) {
          console.log('useWalletData: Found wallet address after wait:', currentAddress);
          hasInitialized.current = true;
          startApiCalls();
        } else {
          console.log('useWalletData: No wallet address found after additional wait');
          // Set loading states to false since we can't proceed
          setData(prev => ({
            ...prev,
            loading: {
              profile: false,
              subscription: false,
              usdc: false,
              gooddollar: false,
            },
            errors: {
              profile: 'No wallet address available',
              subscription: 'No wallet address available',
              usdc: 'No wallet address available',
              gooddollar: 'No wallet address available',
            }
          }));
        }
      }, 3000);
    }

    return () => {
      if (walletWaitTimeoutRef.current) {
        clearTimeout(walletWaitTimeoutRef.current);
      }
    };

    // Use unified wallet address and userId in dependencies
  }, [ready, authenticated, isStable, walletAddress, userId, walletsLoading]);

  const startApiCalls = () => {
    const currentWalletAddress = getWalletAddress(wallets, user);
    const currentUserId = user?.id;
    
    if (!currentWalletAddress) {
      console.log('useWalletData: No wallet address available for API calls');
      return;
    }

    console.log('useWalletData: Starting API calls with wallet:', currentWalletAddress);

    const fetchProfileData = async () => {
      try {
        console.log('useWalletData: Fetching profile data via cached service');
        const profile = await profileService.getProfile(currentWalletAddress);

        setData(prev => ({
          ...prev,
          userProfile: profile,
          loading: { ...prev.loading, profile: false },
          errors: { ...prev.errors, profile: null }
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
            walletAddress: currentWalletAddress,
            signature: '',
            message: '',
            privyUserId: currentUserId
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
          body: { walletAddress: currentWalletAddress }
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
  };

  return data;
};
