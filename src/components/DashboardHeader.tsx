
import { Button } from "@/components/ui/button";
import { LogOut, Loader2, MessageCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const DashboardHeader = () => {
  const { logout, isLoggingOut } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleCustomerService = () => {
    window.open('https://wa.me/447893989530', '_blank');
  };

  return (
    <header className="flex items-center justify-between px-4 py-4 bg-background/80 backdrop-blur-sm border-b sticky top-0 z-10">
      <div className="flex items-center gap-2">
        <img 
          src="https://jxfqfrfpaiijyvciclrw.supabase.co/storage/v1/object/public/images//Knapsac%20logo%20horizontal.png" 
          alt="Knapsac Logo" 
          className="h-8"
        />
      </div>
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleCustomerService}
          title="Customer Service"
        >
          <MessageCircle className="w-5 h-5" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleLogout}
          disabled={isLoggingOut}
          title="Logout"
        >
          {isLoggingOut ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <LogOut className="w-5 h-5" />
          )}
        </Button>
      </div>
    </header>
  );
};

export default DashboardHeader;
