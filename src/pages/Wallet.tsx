
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
import { useStableAuth } from "@/hooks/useStableAuth";
import { useWallets } from "@privy-io/react-auth";

const Wallet = () => {
  const { ready, authenticated, user } = useStableAuth();
  const { wallets } = useWallets();
  const navigate = useNavigate();
  const walletData = useWalletData();
  const { isStable } = useMountingGuard();
  const [hasNavigated, setHasNavigated] = useState(false);

  // Handle authentication redirects
  useEffect(() => {
    if (!isStable || hasNavigated) return;

    if (ready && !authenticated) {
      console.log('Wallet: User not authenticated, redirecting to home');
      setHasNavigated(true);
      navigate('/');
    }
  }, [ready, authenticated, isStable, hasNavigated, navigate]);

  // Handle Service Provider redirection
  useEffect(() => {
    if (!isStable || hasNavigated) return;

    if (
      walletData.userProfile?.profile_type === 'Service Provider' && 
      !walletData.loading.profile
    ) {
      console.log('Wallet: Service Provider detected, redirecting to motivation page');
      setHasNavigated(true);
      navigate('/service-provider-motivation');
    }
  }, [walletData.userProfile?.profile_type, walletData.loading.profile, isStable, hasNavigated, navigate]);

  // Show loading state during initialization
  if (!ready || !isStable) {
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
  if (walletData.userProfile?.profile_type === 'Service Provider') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  const hasValidHash = walletData.userProfile?.signed_terms_hash && walletData.userProfile.signed_terms_hash.trim() !== '';
  const shouldShowAddProfileBanner = !walletData.loading.profile && !hasValidHash;
  const shouldShowSubscriptionBanner = hasValidHash && !walletData.hasSubscription && walletData.userProfile?.profile_type === 'Startup';

  return (
    <div className="min-h-screen flex flex-col bg-background pb-20">
      <DashboardHeader />
      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full space-y-6">
        {/* Progressive banner loading */}
        {walletData.loading.profile ? (
          <ProfileBannerSkeleton />
        ) : (
          <>
            {shouldShowAddProfileBanner && <AddProfileBanner />}
            {shouldShowSubscriptionBanner && <SubscriptionBanner />}
            {walletData.userProfile?.profile_type === 'Lender' && <LenderComingSoonBanner />}
          </>
        )}
        
        <WalletOverview 
          userProfile={walletData.userProfile}
          hasSubscription={walletData.hasSubscription}
          balance={walletData.balance}
          gooddollarBalance={walletData.gooddollarBalance}
          loading={walletData.loading}
          user={user}
          wallets={wallets}
        />
        
        {/* Progressive address display loading */}
        {wallets.length === 0 ? (
          <AddressDisplaySkeleton />
        ) : (
          <UserAddressDisplay user={user} />
        )}
        
        {/* Show credit score for startups only */}
        {walletData.userProfile?.profile_type === 'Startup' && <CreditScore />}
      </main>
      <BottomNavigation />
    </div>
  );
};

export default Wallet;
