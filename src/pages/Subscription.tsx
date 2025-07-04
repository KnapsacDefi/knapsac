
import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, Clock, Wallet } from "lucide-react";

const Subscription = () => {
  const { user, sendTransaction, createWallet } = usePrivy();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creatingWallet, setCreatingWallet] = useState(false);

  const userEmail = user?.email?.address;
  const hasWallet = !!user?.wallet?.address;

  const subscriptionPlans = [
    {
      id: "early_bird",
      name: "Early Bird",
      originalPrice: 60,
      discountedPrice: 30,
      discount: "50% OFF",
      billing: "Annual (One-time offer)",
      features: [
        "12 months access",
        "All platform features",
        "Priority support",
        "50% savings"
      ]
    },
    {
      id: "standard",
      name: "Standard",
      originalPrice: 5,
      discountedPrice: 5,
      discount: null,
      billing: "Monthly",
      features: [
        "Monthly access",
        "All platform features",
        "Standard support",
        "Cancel anytime"
      ]
    }
  ];

  useEffect(() => {
    const checkSubscription = async () => {
      if (!userEmail) return;

      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user?.id)
          .eq('status', 'active')
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking subscription:', error);
        } else if (data) {
          setHasSubscription(true);
        }
      } catch (err) {
        console.error('Error checking subscription:', err);
      } finally {
        setLoading(false);
      }
    };

    checkSubscription();
  }, [userEmail, user?.id]);

  const handleCreateWallet = async () => {
    setCreatingWallet(true);
    try {
      await createWallet();
      toast({
        title: "Wallet Created!",
        description: "Your wallet has been created successfully.",
      });
    } catch (error: any) {
      console.error('Error creating wallet:', error);
      toast({
        title: "Wallet Creation Failed",
        description: error.message || "Failed to create wallet. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCreatingWallet(false);
    }
  };

  const handleSubscribe = async () => {
    if (!selectedPlan || !user?.id) {
      toast({
        title: "Selection Required",
        description: "Please select a subscription plan.",
        variant: "destructive",
      });
      return;
    }

    if (!hasWallet) {
      toast({
        title: "Wallet Required",
        description: "Please create a wallet first to proceed with payment.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const plan = subscriptionPlans.find(p => p.id === selectedPlan);
      if (!plan) throw new Error("Invalid plan selected");

      // Send USDT transaction
      const txResult = await sendTransaction({
        to: "TR5y2Eoh6ZAqyHEdgZ4HNJb9Ekncnh2gSA",
        value: `${plan.discountedPrice}`
      });

      // Calculate end date
      const startDate = new Date();
      const endDate = new Date(startDate);
      if (selectedPlan === "early_bird") {
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else {
        endDate.setMonth(endDate.getMonth() + 1);
      }

      // Save subscription to database
      const { error } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          subscription_type: selectedPlan,
          amount_paid: plan.discountedPrice,
          transaction_hash: txResult.hash,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          status: 'active'
        });

      if (error) throw error;

      toast({
        title: "Subscription Activated!",
        description: `Your ${plan.name} subscription is now active.`,
      });

      // Redirect to wallet page
      navigate('/wallet');
    } catch (error: any) {
      console.error('Subscription error:', error);
      toast({
        title: "Subscription Failed",
        description: error.message || "Failed to process subscription. Please try again.",
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

  if (hasSubscription) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <CardTitle>Subscription Active</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-6">
              Your subscription is currently active. You have full access to all platform features.
            </p>
            <Button onClick={() => navigate('/wallet')} className="w-full">
              Go to Wallet
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show wallet creation step if user doesn't have a wallet
  if (!hasWallet) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Create Your Wallet</h1>
            <p className="text-muted-foreground">
              You need a wallet to subscribe and make payments
            </p>
          </div>

          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <Wallet className="w-16 h-16 text-primary mx-auto mb-4" />
              <CardTitle>Wallet Required</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                To proceed with your subscription, you'll need to create a secure wallet first.
              </p>
              <Button
                onClick={handleCreateWallet}
                disabled={creatingWallet}
                className="w-full"
                size="lg"
              >
                {creatingWallet ? "Creating Wallet..." : "Create Wallet"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Choose Your Plan</h1>
          <p className="text-muted-foreground">
            Subscribe to access all Knapsac features and start your startup journey
          </p>
        </div>

        <RadioGroup value={selectedPlan} onValueChange={setSelectedPlan} className="space-y-4">
          {subscriptionPlans.map((plan) => (
            <div key={plan.id} className="relative">
              <RadioGroupItem
                value={plan.id}
                id={plan.id}
                className="peer sr-only"
              />
              <Label
                htmlFor={plan.id}
                className="flex cursor-pointer rounded-lg border-2 border-muted p-6 hover:bg-accent peer-data-[state=checked]:border-primary"
              >
                <Card className="w-full border-0 shadow-none">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl">{plan.name}</CardTitle>
                      {plan.discount && (
                        <Badge variant="destructive">{plan.discount}</Badge>
                      )}
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold">${plan.discountedPrice}</span>
                      {plan.originalPrice !== plan.discountedPrice && (
                        <span className="text-lg text-muted-foreground line-through">
                          ${plan.originalPrice}
                        </span>
                      )}
                      <span className="text-sm text-muted-foreground">
                        /{plan.billing}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </Label>
            </div>
          ))}
        </RadioGroup>

        <div className="mt-8 space-y-4">
          <Button
            onClick={handleSubscribe}
            disabled={!selectedPlan || isSubmitting}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? "Processing..." : "Subscribe with USDT"}
          </Button>
          
          <div className="text-center text-xs text-muted-foreground">
            <Clock className="w-4 h-4 inline mr-1" />
            Payment processed securely via blockchain transaction
          </div>
        </div>
      </div>
    </div>
  );
};

export default Subscription;
