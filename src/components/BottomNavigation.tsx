
import { Home, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { usePrivy } from "@privy-io/react-auth";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const BottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = usePrivy();
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.email?.address) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_email', user.email.address)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
        } else {
          setUserProfile(data);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      }
    };

    fetchUserProfile();
  }, [user?.email?.address]);

  const getNavItems = () => {
    const isServiceProvider = userProfile?.profile_type === 'Service Provider';
    
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

    return [
      {
        icon: Home,
        label: "Wallet",
        path: "/wallet",
      },
      {
        icon: User,
        label: "Profile",
        path: "/profile",
      },
    ];
  };

  const navItems = getNavItems();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
      <div className="flex items-center justify-around px-4 py-2 max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
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
