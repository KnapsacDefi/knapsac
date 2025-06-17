
import { usePrivy } from "@privy-io/react-auth";
import AuthScreen from "@/components/AuthScreen";

const Index = () => {
  const { ready, authenticated } = usePrivy();

  console.log("Index.tsx: rendered, ready:", ready, "authenticated:", authenticated);

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
    console.log("Index.tsx: user NOT authenticated");
    return <AuthScreen />;
  }

  // For authenticated users, show the auth screen which will handle navigation
  console.log("Index.tsx: user authenticated, showing auth screen");
  return <AuthScreen />;
};

export default Index;
