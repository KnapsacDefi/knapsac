
import { useState } from "react";
import { useSignMessage } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TermsAndConditionsProps {
  profileType: "Startup" | "Lender" | "Service Provider";
  onAccept: (signedHash: string) => void;
}

const TermsAndConditions = ({ profileType, onAccept }: TermsAndConditionsProps) => {
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signMessage } = useSignMessage();
  const { toast } = useToast();

  const getTermsContent = () => {
    const commonTerms = `
      KNAPSAC TERMS AND CONDITIONS

      IMPORTANT NOTICE: By using Knapsac, you acknowledge that Knapsac is a marketplace platform that facilitates connections between parties. Knapsac DOES NOT GUARANTEE returns, investment outcomes, or business success.

      1. PLATFORM NATURE
      Knapsac operates as a digital marketplace connecting startups, lenders, and service providers. We are not a financial institution, investment advisor, or guarantor of any transactions.

      2. NO GUARANTEES
      - Knapsac makes no representations or warranties regarding investment returns
      - All investments carry inherent risks including total loss of capital
      - Past performance does not indicate future results
      - Users are solely responsible for their investment decisions

      3. LIABILITY LIMITATIONS
      Knapsac's liability is limited to the maximum extent permitted by law. We are not liable for:
      - Investment losses or poor business performance
      - Third-party actions or omissions
      - Market conditions or economic factors
      - Technical issues or platform downtime

      4. USER RESPONSIBILITIES
      - Conduct thorough due diligence before any transaction
      - Verify all information independently
      - Comply with applicable laws and regulations
      - Maintain accurate account information

      5. PLATFORM FEES
      ${profileType === "Startup" ? "Startups pay 5% of secured credit to Knapsac" : ""}
      ${profileType === "Startup" ? "Interest payments of 3-7% monthly (based on credit score) plus 20% of credit installment for 5 months" : ""}
      
      6. DISPUTE RESOLUTION
      All disputes subject to binding arbitration under applicable jurisdiction laws.

      7. MODIFICATIONS
      Knapsac reserves the right to modify terms with 30 days notice to users.
    `;

    const specificTerms = {
      "Startup": `
        STARTUP-SPECIFIC TERMS:

        8. CREDIT OBLIGATIONS
        - Repayment terms are legally binding
        - Default may result in collection actions
        - Credit scoring affects future borrowing capacity
        - Personal guarantees may be required

        9. BUSINESS REPRESENTATIONS
        - All business information must be accurate and current
        - Financial statements must be truthful
        - Misrepresentation may result in immediate termination

        10. SUBSCRIPTION REQUIREMENTS
        - Active subscription required for platform access
        - Automatic renewal unless cancelled
        - No refunds for partial subscription periods
      `,
      "Lender": `
        LENDER-SPECIFIC TERMS:

        8. INVESTMENT RISKS
        - All loans carry risk of default and total loss
        - No FDIC or government insurance protection
        - Diversification recommended but not guaranteed
        - Returns are not guaranteed and may be zero

        9. DUE DILIGENCE
        - Lenders must independently verify all startup information
        - Knapsac provides information but does not verify accuracy
        - Professional financial advice recommended

        10. REGULATORY COMPLIANCE
        - Lenders responsible for tax reporting
        - Must comply with local investment regulations
        - Accredited investor requirements may apply
      `,
      "Service Provider": `
        SERVICE PROVIDER-SPECIFIC TERMS:

        8. SERVICE DELIVERY
        - All services must be delivered as contracted
        - Professional standards and ethics must be maintained
        - Disputes resolved through platform mediation first

        9. PAYMENT TERMS
        - Payments processed through platform
        - Service fees and commissions as disclosed
        - Refund policy as per individual service agreements

        10. PROFESSIONAL LIABILITY
        - Service providers maintain professional insurance
        - Liability for service quality and outcomes
        - Compliance with professional regulations required
      `
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

    setIsSubmitting(true);

    try {
      const termsText = getTermsContent();
      const message = `I agree to the Knapsac Terms and Conditions for ${profileType} profile:\n\n${termsText}\n\nTimestamp: ${new Date().toISOString()}`;
      
      const uiOptions = {
        title: `You are signing Terms and Conditions for ${profileType} profile`
      };

      const { signature } = await signMessage(
        { message }, 
        { uiOptions }
      );
      
      // Create hash of the signed message
      const encoder = new TextEncoder();
      const data = encoder.encode(message + signature);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      onAccept(hashHex);
      
      toast({
        title: "Terms Accepted",
        description: "Terms and conditions have been digitally signed and recorded.",
      });
    } catch (error) {
      console.error('Error signing terms:', error);
      toast({
        title: "Signature Failed",
        description: "Failed to sign terms. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background p-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            Terms & Conditions - {profileType}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="max-h-96 overflow-y-auto p-4 border rounded-lg bg-muted/50">
            <pre className="whitespace-pre-wrap text-sm">
              {getTermsContent()}
            </pre>
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

export default TermsAndConditions;
