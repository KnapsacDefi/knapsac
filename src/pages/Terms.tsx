
import { useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TermsContent } from "@/components/terms/TermsContent";
import { TermsAgreement } from "@/components/terms/TermsAgreement";
import { useTermsAcceptance } from "@/hooks/useTermsAcceptance";

const Terms = () => {
  const { authenticated } = usePrivy();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const profileType = searchParams.get('type') as "Startup" | "Lender" | "Service Provider" || "Startup";

  // Redirect unauthenticated users to landing page
  useEffect(() => {
    if (!authenticated) {
      navigate('/');
      return;
    }
  }, [authenticated, navigate]);

  // Get terms content for the hook
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

  const { agreed, setAgreed, isSubmitting, handleAccept } = useTermsAcceptance({
    profileType,
    termsContent: getTermsContent(),
  });

  return (
    <div className="min-h-screen flex flex-col bg-background p-4">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            Terms & Conditions - {profileType}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <TermsContent profileType={profileType} />
          <TermsAgreement 
            agreed={agreed}
            setAgreed={setAgreed}
            isSubmitting={isSubmitting}
            onAccept={handleAccept}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default Terms;
