import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Quote } from "lucide-react";
import BottomNavigation from "@/components/BottomNavigation";
import TermsAndConditions from "@/components/TermsAndConditions";

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
  const { user } = usePrivy();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedProfile, setSelectedProfile] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingProfile, setExistingProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showTerms, setShowTerms] = useState(false);

  const userEmail = user?.email?.address;
  const walletAddress = user?.wallet?.address;

  useEffect(() => {
    const checkExistingProfile = async () => {
      if (!userEmail) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_email', userEmail)
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
  }, [userEmail]);

  const handleSubmit = async () => {
    if (!selectedProfile || !userEmail || !walletAddress) {
      toast({
        title: "Missing Information",
        description: "Please select a profile type and ensure your wallet is connected.",
        variant: "destructive",
      });
      return;
    }

    setShowTerms(true);
  };

  const handleTermsAccepted = async (signedHash: string) => {
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .insert({
          user_email: userEmail,
          crypto_address: walletAddress,
          profile_type: selectedProfile,
          signed_terms_hash: signedHash,
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Profile Created!",
        description: "Your profile has been successfully created.",
      });

      // Direct all profile types to wallet page
      if (selectedProfile === "Service Provider") {
        navigate('/service-provider-motivation');
      } else {
        navigate('/wallet');
      }
    } catch (error: any) {
      console.error('Error creating profile:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (showTerms && selectedProfile) {
    return (
      <TermsAndConditions
        profileType={selectedProfile as "Startup" | "Lender" | "Service Provider"}
        onAccept={handleTermsAccepted}
      />
    );
  }

  // Show inspiration message if profile already exists
  if (existingProfile) {
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

            <Button
              onClick={handleSubmit}
              disabled={!selectedProfile || isSubmitting}
              className="w-full"
              size="lg"
            >
              {isSubmitting ? "Creating Profile..." : "Continue to Terms & Conditions"}
            </Button>
          </CardContent>
        </Card>
      </div>
      <BottomNavigation />
    </div>
  );
};

export default Profile;
