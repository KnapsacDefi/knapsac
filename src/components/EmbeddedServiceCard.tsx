
import { ReactNode } from "react";

interface EmbeddedServiceCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  comingSoon?: boolean;
}

const EmbeddedServiceCard = ({
  icon,
  title,
  description,
  comingSoon = false,
}: EmbeddedServiceCardProps) => (
  <div className="bg-card rounded-xl shadow-md border flex flex-col items-center p-4 text-center hover:scale-[1.02] transition-transform">
    <div className="mb-3">{icon}</div>
    <h3 className="text-sm font-semibold mb-1">{title}</h3>
    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{description}</p>
    {comingSoon && (
      <span className="mt-auto px-2 py-0.5 rounded-full bg-secondary text-xs text-secondary-foreground font-semibold">
        Soon
      </span>
    )}
  </div>
);

export default EmbeddedServiceCard;
