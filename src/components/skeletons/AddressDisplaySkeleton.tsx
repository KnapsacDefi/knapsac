
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

const AddressDisplaySkeleton = () => {
  return (
    <Card className="p-4 rounded-2xl shadow-lg border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-40" />
          </div>
        </div>
        <Skeleton className="h-8 w-8 rounded" />
      </div>
    </Card>
  );
};

export default AddressDisplaySkeleton;
