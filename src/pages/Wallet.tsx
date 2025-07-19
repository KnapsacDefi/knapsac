
import { usePrivy, useWallets } from "@privy-io/react-auth";
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
import { supabase } from "@/integrations/supabase/client";
import { useGoodDollarIdentity } from "@/hooks/useGoodDollarIdentity";

const Wallet = () => {
  const { ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    const checkUserAccess = async () => {
      if (wallets.length === 0) return;

      const walletAddress = wallets[0]?.address || user?.wallet?.address;
      console.log('🔍 Wallet address from Privy:', {
        walletsLength: wallets.length,
        walletAddress,
        walletAddressType: typeof walletAddress,
        walletAddressLength: walletAddress?.length,
        firstWallet: wallets[0],
        userWallet: user?.wallet
      });
      
      if (!walletAddress) return;

      try {
        // Get user profile using edge function (RLS requires this approach)
        console.log('🔍 Fetching profile via edge function for:', walletAddress);
        const { data: profileResult, error: profileError } = await supabase.functions.invoke('secure-profile-operations', {
          body: {
            operation: 'get',
            walletAddress: walletAddress
          }
        });

        console.log('🔍 Edge function result:', { profileResult, profileError });
        
        // Parse the JSON string response
        let profile = null;
        if (profileResult && typeof profileResult === 'string') {
          try {
            const parsedResult = JSON.parse(profileResult);
            profile = parsedResult?.profile || null;
            console.log('🔍 Parsed profile:', profile);
          } catch (parseError) {
            console.error('🔍 Failed to parse profile result:', parseError);
          }
        } else if (profileResult?.profile) {
          profile = profileResult.profile;
        }

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error fetching profile:', profileError);
          setLoading(false);
          return;
        }

        console.log('🔍 Profile fetch result:', {
          walletAddress,
          profile,
          signed_terms_hash: profile?.signed_terms_hash,
          signed_terms_hash_type: typeof profile?.signed_terms_hash,
          signed_terms_hash_length: profile?.signed_terms_hash?.length,
          signed_terms_hash_truthy: !!profile?.signed_terms_hash,
          profileError: profileError
        });

        setUserProfile(profile);

        // Check for active subscription using wallet address
        const { data: subscription, error: subscriptionError } = await supabase.functions.invoke('secure-subscription-operations', {
          body: {
            operation: 'get',
            walletAddress: walletAddress,
            signature: '', // Empty for read operations
            message: '',
            privyUserId: user.id
          }
        });

        if (subscriptionError) {
          console.error('Error checking subscription:', subscriptionError);
        } else if (subscription?.subscription) {
          setHasSubscription(true);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error checking user access:', err);
        setLoading(false);
      }
    };

    if (ready && authenticated) {
      checkUserAccess();
    }
  }, [ready, authenticated, user, wallets, navigate]);

  if (!ready || loading) {
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
  if (userProfile?.profile_type === 'Service Provider') {
    navigate('/service-provider-motivation');
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background pb-20">
      <DashboardHeader />
      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full space-y-6">
        {/* Show add profile banner if signed_terms_hash is null */}
        {(() => {
          console.log('🚨 BANNER CHECK - Raw userProfile:', userProfile);
          console.log('🚨 BANNER CHECK - signed_terms_hash:', userProfile?.signed_terms_hash);
          console.log('🚨 BANNER CHECK - hash type:', typeof userProfile?.signed_terms_hash);
          console.log('🚨 BANNER CHECK - hash length:', userProfile?.signed_terms_hash?.length);
          
          const hasValidHash = userProfile?.signed_terms_hash && userProfile.signed_terms_hash.trim() !== '';
          const shouldShowBanner = !hasValidHash;
          
          console.log('🚨 BANNER CHECK - hasValidHash:', hasValidHash);
          console.log('🚨 BANNER CHECK - shouldShowBanner:', shouldShowBanner);
          
          return shouldShowBanner && <AddProfileBanner />;
        })()}
        
        {/* Show subscription banner for unsubscribed startup profiles only */}
        {userProfile?.signed_terms_hash && userProfile.signed_terms_hash.trim() !== '' && !hasSubscription && userProfile?.profile_type === 'Startup' && <SubscriptionBanner />}
        
        {/* Show lender coming soon banner for lender profiles */}
        {userProfile?.profile_type === 'Lender' && <LenderComingSoonBanner />}
        
        <WalletOverview 
          startIdentityVerification={startIdentityVerification}
          isVerifying={isVerifying}
          checkIdentityVerification={checkIdentityVerification}
        />
        <UserAddressDisplay />
        
        {/* Show credit score for startups only */}
        {userProfile?.profile_type === 'Startup' && <CreditScore />}
      </main>
      <BottomNavigation />
    </div>
  );
};

export default Wallet;
