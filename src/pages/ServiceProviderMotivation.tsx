
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Sparkles, TrendingUp, Users, Zap } from "lucide-react";

const ServiceProviderMotivation = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4">
        <Card className="max-w-2xl w-full">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="w-12 h-12 text-primary" />
            </div>
            <CardTitle className="text-3xl mb-4">Welcome Service Provider!</CardTitle>
            <p className="text-lg text-muted-foreground">
              You're about to join an ecosystem that's transforming how startups succeed
            </p>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="grid gap-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Growing Market Opportunity</h3>
                  <p className="text-muted-foreground">
                    Connect with ambitious startups actively looking for your services. Expand your client base with companies that are ready to invest in growth.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Build Lasting Partnerships</h3>
                  <p className="text-muted-foreground">
                    Form strategic relationships with emerging companies. As they grow, your services become more valuable, creating long-term business opportunities.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Streamlined Operations</h3>
                  <p className="text-muted-foreground">
                    Our platform handles payments, contracts, and client matching. Focus on delivering exceptional service while we handle the business logistics.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-primary/5 rounded-lg border-l-4 border-primary">
              <h4 className="font-semibold mb-2">Coming Soon: Service Marketplace</h4>
              <p className="text-sm text-muted-foreground">
                We're building a comprehensive marketplace where you can showcase your services, 
                connect with startups, and grow your business within the Knapsac ecosystem.
              </p>
            </div>

            <div className="text-center">
              <Button onClick={() => navigate('/')} size="lg" className="w-full">
                Explore the Platform
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ServiceProviderMotivation;
