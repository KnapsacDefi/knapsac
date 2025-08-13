
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import AuthScreen from "@/components/AuthScreen";
import { useMountingGuard } from "@/hooks/useMountingGuard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();
  const { ready, authenticated, user, isStable, wallets } = useAuth();
  const { isStable: mountingStable } = useMountingGuard();
  const [hasNavigated, setHasNavigated] = useState(false);

  // Check profile completion and redirect accordingly
  useEffect(() => {
    if (!isStable || !mountingStable || hasNavigated || !ready || !authenticated || !user) return;

    const checkProfileAndRedirect = async () => {
      const walletAddress = wallets?.[0]?.address || user?.wallet?.address;
      
      if (!walletAddress) {
        console.log('Index: No wallet, redirecting to profile');
        setHasNavigated(true);
        navigate('/profile');
        return;
      }

      try {
        // Check if user has complete profile
        const { data: profileResult, error } = await supabase.functions.invoke('secure-profile-operations', {
          body: {
            operation: 'get',
            walletAddress: walletAddress
          }
        });
        
        let profileData = null;
        if (profileResult && typeof profileResult === 'string') {
          try {
            const parsedResult = JSON.parse(profileResult);
            profileData = parsedResult?.profile || null;
          } catch (parseError) {
            console.error('Failed to parse profile result:', parseError);
          }
        } else if (profileResult?.profile) {
          profileData = profileResult.profile;
        }

        if (profileData && profileData.signed_terms_hash && profileData.signed_terms_hash.trim() !== '') {
          console.log('Index: Complete profile found, redirecting to wallet');
          setHasNavigated(true);
          navigate('/wallet');
        } else {
          console.log('Index: No complete profile, redirecting to profile page');
          setHasNavigated(true);
          navigate('/profile');
        }
      } catch (err) {
        console.error('Error checking profile:', err);
        // On error, redirect to profile page
        setHasNavigated(true);
        navigate('/profile');
      }
    };

    checkProfileAndRedirect();
  }, [ready, authenticated, user, isStable, mountingStable, hasNavigated, navigate, wallets]);

  // Show loading state while Privy initializes or component stabilizes
  if (!ready || !isStable || !mountingStable) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Only show auth screen for non-authenticated users
  if (!authenticated) {
    return <AuthScreen />;
  }

  // Show loading while navigation is in progress
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  );
};

export default Index;
