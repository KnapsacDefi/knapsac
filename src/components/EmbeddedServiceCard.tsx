
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
  <div className="bg-card rounded-2xl shadow-md border flex flex-col items-center p-6 w-full hover:scale-[1.02] transition-transform">
    <div className="mb-4">{icon}</div>
    <h3 className="text-lg font-semibold mb-1 text-center">{title}</h3>
    <p className="text-sm text-muted-foreground text-center mb-2">{description}</p>
    {comingSoon && (
      <span className="mt-auto px-3 py-0.5 rounded-full bg-secondary text-xs text-secondary-foreground font-semibold">
        Coming Soon
      </span>
    )}
  </div>
);

export default EmbeddedServiceCard;
