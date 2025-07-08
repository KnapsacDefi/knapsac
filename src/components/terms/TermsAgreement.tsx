
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useWallets, usePrivy } from "@privy-io/react-auth";
import { Wallet, AlertCircle } from "lucide-react";

interface TermsAgreementProps {
  agreed: boolean;
  setAgreed: (agreed: boolean) => void;
  isSubmitting: boolean;
  onAccept: () => void;
  walletAddress?: string | null;
  hasWallet?: boolean;
}

export const TermsAgreement = ({ 
  agreed, 
  setAgreed, 
  isSubmitting, 
  onAccept,
  walletAddress: propWalletAddress,
  hasWallet: propHasWallet
}: TermsAgreementProps) => {
  const { wallets } = useWallets();
  const { user } = usePrivy();
  
  // Use props if provided, otherwise fallback to direct wallet detection
  const walletAddress = propWalletAddress ?? (wallets[0]?.address || user?.wallet?.address);
  const hasWallet = propHasWallet ?? !!walletAddress;


  return (
    <div className="space-y-4">
      {/* Wallet Connection Status */}
      <div className={`flex items-center gap-2 p-3 rounded-lg border ${hasWallet ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
        {hasWallet ? (
          <>
            <Wallet className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-700">
              Wallet Connected: {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
            </span>
          </>
        ) : (
          <>
            <AlertCircle className="w-4 h-4 text-orange-600" />
            <span className="text-sm text-orange-700">Please connect your wallet to continue</span>
          </>
        )}
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
        onClick={onAccept}
        disabled={!agreed || isSubmitting || !hasWallet}
        className="w-full"
        size="lg"
      >
        {isSubmitting ? "Signing..." : !hasWallet ? "Connect Wallet First" : "Accept Terms & Continue"}
      </Button>
    </div>
  );
};
