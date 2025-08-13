import { useState, useEffect, useCallback } from 'react';
import { profileService } from '@/services/profileService';
import { subscriptionService } from '@/services/subscriptionService';
import { supabase } from '@/integrations/supabase/client';
import { walletCache } from '@/services/walletCache';

interface OptimizedWalletData {
  userProfile: any | null;
  hasSubscription: boolean;
  balance: number;
  loading: {
    profile: boolean;
    subscription: boolean;
    usdc: boolean;
  };
  error: {
    profile: string | null;
    subscription: string | null;
    usdc: string | null;
  };
  lastUpdated: string | null;
  refresh: () => void;
}

interface UseOptimizedWalletDataParams {
  ready: boolean;
  authenticated: boolean;
  user: any;
  wallets: any[];
  isStable: boolean;
  walletsLoading: boolean;
}

export const useOptimizedWalletData = (params: UseOptimizedWalletDataParams): OptimizedWalletData => {
  const { ready, authenticated, user, wallets, isStable, walletsLoading } = params;
  
  const [data, setData] = useState<OptimizedWalletData>({
    userProfile: null,
    hasSubscription: false,
    balance: 0,
    loading: {
      profile: false,
      subscription: false,
      usdc: false
    },
    error: {
      profile: null,
      subscription: null,
      usdc: null
    },
    lastUpdated: null,
    refresh: () => {}
  });

  // Get wallet address
  const walletAddress = wallets?.[0]?.address || user?.wallet?.address || null;

  const updateLoadingState = useCallback((field: keyof OptimizedWalletData['loading'], loading: boolean) => {
    setData(prev => ({
      ...prev,
      loading: { ...prev.loading, [field]: loading }
    }));
  }, []);

  const updateErrorState = useCallback((field: keyof OptimizedWalletData['error'], error: string | null) => {
    setData(prev => ({
      ...prev,
      error: { ...prev.error, [field]: error }
    }));
  }, []);

  const updateDataField = useCallback((field: keyof OptimizedWalletData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Load cached data immediately
  const loadCachedData = useCallback(() => {
    if (!walletAddress) return;
    
    const cached = walletCache.get(walletAddress);
    if (cached) {
      setData(prev => ({
        ...prev,
        userProfile: cached.profile,
        hasSubscription: !!cached.subscription,
        balance: cached.usdcBalance,
        lastUpdated: walletCache.getLastUpdated(walletAddress)
      }));
    }
  }, [walletAddress]);

  // Fetch profile data
  const fetchProfile = useCallback(async (address: string, useCache: boolean = true) => {
    try {
      updateLoadingState('profile', true);
      updateErrorState('profile', null);
      
      const profile = await profileService.getProfile(address);
      
      updateDataField('userProfile', profile);
      walletCache.setPartial(address, 'profile', profile);
    } catch (error: any) {
      console.error('Profile fetch error:', error);
      updateErrorState('profile', error.message || 'Failed to load profile');
    } finally {
      updateLoadingState('profile', false);
    }
  }, [updateLoadingState, updateErrorState, updateDataField]);

  // Fetch subscription data
  const fetchSubscription = useCallback(async (address: string) => {
    try {
      updateLoadingState('subscription', true);
      updateErrorState('subscription', null);
      
      // For now, we'll check subscription without signature for performance
      // In production, this should use proper authentication
      const { data: response, error } = await supabase.functions.invoke('secure-subscription-operations', {
        body: { 
          operation: 'get',
          walletAddress: address
        }
      });

      if (error) throw error;
      
      const hasSubscription = !!response?.subscription;
      updateDataField('hasSubscription', hasSubscription);
      walletCache.setPartial(address, 'subscription', response?.subscription);
    } catch (error: any) {
      console.error('Subscription fetch error:', error);
      updateErrorState('subscription', error.message || 'Failed to load subscription');
      // Don't block on subscription errors, just set to false
      updateDataField('hasSubscription', false);
    } finally {
      updateLoadingState('subscription', false);
    }
  }, [updateLoadingState, updateErrorState, updateDataField]);

  // Fetch USDC balance
  const fetchUSDCBalance = useCallback(async (address: string) => {
    try {
      updateLoadingState('usdc', true);
      updateErrorState('usdc', null);
      
      const { data: response, error } = await supabase.functions.invoke('get-token-balance', {
        body: { walletAddress: address, tokenSymbol: 'USDC' }
      });

      if (error) throw error;
      
      const balance = response?.balance || 0;
      updateDataField('balance', balance);
      walletCache.setPartial(address, 'usdcBalance', balance);
    } catch (error: any) {
      console.error('USDC balance fetch error:', error);
      updateErrorState('usdc', error.message || 'Failed to load USDC balance');
    } finally {
      updateLoadingState('usdc', false);
    }
  }, [updateLoadingState, updateErrorState, updateDataField]);


  // Refresh function
  const refresh = useCallback(() => {
    if (!walletAddress) return;
    
    // Invalidate cache and refetch all data
    walletCache.invalidate(walletAddress);
    
    // Fetch all data in parallel
    Promise.all([
      fetchProfile(walletAddress, false),
      fetchSubscription(walletAddress),
      fetchUSDCBalance(walletAddress)
    ]);
  }, [walletAddress, fetchProfile, fetchSubscription, fetchUSDCBalance]);

  // Update refresh function in state
  useEffect(() => {
    setData(prev => ({ ...prev, refresh }));
  }, [refresh]);

  // Main effect for data fetching
  useEffect(() => {
    if (!ready || !authenticated || !isStable || !walletAddress) return;

    // Load cached data immediately
    loadCachedData();

    // Check if we need to fetch fresh data
    const cached = walletCache.get(walletAddress);
    const shouldFetchFresh = !cached;

    if (shouldFetchFresh) {
      // Fetch critical data first (profile)
      fetchProfile(walletAddress, true).then(() => {
        // Then fetch other data in parallel
        Promise.all([
          fetchSubscription(walletAddress),
          fetchUSDCBalance(walletAddress)
        ]);
      });
    } else {
      // Background refresh of non-critical data
      setTimeout(() => {
        fetchUSDCBalance(walletAddress);
      }, 100);
    }
  }, [
    ready, 
    authenticated, 
    isStable, 
    walletAddress, 
    loadCachedData,
    fetchProfile,
    fetchSubscription,
    fetchUSDCBalance
  ]);

  // Update last updated time
  useEffect(() => {
    if (walletAddress) {
      const lastUpdated = walletCache.getLastUpdated(walletAddress);
      updateDataField('lastUpdated', lastUpdated);
    }
  }, [walletAddress, updateDataField, data.userProfile, data.balance]);

  return data;
};