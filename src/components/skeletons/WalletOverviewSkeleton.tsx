
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

const WalletOverviewSkeleton = () => {
  return (
    <Card className="p-6 rounded-2xl shadow-lg border">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-6" />
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-center">
            <Skeleton className="w-6 h-6 mr-2" />
            <div className="text-center">
              <Skeleton className="h-8 w-20 mb-1" />
              <Skeleton className="h-3 w-10" />
            </div>
          </div>
          
          <div className="flex items-center justify-center">
            <Skeleton className="w-6 h-6 mr-2" />
            <div className="text-center">
              <Skeleton className="h-8 w-24 mb-1" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Skeleton className="h-12 rounded" />
        <Skeleton className="h-12 rounded" />
        <Skeleton className="h-12 rounded" />
      </div>
    </Card>
  );
};

export default WalletOverviewSkeleton;
