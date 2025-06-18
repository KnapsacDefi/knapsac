
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

const DashboardHeader = () => {
  const { logout } = usePrivy();

  const handleLogout = () => {
    logout();
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
      <Button variant="ghost" size="icon" onClick={handleLogout}>
        <LogOut className="w-5 h-5" />
      </Button>
    </header>
  );
};

export default DashboardHeader;
