
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface TermsAgreementProps {
  agreed: boolean;
  setAgreed: (agreed: boolean) => void;
  isSubmitting: boolean;
  onAccept: () => void;
}

export const TermsAgreement = ({ agreed, setAgreed, isSubmitting, onAccept }: TermsAgreementProps) => {
  return (
    <div className="space-y-4">
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
        onClick={onAccept}
        disabled={!agreed || isSubmitting}
        className="w-full"
        size="lg"
      >
        {isSubmitting ? "Signing..." : "Accept Terms & Continue"}
      </Button>
    </div>
  );
};
