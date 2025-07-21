
import React from 'react';
import { RefreshCw } from 'lucide-react';
import DashboardHeader from '@/components/DashboardHeader';
import BottomNavigation from '@/components/BottomNavigation';

interface WithdrawalLoaderProps {
  message?: string;
}

const WithdrawalLoader: React.FC<WithdrawalLoaderProps> = ({ 
  message = "Loading..." 
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-background pb-20">
      <DashboardHeader />
      
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">{message}</p>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default WithdrawalLoader;
