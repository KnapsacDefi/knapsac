
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import AuthScreen from "@/components/AuthScreen";
import { useMountingGuard } from "@/hooks/useMountingGuard";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const navigate = useNavigate();
  const { ready, authenticated, user, isStable } = useAuth();
  const { isStable: mountingStable } = useMountingGuard();
  const [hasNavigated, setHasNavigated] = useState(false);

  // Consolidate all navigation logic in a single useEffect
  useEffect(() => {
    if (!isStable || !mountingStable || hasNavigated) return;

    if (ready && authenticated && user) {
      console.log('Index: Navigating to profile for authenticated user');
      setHasNavigated(true);
      navigate('/profile');
    }
  }, [ready, authenticated, user, isStable, mountingStable, hasNavigated, navigate]);

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
