
import { useState, useEffect } from 'react';
import { profileService } from '@/services/profileService';
import { profileCache } from '@/services/profileCache';

interface UseProfileDataOptions {
  walletAddress: string | null;
  enabled?: boolean;
  forceRefresh?: boolean;
}

interface UseProfileDataReturn {
  profile: any | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useProfileData = ({
  walletAddress,
  enabled = true,
  forceRefresh = false
}: UseProfileDataOptions): UseProfileDataReturn => {
  const [profile, setProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    if (!walletAddress || !enabled) {
      return;
    }

    // Check if already loading to prevent duplicate calls
    if (profileCache.isLoading(walletAddress)) {
      console.log('🔄 Profile already loading for:', walletAddress);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔍 useProfileData: Fetching profile for:', walletAddress);
      const profileData = await profileService.getProfile(walletAddress, !forceRefresh);
      
      console.log('✅ useProfileData: Profile loaded:', profileData);
      setProfile(profileData);
    } catch (err: any) {
      console.error('❌ useProfileData: Profile fetch failed:', err);
      setError(err.message || 'Failed to load profile');
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refetch = async () => {
    if (walletAddress) {
      profileCache.invalidate(walletAddress);
      await fetchProfile();
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [walletAddress, enabled, forceRefresh]);

  return {
    profile,
    isLoading,
    error,
    refetch
  };
};
