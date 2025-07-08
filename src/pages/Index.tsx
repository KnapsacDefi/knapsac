
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import AuthScreen from "@/components/AuthScreen";

const Index = () => {
  const { ready, authenticated } = usePrivy();
  const navigate = useNavigate();

  useEffect(() => {
    if (ready && authenticated) {
      navigate('/profile');
    }
  }, [ready, authenticated, navigate]);

  // Show loading state while Privy initializes
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
    return <AuthScreen />;
  }

  // This should not be reached due to useEffect redirect, but just in case
  return null;
};

export default Index;
