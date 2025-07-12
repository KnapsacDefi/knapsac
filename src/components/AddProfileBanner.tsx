import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserPlus, AlertCircle } from "lucide-react";

const AddProfileBanner = () => {
  const navigate = useNavigate();

  return (
    <Card className="bg-gradient-to-r from-destructive/10 to-destructive/5 border-destructive/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <CardTitle className="text-lg">Complete Your Profile</CardTitle>
          </div>
          <Badge variant="destructive" className="text-xs">
            Required
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          You need to create a profile to access wallet features and services.
        </p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <UserPlus className="w-4 h-4 text-destructive" />
            <span>Set up your profile to get started</span>
          </div>
          
          <Button onClick={() => navigate('/profile')} size="sm" variant="destructive">
            Create Profile
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AddProfileBanner;