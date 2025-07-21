
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

const ProfileBannerSkeleton = () => {
  return (
    <Card className="p-4 rounded-2xl shadow-lg border bg-gradient-to-r from-primary/10 to-secondary/10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-12 h-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className="h-10 w-20 rounded" />
      </div>
    </Card>
  );
};

export default ProfileBannerSkeleton;
