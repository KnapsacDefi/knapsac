
import { Home, User, Briefcase } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useProfileData } from "@/hooks/useProfileData";
import { useState } from "react";

const BottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { authenticated, user, wallets } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  // Get wallet address - try multiple sources
  const walletAddress = wallets?.[0]?.address || user?.wallet?.address || null;
  
  // Use the profile data hook for consistent profile fetching
  const { profile: userProfile, isLoading: profileLoading } = useProfileData({
    walletAddress,
    enabled: authenticated && !!walletAddress
  });

  // Debug logging to track profile loading
  console.log('🔍 BottomNavigation Debug:', {
    authenticated,
    walletAddress,
    userProfile,
    profileLoading,
    walletsCount: wallets?.length
  });

  const getNavItems = () => {
    const isServiceProvider = userProfile?.profile_type === 'Service Provider';
    const isLender = userProfile?.profile_type === 'Lender';
    
    console.log('🔍 Navigation Items Debug:', {
      isServiceProvider,
      isLender,
      profileType: userProfile?.profile_type,
      authenticated
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

    // Add Portfolio tab for all lenders (removed signed terms requirement)
    if (isLender) {
      baseNavItems.splice(1, 0, {
        icon: Briefcase,
        label: "Portfolio",
        path: "/portfolio",
      });
    }

    return baseNavItems;
  };

  const navItems = getNavItems();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
      <div className="flex items-center justify-around px-4 py-2 max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || 
                          (item.path === "/" && location.pathname === "/wallet");
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center gap-1 py-2 px-4 rounded-lg transition-colors",
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
    </nav>
  );
};

export default BottomNavigation;
