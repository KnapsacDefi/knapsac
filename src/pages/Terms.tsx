
import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Terms = () => {
  const [searchParams] = useSearchParams();
  const profileType = searchParams.get('type') as "Startup" | "Lender" | "Service Provider" || "Startup";
  const { user, signMessage } = usePrivy();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userEmail = user?.email?.address;
  const walletAddress = user?.wallet?.address;

  const getTermsContent = () => {
    const commonTerms = `# KNAPSAC TERMS AND CONDITIONS

**IMPORTANT NOTICE:** By using Knapsac, you acknowledge that Knapsac is a marketplace platform that facilitates connections between parties. Knapsac **DOES NOT GUARANTEE** returns, investment outcomes, or business success.

## 1. PLATFORM NATURE

Knapsac operates as a digital marketplace connecting startups, lenders, and service providers. We are not a financial institution, investment advisor, or guarantor of any transactions.

## 2. NO GUARANTEES

- Knapsac makes no representations or warranties regarding investment returns
- All investments carry inherent risks including total loss of capital
- Past performance does not indicate future results
- Users are solely responsible for their investment decisions

## 3. LIABILITY LIMITATIONS

Knapsac's liability is limited to the maximum extent permitted by law. We are not liable for:

- Investment losses or poor business performance
- Third-party actions or omissions
- Market conditions or economic factors
- Technical issues or platform downtime

## 4. USER RESPONSIBILITIES

- Conduct thorough due diligence before any transaction
- Verify all information independently
- Comply with applicable laws and regulations
- Maintain accurate account information

## 5. PLATFORM FEES

${profileType === "Startup" ? "- **Startups pay 5% of secured credit** to Knapsac\n- **Interest payments** of 3-7% monthly (based on credit score) plus 20% of credit installment for 5 months\n" : ""}

## 6. DISPUTE RESOLUTION

All disputes subject to binding arbitration under applicable jurisdiction laws.

## 7. MODIFICATIONS

Knapsac reserves the right to modify terms with 30 days notice to users.`;

    const specificTerms = {
      "Startup": `

## STARTUP-SPECIFIC TERMS

### 8. CREDIT OBLIGATIONS

- Repayment terms are legally binding
- Default may result in collection actions
- Credit scoring affects future borrowing capacity
- Personal guarantees may be required

### 9. BUSINESS REPRESENTATIONS

- All business information must be accurate and current
- Financial statements must be truthful
- Misrepresentation may result in immediate termination

### 10. SUBSCRIPTION REQUIREMENTS

- Active subscription required for platform access
- Automatic renewal unless cancelled
- No refunds for partial subscription periods`,

      "Lender": `

## LENDER-SPECIFIC TERMS

### 8. INVESTMENT RISKS

- All loans carry risk of default and total loss
- No FDIC or government insurance protection
- Diversification recommended but not guaranteed
- Returns are not guaranteed and may be zero

### 9. DUE DILIGENCE

- Lenders must independently verify all startup information
- Knapsac provides information but does not verify accuracy
- Professional financial advice recommended

### 10. REGULATORY COMPLIANCE

- Lenders responsible for tax reporting
- Must comply with local investment regulations
- Accredited investor requirements may apply`,

      "Service Provider": `

## SERVICE PROVIDER-SPECIFIC TERMS

### 8. SERVICE DELIVERY

- All services must be delivered as contracted
- Professional standards and ethics must be maintained
- Disputes resolved through platform mediation first

### 9. PAYMENT TERMS

- Payments processed through platform
- Service fees and commissions as disclosed
- Refund policy as per individual service agreements

### 10. PROFESSIONAL LIABILITY

- Service providers maintain professional insurance
- Liability for service quality and outcomes
- Compliance with professional regulations required`
    };

    return commonTerms + specificTerms[profileType];
  };

  const handleAccept = async () => {
    if (!agreed) {
      toast({
        title: "Agreement Required",
        description: "Please check the agreement box to proceed.",
        variant: "destructive",
      });
      return;
    }

    if (!userEmail || !walletAddress) {
      toast({
        title: "Missing Information",
        description: "Please ensure your profile is complete and wallet is connected.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const termsText = getTermsContent();
      const message = `I agree to the Knapsac Terms and Conditions for ${profileType} profile:\n\n${termsText}\n\nTimestamp: ${new Date().toISOString()}`;
      
      const signature = await signMessage({ message });
      
      // Create hash of the signed message
      const encoder = new TextEncoder();
      const data = encoder.encode(message + signature);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Create profile with signed terms
      const { error } = await supabase
        .from('profiles')
        .insert({
          user_email: userEmail,
          crypto_address: walletAddress,
          profile_type: profileType,
          signed_terms_hash: hashHex,
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Profile Created!",
        description: "Your profile has been successfully created.",
      });

      // Navigate based on profile type
      if (profileType === "Service Provider") {
        navigate('/service-provider-motivation');
      } else if (profileType === "Startup") {
        navigate('/subscription');
      } else {
        navigate('/wallet');
      }
    } catch (error: any) {
      console.error('Error accepting terms:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to accept terms. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background p-4">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            Terms & Conditions - {profileType}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="max-h-96 overflow-y-auto p-6 border rounded-lg bg-muted/50">
            <div 
              className="prose prose-sm max-w-none text-justify leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: getTermsContent()
                  .replace(/^# (.*$)/gm, '<h1 class="text-xl font-bold mb-4 text-center">$1</h1>')
                  .replace(/^## (.*$)/gm, '<h2 class="text-lg font-semibold mb-3 mt-6">$1</h2>')
                  .replace(/^### (.*$)/gm, '<h3 class="text-base font-semibold mb-2 mt-4">$1</h3>')
                  .replace(/^\*\*(.*?)\*\*/gm, '<strong>$1</strong>')
                  .replace(/^- (.*$)/gm, '<li class="ml-4 mb-1">• $1</li>')
                  .replace(/\n\n/g, '</p><p class="mb-4">')
                  .replace(/^(?!<[h|l])/gm, '<p class="mb-4">')
                  .replace(/<p class="mb-4"><\/p>/g, '')
              }}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="agree" 
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked as boolean)}
            />
            <label htmlFor="agree" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              I have read, understood, and agree to these Terms and Conditions
            </label>
          </div>

          <Button
            onClick={handleAccept}
            disabled={!agreed || isSubmitting}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? "Signing..." : "Accept Terms & Continue"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Terms;
