
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
import { useWalletData } from "@/hooks/useWalletData";
import ProfileBannerSkeleton from "@/components/skeletons/ProfileBannerSkeleton";
import AddressDisplaySkeleton from "@/components/skeletons/AddressDisplaySkeleton";
import { useMountingGuard } from "@/hooks/useMountingGuard";
import { useAuth } from "@/contexts/AuthContext";
import { getWalletAddress } from "@/utils/walletUtils";

const Wallet = () => {
  // ALWAYS call hooks in the same order at the top
  const navigate = useNavigate();
  const { isStable: mountingStable } = useMountingGuard();
  const [hasNavigated, setHasNavigated] = useState(false);
  
  // Get auth data from context
  const { ready, authenticated, user, wallets, isStable } = useAuth();
  const data = useWalletData({ ready, authenticated, user, wallets, isStable });

  // Get unified wallet address
  const walletAddress = getWalletAddress(wallets, user);

  // Handle authentication redirects
  useEffect(() => {
    if (!isStable || !mountingStable || hasNavigated) return;

    if (ready && !authenticated) {
      console.log('Wallet: User not authenticated, redirecting to home');
      setHasNavigated(true);
      navigate('/');
    }
  }, [ready, authenticated, isStable, mountingStable, hasNavigated, navigate]);

  // Handle Service Provider redirection
  useEffect(() => {
    if (!isStable || !mountingStable || hasNavigated) return;

    if (
      data.userProfile?.profile_type === 'Service Provider' && 
      !data.loading.profile
    ) {
      console.log('Wallet: Service Provider detected, redirecting to motivation page');
      setHasNavigated(true);
      navigate('/service-provider-motivation');
    }
  }, [data.userProfile?.profile_type, data.loading.profile, isStable, mountingStable, hasNavigated, navigate]);

  // Show loading state during initialization
  if (!ready || !isStable || !mountingStable) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading wallet...</p>
        </div>
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

  return (
    <div className="min-h-screen flex flex-col bg-background pb-20">
      <DashboardHeader />
      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full space-y-6">
        {/* Progressive banner loading */}
        {data.loading.profile ? (
          <ProfileBannerSkeleton />
        ) : (
          <>
            {shouldShowAddProfileBanner && <AddProfileBanner />}
            {shouldShowSubscriptionBanner && <SubscriptionBanner />}
            {data.userProfile?.profile_type === 'Lender' && <LenderComingSoonBanner />}
          </>
        )}
        
        <WalletOverview 
          userProfile={data.userProfile}
          hasSubscription={data.hasSubscription}
          balance={data.balance}
          gooddollarBalance={data.gooddollarBalance}
          loading={data.loading}
          user={user}
          wallets={wallets}
        />
        
        {/* Use unified wallet address for display */}
        <UserAddressDisplay 
          walletAddress={walletAddress}
          isLoading={data.loading.profile}
        />
        
        {/* Show credit score for startups only */}
        {data.userProfile?.profile_type === 'Startup' && <CreditScore />}
      </main>
      <BottomNavigation />
    </div>
  );
};

export default Wallet;
