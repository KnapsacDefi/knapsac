
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import AuthScreen from "@/components/AuthScreen";
import { usePrivyConnection } from "@/hooks/usePrivyConnection";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle } from "lucide-react";

const Index = () => {
  const { isReady, isConnecting, hasError, errorMessage, authenticated, retryConnection } = usePrivyConnection();
  const navigate = useNavigate();

  useEffect(() => {
    if (isReady && authenticated) {
      navigate('/profile');
    }
  }, [isReady, authenticated, navigate]);

  // Show error state with retry option
  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Connection Error</h2>
          <p className="text-muted-foreground mb-4">
            {errorMessage || "Unable to connect to authentication service"}
          </p>
          <div className="space-y-2">
            <Button onClick={retryConnection} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()} 
              className="w-full"
            >
              Refresh Page
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state
  if (isConnecting || !isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {isConnecting ? "Connecting to authentication service..." : "Loading..."}
          </p>
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
