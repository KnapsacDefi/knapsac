import { usePrivy } from "@privy-io/react-auth";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import DashboardHeader from "@/components/DashboardHeader";
import WalletOverview from "@/components/WalletOverview";
import UserAddressDisplay from "@/components/UserAddressDisplay";
import BottomNavigation from "@/components/BottomNavigation";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

const Wallet = () => {
  const { ready, authenticated, user } = usePrivy();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ready && !authenticated) {
      navigate('/');
    }
  }, [ready, authenticated, navigate]);

  useEffect(() => {
    const checkUserAccess = async () => {
      if (!user?.email?.address) return;

      try {
        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_email', user.email.address)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          setLoading(false);
          return;
        }

        setUserProfile(profile);

        // Check subscription for startups
        if (profile.profile_type === 'Startup') {
          const { data: subscription, error: subError } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .maybeSingle();

          if (subError && subError.code !== 'PGRST116') {
            console.error('Error checking subscription:', subError);
          }

          setHasActiveSubscription(!!subscription);
          
          // Redirect to subscription page if startup doesn't have active subscription
          if (!subscription) {
            navigate('/subscription');
            return;
          }
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
  }, [ready, authenticated, user, navigate]);

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
        <WalletOverview />
        <UserAddressDisplay />
        
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Our comprehensive lending and credit services are coming soon. We're building advanced features to connect startups with lenders seamlessly.
          </AlertDescription>
        </Alert>
      </main>
      <BottomNavigation />
    </div>
  );
};

export default Wallet;
