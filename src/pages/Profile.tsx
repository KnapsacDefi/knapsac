
import { useState, useEffect } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Quote } from "lucide-react";
import BottomNavigation from "@/components/BottomNavigation";

const profileOptions = [
  {
    value: "Startup",
    label: "Startup",
    description: "Building the next big thing"
  },
  {
    value: "Lender",
    label: "Lender", 
    description: "Investing in startup dreams"
  },
  {
    value: "Service Provider",
    label: "Service Provider",
    description: "Supporting startup success"
  }
];

const inspirationalQuotes = {
  Startup: "Every great startup begins with a bold vision. Your journey to transform ideas into reality starts now!",
  Lender: "Smart investments fuel innovation. Your capital powers the dreams of tomorrow's entrepreneurs!",
  "Service Provider": "Behind every successful startup is a network of great service providers. You're the backbone of innovation!"
};

const Profile = () => {
  const { user, authenticated, ready } = usePrivy();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedProfile, setSelectedProfile] = useState("");
  const [existingProfile, setExistingProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [walletLoading, setWalletLoading] = useState(true);

  const userEmail = user?.email?.address;
  const { wallets } = useWallets();
  const walletAddress = wallets[0]?.address || user?.wallet?.address;

  // Enhanced wallet state debugging
  useEffect(() => {
    // Set wallet loading to false after a brief delay to allow for wallet initialization
    const timer = setTimeout(() => {
      setWalletLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [authenticated, ready, userEmail, wallets, walletAddress, user]);

  // Redirect unauthenticated users to landing page
  useEffect(() => {
    if (!authenticated) {
      navigate('/');
      return;
    }
  }, [authenticated, navigate]);

  useEffect(() => {
    const checkExistingProfile = async () => {
      if (!walletAddress) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('crypto_address', walletAddress)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking profile:', error);
        } else {
          setExistingProfile(data);
        }
      } catch (err) {
        console.error('Error checking profile:', err);
      } finally {
        setLoading(false);
      }
    };

    checkExistingProfile();
  }, [walletAddress]);

  const handleSubmit = async () => {
    if (!selectedProfile) {
      toast({
        title: "Profile Selection Required",
        description: "Please select a profile type to continue.",
        variant: "destructive",
      });
      return;
    }

    if (!userEmail) {
      toast({
        title: "Email Required",
        description: "Please ensure your email is verified with Privy.",
        variant: "destructive",
      });
      return;
    }

    if (!walletAddress && !walletLoading) {
      toast({
        title: "Wallet Connection Required",
        description: "Please connect your wallet to continue. You can do this from the main dashboard.",
        variant: "destructive",
      });
      return;
    }

    if (walletLoading) {
      toast({
        title: "Wallet Initializing",
        description: "Please wait for your wallet to finish connecting...",
        variant: "default",
      });
      return;
    }

    // Navigate to Terms page with profile type
    navigate(`/terms?type=${encodeURIComponent(selectedProfile)}`);
  };

  // Show loading while Privy or profile data is loading
  if (!ready || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {!ready ? "Initializing..." : "Loading profile..."}
          </p>
        </div>
      </div>
    );
  }

  // Show motivation page if profile has signed terms
  if (existingProfile && existingProfile.signed_terms_hash) {
    const quote = inspirationalQuotes[existingProfile.profile_type as keyof typeof inspirationalQuotes];
    
    return (
      <div className="min-h-screen flex flex-col bg-background pb-20">
        <div className="flex-1 flex items-center justify-center px-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
                <CardTitle className="text-2xl">Welcome Back!</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <div className="p-4 bg-primary/5 rounded-lg border-l-4 border-primary">
                <Quote className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground italic">
                  "{quote}"
                </p>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Profile Type: <span className="font-semibold text-foreground">{existingProfile.profile_type}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Connected since {new Date(existingProfile.created_at).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  // Show inspiration message if profile exists but no signed terms
  if (existingProfile && !existingProfile.signed_terms_hash) {
    const quote = inspirationalQuotes[existingProfile.profile_type as keyof typeof inspirationalQuotes];
    
    return (
      <div className="min-h-screen flex flex-col bg-background pb-20">
        <div className="flex-1 flex items-center justify-center px-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
                <CardTitle className="text-2xl">Complete Your Setup</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <div className="p-4 bg-primary/5 rounded-lg border-l-4 border-primary">
                <Quote className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground italic">
                  "{quote}"
                </p>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Profile Type: <span className="font-semibold text-foreground">{existingProfile.profile_type}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Created on {new Date(existingProfile.created_at).toLocaleDateString()}
                </p>
              </div>

              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-700">
                  ⚠️ Please complete the terms and conditions to access all features.
                </p>
              </div>

              <Button
                onClick={() => navigate(`/terms?type=${encodeURIComponent(existingProfile.profile_type)}`)}
                className="w-full"
                size="lg"
              >
                Continue to Terms & Conditions
              </Button>
            </CardContent>
          </Card>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background pb-20">
      <div className="flex-1 flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl mb-2">Complete Your Profile</CardTitle>
            <p className="text-muted-foreground text-sm">
              Tell us how you'd like to participate in the Knapsac ecosystem
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <RadioGroup
              value={selectedProfile}
              onValueChange={setSelectedProfile}
              className="space-y-4"
            >
              {profileOptions.map((option) => (
                <div key={option.value} className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor={option.value} className="text-base font-medium cursor-pointer">
                      {option.label}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {option.description}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>

            {/* Wallet Status Info */}
            {walletLoading && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  🔄 Wallet initializing... Please wait.
                </p>
              </div>
            )}
            
            {!walletLoading && !walletAddress && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-700">
                  ⚠️ No wallet connected. You can connect one from the dashboard, or continue without a wallet for now.
                </p>
              </div>
            )}

            {!walletLoading && walletAddress && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700">
                  ✅ Wallet connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </p>
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={!selectedProfile || walletLoading}
              className="w-full"
              size="lg"
            >
              {walletLoading ? "Waiting for wallet..." : "Continue to Terms & Conditions"}
            </Button>
          </CardContent>
        </Card>
      </div>
      <BottomNavigation />
    </div>
  );
};

export default Profile;
