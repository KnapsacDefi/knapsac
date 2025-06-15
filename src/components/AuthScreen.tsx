
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import { Wallet, Shield, Smartphone } from "lucide-react";

const AuthScreen = () => {
  const { login } = usePrivy();

  return (
    <div className="min-h-screen flex flex-col bg-background px-4">
      <div className="flex-1 flex flex-col justify-center items-center max-w-md mx-auto w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Wallet className="text-primary w-12 h-12" />
            <span className="text-3xl font-bold text-primary">
              Privy Crypto
            </span>
          </div>
          <h1 className="text-2xl font-bold mb-2">Welcome to Your Crypto Hub</h1>
          <p className="text-muted-foreground text-center">
            Secure, simple, and powerful crypto wallet powered by Privy
          </p>
        </div>

        <div className="w-full space-y-4 mb-8">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-card border">
            <Shield className="w-6 h-6 text-green-500" />
            <div>
              <h3 className="font-semibold">Enterprise Security</h3>
              <p className="text-sm text-muted-foreground">Bank-grade encryption</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-card border">
            <Smartphone className="w-6 h-6 text-blue-500" />
            <div>
              <h3 className="font-semibold">Mobile First</h3>
              <p className="text-sm text-muted-foreground">Optimized for mobile use</p>
            </div>
          </div>
        </div>

        <div className="w-full space-y-3">
          <Button 
            onClick={login}
            className="w-full h-12 text-lg font-semibold"
          >
            Get Started
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
