
import ReactMarkdown from 'react-markdown';

interface TermsContentProps {
  profileType: "Startup" | "Lender" | "Service Provider" | "Creator" | "Gig Rider/Driver";
}

export const TermsContent = ({ profileType }: TermsContentProps) => {
  const getFeeText = () => {
    const profileMap = {
      "Startup": "Startups",
      "Creator": "Creators", 
      "Gig Rider/Driver": "Gig Riders/Drivers"
    };
    return profileMap[profileType] || profileType;
  };

  const getTermsContent = () => {
    const commonTerms = `# KNAPSAC TERMS AND CONDITIONS

**IMPORTANT NOTICE:** By using Knapsac, you acknowledge that Knapsac is a marketplace platform that facilitates connections between parties. Knapsac **DOES NOT GUARANTEE** returns, investment outcomes, or business success.

## 1. PLATFORM NATURE

Knapsac operates as a digital marketplace connecting entrepreneurs, creators, gig workers, lenders, and service providers. We are not a financial institution, investment advisor, or guarantor of any transactions.

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

${(profileType === "Startup" || profileType === "Creator" || profileType === "Gig Rider/Driver") ? `- **${getFeeText()} pay 5% of secured credit** to Knapsac\n- **${getFeeText()} may pay back Lender monthly interest payments** between 3-10% for 1 to 10 months (based on credit score)\n` : ""}

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
- Compliance with professional regulations required`,

      "Creator": `

## CREATOR-SPECIFIC TERMS

### 8. CREDIT OBLIGATIONS

- Repayment terms are legally binding
- Default may result in collection actions
- Credit scoring affects future borrowing capacity
- Personal guarantees may be required

### 9. CREATIVE WORK & INTELLECTUAL PROPERTY

- All creative work information must be accurate and current
- Intellectual property rights must be clearly defined
- Content delivery must meet agreed specifications
- Misrepresentation may result in immediate termination

### 10. SUBSCRIPTION REQUIREMENTS

- Active subscription required for platform access
- Automatic renewal unless cancelled
- No refunds for partial subscription periods`,

      "Gig Rider/Driver": `

## GIG RIDER/DRIVER-SPECIFIC TERMS

### 8. CREDIT OBLIGATIONS

- Repayment terms are legally binding
- Default may result in collection actions
- Credit scoring affects future borrowing capacity
- Personal guarantees may be required

### 9. VEHICLE & SERVICE REQUIREMENTS

- All vehicle and service information must be accurate and current
- Vehicle insurance and licensing must be maintained
- Safety standards and regulations must be followed
- Misrepresentation may result in immediate termination

### 10. SUBSCRIPTION REQUIREMENTS

- Active subscription required for platform access
- Automatic renewal unless cancelled
- No refunds for partial subscription periods`
    };

    return commonTerms + specificTerms[profileType];
  };

  return (
    <div className="max-h-96 overflow-y-auto p-6 border rounded-lg bg-muted/50">
      <div className="prose prose-sm max-w-none text-justify leading-relaxed">
        <ReactMarkdown
          components={{
            h1: ({ children }) => <h1 className="text-xl font-bold mb-4 text-center text-foreground">{children}</h1>,
            h2: ({ children }) => <h2 className="text-lg font-semibold mb-3 mt-6 text-foreground">{children}</h2>,
            h3: ({ children }) => <h3 className="text-base font-semibold mb-2 mt-4 text-foreground">{children}</h3>,
            p: ({ children }) => <p className="mb-4 text-muted-foreground">{children}</p>,
            li: ({ children }) => <li className="ml-4 mb-1 text-muted-foreground">• {children}</li>,
            strong: ({ children }) => <strong className="text-foreground">{children}</strong>,
            ul: ({ children }) => <ul className="mb-4">{children}</ul>
          }}
        >
          {getTermsContent()}
        </ReactMarkdown>
      </div>
    </div>
  );
};
