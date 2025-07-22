
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Wallet, AlertCircle, Settings, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SUPPORTED_TOKENS } from "@/constants/tokens";
// Fixed import to use default export
import BottomNavigation from "@/components/BottomNavigation";
import NetworkStatus from "@/components/NetworkStatus";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { getWalletAddress } from "@/utils/walletUtils";
import { useProfileData } from "@/hooks/useProfileData";
import { profileService } from "@/services/profileService";
import { useToast } from "@/hooks/use-toast";

const Withdraw = () => {
  const navigate = useNavigate();
  const { user, wallets, authenticated, ready, walletsLoading } = useAuth();
  const { toast } = useToast();
  const [showAllTokens, setShowAllTokens] = useState(false);
  const [isUpdatingPreference, setIsUpdatingPreference] = useState(false);

  const walletAddress = getWalletAddress(wallets, user);
  const { profile, isLoading: profileLoading, error: profileError } = useProfileData({
    walletAddress,
    enabled: authenticated && ready && !!walletAddress && !walletsLoading
  });

  // Load user preference from profile
  useEffect(() => {
    if (profile && typeof profile.show_all_tokens === 'boolean') {
      console.log('🔧 Loading user preference from profile:', profile.show_all_tokens);
      setShowAllTokens(profile.show_all_tokens);
    }
  }, [profile]);

  const handleShowAllTokensChange = async (checked: boolean) => {
    if (!walletAddress) {
      toast({
        title: "Error",
        description: "Wallet address not found",
        variant: "destructive",
      });
      return;
    }

    if (!profile) {
      // If no profile, just update local state
      setShowAllTokens(checked);
      toast({
        title: "Setting Updated",
        description: "Token display preference updated (saved locally)",
      });
      return;
    }

    setIsUpdatingPreference(true);
    try {
      await profileService.updateShowAllTokens(walletAddress, checked);
      setShowAllTokens(checked);
      toast({
        title: "Preference Updated",
        description: `${checked ? 'All tokens' : 'Only popular tokens'} will be shown`,
      });
    } catch (error) {
      console.error('Failed to update preference:', error);
      toast({
        title: "Update Failed",
        description: "Failed to save preference. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingPreference(false);
    }
  };

  // Create tokens array from SUPPORTED_TOKENS with isPopular flag
  const allTokens = Object.values(SUPPORTED_TOKENS).flat().map(token => ({
    ...token,
    name: token.symbol === 'G$' ? 'GoodDollar' : token.symbol,
    isPopular: ['USDC', 'G$'].includes(token.symbol)
  }));

  // Filter tokens based on user preference
  const filteredTokens = showAllTokens 
    ? allTokens 
    : allTokens.filter(token => token.isPopular);

  const handleTokenSelect = (token: any) => {
    if (token.symbol === 'USDC') {
      navigate('/withdraw-wallet', { state: { selectedToken: token } });
    } else if (token.symbol === 'G$') {
      navigate('/withdraw-mobile-money', { state: { selectedToken: token } });
    }
  };

  const hasCompleteProfile = profile && profile.signed_terms_hash && profile.signed_terms_hash.trim() !== '';

  // Show loading state when wallets are still loading
  if (authenticated && ready && (walletsLoading || (!walletAddress && profileLoading))) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="sticky top-0 z-10 bg-background border-b">
          <div className="flex items-center gap-4 p-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/wallet')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">Withdraw</h1>
          </div>
        </div>

        <div className="p-4 flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">
              {walletsLoading ? 'Loading wallet...' : 'Loading preferences...'}
            </p>
          </div>
        </div>

        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center gap-4 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/wallet')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Withdraw</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Temporarily remove NetworkStatus as it needs network management props */}
        
        {/* Profile Status */}
        {profileLoading && (
          <Alert>
            <Settings className="h-4 w-4" />
            <AlertDescription>
              Loading your preferences...
            </AlertDescription>
          </Alert>
        )}

        {profileError && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Unable to load profile preferences. Using default settings.
            </AlertDescription>
          </Alert>
        )}

        {!hasCompleteProfile && !profileLoading && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <span>For better experience and full features, </span>
              <Button 
                variant="link" 
                className="p-0 h-auto font-semibold underline"
                onClick={() => navigate('/profile?redirect=/withdraw')}
              >
                complete your profile setup
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Token Display Preference */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Display Preferences
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="show-all-tokens" className="text-sm font-medium">
                  Show All Tokens
                </Label>
                <p className="text-xs text-muted-foreground">
                  Display all available tokens instead of just popular ones
                </p>
              </div>
              <Switch
                id="show-all-tokens"
                checked={showAllTokens}
                onCheckedChange={handleShowAllTokensChange}
                disabled={isUpdatingPreference}
              />
            </div>
          </CardContent>
        </Card>

        {/* Token Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Select Token to Withdraw
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {filteredTokens.map((token, index) => (
              <div key={token.symbol}>
                <Button
                  variant="outline"
                  className="w-full justify-start p-4 h-auto"
                  onClick={() => handleTokenSelect(token)}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary">
                        {token.symbol.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium">{token.symbol}</div>
                      <div className="text-sm text-muted-foreground">
                        {token.name}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">
                        {token.symbol === 'USDC' ? 'Wallet Transfer' : 'Mobile Money'}
                      </div>
                    </div>
                  </div>
                </Button>
                {index < filteredTokens.length - 1 && <Separator className="my-2" />}
              </div>
            ))}
            
            {filteredTokens.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Wallet className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No tokens available for withdrawal</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-xs text-muted-foreground text-center">
          Showing {filteredTokens.length} of {allTokens.length} available tokens
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Withdraw;
