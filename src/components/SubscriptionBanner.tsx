
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Sparkles } from "lucide-react";

const SubscriptionBanner = () => {
  const navigate = useNavigate();

  return (
    <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Unlock Full Access</CardTitle>
          </div>
          <Badge variant="destructive" className="text-xs">
            50% OFF
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Subscribe to access lending features, credit services, and connect with investors.
        </p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <CreditCard className="w-4 h-4 text-primary" />
            <span>Starting at <span className="font-semibold">$12/year</span></span>
          </div>
          
          <Button onClick={() => navigate('/subscription')} size="sm">
            Subscribe Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SubscriptionBanner;
