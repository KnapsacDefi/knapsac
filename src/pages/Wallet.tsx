
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import DashboardHeader from "@/components/DashboardHeader";
import WalletOverview from "@/components/WalletOverview";
import UserAddressDisplay from "@/components/UserAddressDisplay";
import BottomNavigation from "@/components/BottomNavigation";
import SubscriptionBanner from "@/components/SubscriptionBanner";
import AddProfileBanner from "@/components/AddProfileBanner";
import CreditScore from "@/components/CreditScore";
import LenderComingSoonBanner from "@/components/LenderComingSoonBanner";
import { useGoodDollarIdentity } from "@/hooks/useGoodDollarIdentity";
import { useWalletData } from "@/hooks/useWalletData";
import ProfileBannerSkeleton from "@/components/skeletons/ProfileBannerSkeleton";
import AddressDisplaySkeleton from "@/components/skeletons/AddressDisplaySkeleton";

const Wallet = () => {
  const { ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const navigate = useNavigate();
  const walletData = useWalletData();

  const {
    startIdentityVerification,
    isVerifying,
    checkIdentityVerification
  } = useGoodDollarIdentity();

  useEffect(() => {
    if (ready && !authenticated) {
      navigate('/');
    }
  }, [ready, authenticated, navigate]);

  // Show loading state only for initial authentication
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  // Hide wallet page from Service Providers
  if (walletData.userProfile?.profile_type === 'Service Provider') {
    navigate('/service-provider-motivation');
    return null;
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
          startIdentityVerification={startIdentityVerification}
          isVerifying={isVerifying}
          checkIdentityVerification={checkIdentityVerification}
          userProfile={walletData.userProfile}
          hasSubscription={walletData.hasSubscription}
          balance={walletData.balance}
          gooddollarBalance={walletData.gooddollarBalance}
          loading={walletData.loading}
        />
        
        {/* Progressive address display loading */}
        {wallets.length === 0 ? (
          <AddressDisplaySkeleton />
        ) : (
          <UserAddressDisplay />
        )}
        
        {/* Show credit score for startups only */}
        {walletData.userProfile?.profile_type === 'Startup' && <CreditScore />}
      </main>
      <BottomNavigation />
    </div>
  );
};

export default Wallet;
