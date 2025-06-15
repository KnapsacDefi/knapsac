
import { Banknote, CreditCard, Gift, Wallet } from "lucide-react";
import EmbeddedServiceCard from "./EmbeddedServiceCard";

const services = [
  {
    icon: <Wallet className="w-8 h-8 text-primary" />,
    title: "Mobile Money",
    description: "Send and receive funds via mobile money platforms.",
    comingSoon: true,
  },
  {
    icon: <Banknote className="w-8 h-8 text-green-600" />,
    title: "Bank Transfers",
    description: "Seamless local and international bank transfers.",
    comingSoon: true,
  },
  {
    icon: <CreditCard className="w-8 h-8 text-blue-500" />,
    title: "Virtual Cards",
    description: "Generate and manage virtual debit cards for spending.",
    comingSoon: true,
  },
  {
    icon: <Gift className="w-8 h-8 text-amber-500" />,
    title: "Gift Cards",
    description: "Buy and send gift cards in various denominations.",
    comingSoon: true,
  },
];

const EmbeddedServices = () => (
  <section className="grid grid-cols-2 gap-4">
    {services.map((svc) => (
      <EmbeddedServiceCard
        key={svc.title}
        icon={svc.icon}
        title={svc.title}
        description={svc.description}
        comingSoon={svc.comingSoon}
      />
    ))}
  </section>
);

export default EmbeddedServices;
