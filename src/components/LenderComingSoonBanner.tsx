import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, Sparkles } from "lucide-react";

const LenderComingSoonBanner = () => {
  return (
    <Alert className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <AlertDescription className="text-sm font-medium text-foreground">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-3 w-3 text-primary" />
              <span className="text-primary font-semibold">Coming Soon</span>
            </div>
            Lending features will be available in the coming days. Get ready to start earning returns on your capital!
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
};

export default LenderComingSoonBanner;