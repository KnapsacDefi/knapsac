
import React from "react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import DashboardHeader from "@/components/DashboardHeader";
import WalletOverview from "@/components/WalletOverview";
import UserAddressDisplay from "@/components/UserAddressDisplay";
import BottomNavigation from "@/components/BottomNavigation";
import SubscriptionBanner from "@/components/SubscriptionBanner";
import AddProfileBanner from "@/components/AddProfileBanner";
import CreditScore from "@/components/CreditScore";
import LenderComingSoonBanner from "@/components/LenderComingSoonBanner";
import LendingPoolsSection from "@/components/LendingPoolsSection";
import { useOptimizedWalletData } from "@/hooks/useOptimizedWalletData";
import ProfileBannerSkeleton from "@/components/skeletons/ProfileBannerSkeleton";
import AddressDisplaySkeleton from "@/components/skeletons/AddressDisplaySkeleton";
import WalletOverviewSkeleton from "@/components/skeletons/WalletOverviewSkeleton";
import { useMountingGuard } from "@/hooks/useMountingGuard";
import { useAuth } from "@/contexts/AuthContext";
import { getWalletAddress } from "@/utils/walletUtils";

const Wallet = () => {
  // ALWAYS call hooks in the same order at the top
  const navigate = useNavigate();
  const { isStable: mountingStable } = useMountingGuard();
  const [hasNavigated, setHasNavigated] = useState(false);
  
  // Get auth data from context
  const { ready, authenticated, user, wallets, isStable, walletsLoading, isLoggingOut } = useAuth();
  const data = useOptimizedWalletData({ ready, authenticated, user, wallets, isStable, walletsLoading });

  // Get unified wallet address
  const walletAddress = getWalletAddress(wallets, user);

  // Handle logout immediately
  useEffect(() => {
    if (isLoggingOut) {
      console.log('Wallet: Logout detected, navigating home');
      navigate('/');
    }
  }, [isLoggingOut, navigate]);

  // Handle authentication redirects with timeout
  useEffect(() => {
    if (!isStable || !mountingStable || hasNavigated || isLoggingOut) return;

    // Add timeout to prevent infinite loading
    const authTimeout = setTimeout(() => {
      if (ready && !authenticated) {
        console.log('Wallet: User not authenticated, redirecting to home');
        setHasNavigated(true);
        navigate('/');
      }
    }, 100);

    return () => clearTimeout(authTimeout);
  }, [ready, authenticated, isStable, mountingStable, hasNavigated, isLoggingOut, navigate]);

  // Handle Service Provider redirection with timeout
  useEffect(() => {
    if (!isStable || !mountingStable || hasNavigated || !authenticated || isLoggingOut) return;

    const redirectTimeout = setTimeout(() => {
      if (
        data.userProfile?.profile_type === 'Service Provider' && 
        !data.loading.profile
      ) {
        console.log('Wallet: Service Provider detected, redirecting to motivation page');
        setHasNavigated(true);
        navigate('/service-provider-motivation');
      }
    }, 100);

    return () => clearTimeout(redirectTimeout);
  }, [data.userProfile?.profile_type, data.loading.profile, isStable, mountingStable, hasNavigated, authenticated, isLoggingOut, navigate]);

  // Show logout state immediately
  if (isLoggingOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Signing out...</p>
        </div>
      </div>
    );
  }

  // Show initial loading only briefly
  if (!ready || !isStable || !mountingStable) {
    return (
      <div className="min-h-screen flex flex-col bg-background pb-20">
        <DashboardHeader />
        <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full space-y-6">
          <ProfileBannerSkeleton />
          <AddressDisplaySkeleton />
          <WalletOverviewSkeleton />
        </main>
        <BottomNavigation />
      </div>
    );
  }

  // Don't render if not authenticated (navigation will handle redirect)
  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  // Don't render content if we're redirecting Service Providers
  if (data.userProfile?.profile_type === 'Service Provider') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  const hasValidHash = data.userProfile?.signed_terms_hash && data.userProfile.signed_terms_hash.trim() !== '';
  const shouldShowAddProfileBanner = !data.loading.profile && !hasValidHash;
  const shouldShowSubscriptionBanner = hasValidHash && !data.hasSubscription && data.userProfile?.profile_type === 'Startup';

  // Show refresh indicator
  const showRefreshIndicator = Object.values(data.loading).some(loading => loading);

  return (
    <div className="min-h-screen flex flex-col bg-background pb-20">
      <DashboardHeader />
      
      {/* Pull-to-refresh indicator */}
      {showRefreshIndicator && (
        <div className="px-4 py-2 bg-muted/50 text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <div className="animate-spin rounded-full h-3 w-3 border border-primary border-t-transparent"></div>
            Updating wallet data...
            {data.lastUpdated && <span>• Last updated {data.lastUpdated}</span>}
          </div>
        </div>
      )}
      
      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full space-y-6">
        {/* Progressive banner loading */}
        {data.loading.profile ? (
          <ProfileBannerSkeleton />
        ) : (
          <>
            {shouldShowAddProfileBanner && <AddProfileBanner />}
            {shouldShowSubscriptionBanner && <SubscriptionBanner />}
          </>
        )}
        
        {/* Address display with loading state */}
        {!walletAddress ? (
          <AddressDisplaySkeleton />
        ) : (
          <UserAddressDisplay 
            walletAddress={walletAddress}
            isLoading={data.loading.profile}
          />
        )}
        
        {/* Wallet overview with progressive loading */}
        {(!data.userProfile && data.loading.profile) ? (
          <WalletOverviewSkeleton />
        ) : (
          <WalletOverview 
            userProfile={data.userProfile}
            hasSubscription={data.hasSubscription}
            balance={data.balance.toString()}
            loading={data.loading}
            user={user}
            wallets={wallets}
          />
        )}
        
        {/* Show lending pools section only after profile loads */}
        {data.userProfile && <LendingPoolsSection userProfile={data.userProfile} />}
        
        {/* Debug info */}
        {data.userProfile && (
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm">Profile Type: <strong>{data.userProfile.profile_type}</strong></p>
            <p className="text-xs text-muted-foreground">
              {data.userProfile.profile_type === 'Startup' ? 'Credit Score component visible' : 'Credit Score component hidden (only for Startup profiles)'}
            </p>
          </div>
        )}

        {/* Show credit score for startups only */}
        {data.userProfile?.profile_type === 'Startup' && <CreditScore walletAddress={walletAddress} />}
        
        {/* Test Toast Button */}
        <div className="text-center">
          <button 
            onClick={() => {
              const { toast } = require("@/hooks/use-toast");
              toast({
                title: "Test Toast",
                description: "If you see this, the toast system is working!",
                variant: "default"
              });
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm"
          >
            Test Toast System
          </button>
        </div>
        
        {/* Manual refresh button */}
        <div className="text-center pt-4">
          <button 
            onClick={data.refresh}
            disabled={showRefreshIndicator}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            {showRefreshIndicator ? 'Refreshing...' : 'Tap to refresh'}
          </button>
        </div>
      </main>
      <BottomNavigation />
    </div>
  );
};

export default Wallet;
