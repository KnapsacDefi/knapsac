
import { Home, User, Briefcase } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useProfileData } from "@/hooks/useProfileData";
import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const BottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { authenticated, user, wallets } = useAuth();
  const [cachedProfileType, setCachedProfileType] = useState<string | null>(null);

  // Get wallet address - try multiple sources
  const walletAddress = wallets?.[0]?.address || user?.wallet?.address || null;
  
  // Use the profile data hook for consistent profile fetching
  const { profile: userProfile, isLoading: profileLoading, error } = useProfileData({
    walletAddress,
    enabled: authenticated && !!walletAddress
  });

  // Cache profile type in localStorage for faster subsequent loads
  useEffect(() => {
    const cacheKey = `profile_type_${walletAddress}`;
    
    if (userProfile?.profile_type) {
      // Cache the current profile type
      localStorage.setItem(cacheKey, userProfile.profile_type);
      setCachedProfileType(userProfile.profile_type);
    } else if (walletAddress && !profileLoading) {
      // Try to load cached profile type on initial load
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setCachedProfileType(cached);
      }
    }
  }, [userProfile?.profile_type, walletAddress, profileLoading]);

  // Get the profile type to use (fresh data or cached)
  const profileType = userProfile?.profile_type || cachedProfileType;

  // Debug logging to track profile loading
  console.log('🔍 BottomNavigation Debug:', {
    authenticated,
    walletAddress,
    userProfile,
    profileLoading,
    walletsCount: wallets?.length
  });

  const getNavItems = () => {
    const isServiceProvider = profileType === 'Service Provider';
    const isLender = profileType === 'Lender';
    
    console.log('🔍 Navigation Items Debug:', {
      isServiceProvider,
      isLender,
      profileType,
      cachedProfileType,
      authenticated,
      profileLoading
    });
    
    if (isServiceProvider) {
      return [
        {
          icon: Home,
          label: "Home",
          path: "/service-provider-motivation",
        },
        {
          icon: User,
          label: "Profile",
          path: "/profile",
        },
      ];
    }

    const baseNavItems = [
      {
        icon: Home,
        label: "Wallet", 
        path: "/",
      },
      {
        icon: User,
        label: "Profile",
        path: "/profile",
      },
    ];

    // Add Portfolio tab for all lenders
    if (isLender) {
      baseNavItems.splice(1, 0, {
        icon: Briefcase,
        label: "Portfolio",
        path: "/portfolio",
      });
    }

    return baseNavItems;
  };

  const getSkeletonNavItems = () => [
    {
      icon: Home,
      label: "Wallet",
      path: "/",
    },
    {
      icon: null, // Skeleton placeholder for potential portfolio
      label: "",
      path: "#",
      skeleton: true,
    },
    {
      icon: User,
      label: "Profile", 
      path: "/profile",
    },
  ];

  // Show skeleton navigation while loading, unless we have cached profile type
  const showSkeleton = profileLoading && !profileType && authenticated && walletAddress;
  const navItems = showSkeleton ? getSkeletonNavItems() : getNavItems();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
      <div className="flex items-center justify-around px-4 py-2 max-w-md mx-auto">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || 
                          (item.path === "/" && location.pathname === "/wallet");
          
          // Handle skeleton items
          if (item.skeleton) {
            return (
              <div key={`skeleton-${index}`} className="flex flex-col items-center gap-1 py-2 px-4">
                <Skeleton className="w-5 h-5 rounded" />
                <Skeleton className="w-12 h-3 rounded" />
              </div>
            );
          }
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center gap-1 py-2 px-4 rounded-lg transition-colors animate-fade-in",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
      
      {/* Error state with retry option */}
      {error && authenticated && walletAddress && (
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full bg-destructive text-destructive-foreground text-xs px-2 py-1 rounded">
          Profile load failed
        </div>
      )}
    </nav>
  );
};

export default BottomNavigation;
