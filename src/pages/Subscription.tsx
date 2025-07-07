import { useState, useEffect } from "react";
import { usePrivy, useSendTransaction } from "@privy-io/react-auth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, Clock, ArrowLeft } from "lucide-react";
import { encodeFunctionData } from 'viem';

// An ABI for the ERC-20 transfer function.
const erc20Abi = [
  {
    name: 'transfer',
    type: 'function',
    inputs: [
      {name: 'to', type: 'address'},
      {name: 'value', type: 'uint256'},
    ],
    outputs: [{name: '', type: 'bool'}],
    stateMutability: 'nonpayable',
  },
] as const;

const Subscription = () => {
  const { user, ready } = usePrivy();
  const { sendTransaction } = useSendTransaction();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [loading, setLoading] = useState(true);

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

  // USDT contract configuration
  const usdtContractAddress = '0xdAC17F958D2ee523a2206206994597C13D831ec7'; // USDT on Ethereum Mainnet
  const recipientAddress = '0x742d35Cc6635C0532925a3b8D5CaAbF834B4C0c1'; // Replace with your actual recipient address

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
        title: "Wallet Not Ready",
        description: "Please wait for your wallet to be set up, then try again.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const plan = subscriptionPlans.find(p => p.id === selectedPlan);
      if (!plan) throw new Error("Invalid plan selected");

      // Convert USDT amount to proper format (USDT has 6 decimals)
      const amount = BigInt(plan.discountedPrice * 1e6);

      // Encode the transaction data for the 'transfer' function call
      const transactionData = encodeFunctionData({
        abi: erc20Abi,
        functionName: 'transfer',
        args: [recipientAddress, amount],
      });

      // Define the UI options for the transaction modal
      const uiOptions = {
        title: 'Subscribe with USDT',
        description: `You are about to pay ${plan.discountedPrice} USDT for the ${plan.name} subscription.`,
        buttonText: 'Confirm Payment',
      };

      // Send USDT transaction
      const txResult = await sendTransaction(
        {
          to: usdtContractAddress,
          data: transactionData,
          value: 0, // Value is 0 for token transfers
        },
        { uiOptions }
      );

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
          transaction_hash: txResult.transactionHash,
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

  // Show loading state while Privy and our data are loading
  if (!ready || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {!ready ? "Setting up your wallet..." : "Loading..."}
          </p>
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

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        {/* Back navigation */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/wallet')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Wallet
          </Button>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Choose Your Plan</h1>
          <p className="text-muted-foreground">
            Subscribe to access all Knapsac features and start your startup journey
          </p>
          {!hasWallet && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <Clock className="w-4 h-4 inline mr-1" />
                Setting up your wallet... This may take a moment.
              </p>
            </div>
          )}
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
            disabled={!selectedPlan || isSubmitting || !hasWallet}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? "Processing..." : !hasWallet ? "Waiting for wallet..." : "Subscribe with USDT"}
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
