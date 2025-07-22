import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Wallet, AlertCircle, Settings, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { SUPPORTED_TOKENS, CHAIN_CONFIG, type SupportedChain } from "@/constants/tokens";
import BottomNavigation from "@/components/BottomNavigation";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { getWalletAddress } from "@/utils/walletUtils";
import { useProfileData } from "@/hooks/useProfileData";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import { profileService } from "@/services/profileService";
import { useToast } from "@/hooks/use-toast";

// Enhanced token type that includes chain information
interface EnhancedToken {
  symbol: string;
  address: string;
  decimals: number;
  chain: SupportedChain;
  chainDisplayName: string;
  name: string;
  isPopular: boolean;
}

const Withdraw = () => {
  const navigate = useNavigate();
  const { user, wallets, authenticated, ready, walletsLoading } = useAuth();
  const { toast } = useToast();
  const [showAllTokens, setShowAllTokens] = useState(false);
  const [isUpdatingPreference, setIsUpdatingPreference] = useState(false);
  const [localSwitchState, setLocalSwitchState] = useState(false);

  const walletAddress = getWalletAddress(wallets, user);
  const { profile, isLoading: profileLoading, error: profileError } = useProfileData({
    walletAddress,
    enabled: authenticated && ready && !!walletAddress && !walletsLoading
  });

  const { tokenBalances, isLoading: balancesLoading, getTokenBalance, refreshBalances } = useTokenBalances({
    walletAddress,
    enabled: authenticated && ready && !!walletAddress && !walletsLoading
  });

  // Load user preference from profile and sync with local state
  useEffect(() => {
    if (profile && typeof profile.show_all_tokens === 'boolean') {
      console.log('🔧 Loading user preference from profile:', profile.show_all_tokens);
      setShowAllTokens(profile.show_all_tokens);
      setLocalSwitchState(profile.show_all_tokens);
    }
  }, [profile]);

  const handleShowAllTokensChange = async (checked: boolean) => {
    console.log('🔄 Switch toggled to:', checked);
    
    // Immediately update local state for responsive UI
    setLocalSwitchState(checked);
    
    if (!walletAddress) {
      toast({
        title: "Error",
        description: "Wallet address not found",
        variant: "destructive",
      });
      setLocalSwitchState(showAllTokens); // Revert local state
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
      console.log('✅ Preference updated successfully');
      toast({
        title: "Preference Updated",
        description: `${checked ? 'All tokens' : 'Only Ethereum USDC'} will be shown`,
      });
    } catch (error) {
      console.error('❌ Failed to update preference:', error);
      setLocalSwitchState(showAllTokens); // Revert local state on error
      toast({
        title: "Update Failed",
        description: "Failed to save preference. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingPreference(false);
    }
  };

  // Create enhanced tokens array with chain context
  const createEnhancedTokens = (): EnhancedToken[] => {
    const enhancedTokens: EnhancedToken[] = [];

    Object.entries(SUPPORTED_TOKENS).forEach(([chainKey, tokens]) => {
      const chain = chainKey as SupportedChain;
      const chainConfig = CHAIN_CONFIG[chain];

      tokens.forEach(token => {
        enhancedTokens.push({
          ...token,
          chain,
          chainDisplayName: chainConfig.displayName,
          name: token.symbol === 'G$' ? 'GoodDollar' : token.symbol,
          // Only Ethereum USDC is considered popular for the initial filter
          isPopular: token.symbol === 'USDC' && chain === 'ethereum'
        });
      });
    });

    return enhancedTokens;
  };

  const allTokens = createEnhancedTokens();

  // Filter tokens based on user preference - use local state for immediate feedback
  const filteredTokens = localSwitchState 
    ? allTokens 
    : allTokens.filter(token => token.isPopular); // Only Ethereum USDC when false

  const handleTokenSelect = (token: EnhancedToken) => {
    // Get the actual balance for this token
    const tokenBalance = getTokenBalance(token.symbol, token.chain);
    const balance = tokenBalance?.balance || '0.00';

    const tokenWithChain = {
      ...token,
      chain: token.chain
    };

    if (token.symbol === 'USDC') {
      // Fixed route: /withdraw/wallet instead of /withdraw-wallet
      navigate('/withdraw/wallet', { 
        state: { 
          token: tokenWithChain,
          balance: balance
        } 
      });
    } else if (token.symbol === 'G$') {
      // Fixed route: /withdraw/mobile-money instead of /withdraw-mobile-money
      navigate('/withdraw/mobile-money', { 
        state: { 
          token: tokenWithChain,
          balance: balance
        } 
      });
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
          {balancesLoading && (
            <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground ml-auto" />
          )}
        </div>
      </div>

      <div className="p-4 space-y-6">
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
                  Display all available tokens instead of just Ethereum USDC
                </p>
              </div>
              <Switch
                id="show-all-tokens"
                checked={localSwitchState}
                onCheckedChange={handleShowAllTokensChange}
                disabled={isUpdatingPreference}
              />
            </div>
          </CardContent>
        </Card>

        {/* Token Selection */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Select Token to Withdraw
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshBalances}
                disabled={balancesLoading}
              >
                <RefreshCw className={`h-4 w-4 ${balancesLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {filteredTokens.map((token, index) => {
              const tokenBalance = getTokenBalance(token.symbol, token.chain);
              
              return (
                <div key={`${token.symbol}-${token.chain}`}>
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
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{token.symbol}</span>
                          <Badge variant="secondary" className="text-xs">
                            {token.chainDisplayName}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {token.name}
                        </div>
                        <div className="text-sm font-medium mt-1">
                          {tokenBalance?.loading ? (
                            <Skeleton className="h-4 w-16" />
                          ) : tokenBalance?.error ? (
                            <span className="text-destructive">Error loading</span>
                          ) : (
                            <span>Balance: {tokenBalance?.balance || '0.00'}</span>
                          )}
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
              );
            })}
            
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
          {!localSwitchState && " (Ethereum USDC only)"}
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Withdraw;
