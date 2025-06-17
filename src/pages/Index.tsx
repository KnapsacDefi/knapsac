
import { usePrivy } from "@privy-io/react-auth";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import AuthScreen from "@/components/AuthScreen";

const Index = () => {
  const { ready, authenticated } = usePrivy();
  const navigate = useNavigate();

  console.log("Index.tsx: rendered, ready:", ready, "authenticated:", authenticated);

  useEffect(() => {
    if (ready && authenticated) {
      console.log("Index.tsx: user authenticated, redirecting to profile");
      navigate('/profile');
    }
  }, [ready, authenticated, navigate]);

  if (!ready) {
    console.log("Index.tsx: Privy is not ready.");
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
    console.log("Index.tsx: user NOT authenticated, showing auth screen");
    return <AuthScreen />;
  }

  // This should not be reached due to useEffect redirect, but just in case
  return null;
};

export default Index;
