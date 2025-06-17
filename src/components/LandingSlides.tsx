
import { useState } from "react";
import { ChevronLeft, ChevronRight, TrendingUp, Rocket, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Slide {
  icon: React.ComponentType<{ className?: string }>;
  caption: string;
  description: string;
  gradient: string;
}

const slides: Slide[] = [
  {
    icon: TrendingUp,
    caption: "Lend impactfully at higher rates",
    description: "Earn up to 60% APR onchain",
    gradient: "from-blue-500 to-purple-600"
  },
  {
    icon: Rocket,
    caption: "Get Credit to bootstrap your vision",
    description: "Let's take care of your essentials",
    gradient: "from-green-500 to-teal-600"
  },
  {
    icon: Building2,
    caption: "Provide essential services to startups",
    description: "Sell more while you support startups to win",
    gradient: "from-orange-500 to-red-600"
  }
];

interface LandingSlidesProps {
  onGetStarted: () => void;
}

const LandingSlides = ({ onGetStarted }: LandingSlidesProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const current = slides[currentSlide];
  const IconComponent = current.icon;

  return (
    <div className="min-h-screen flex flex-col justify-between bg-background relative overflow-hidden">
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${current.gradient} opacity-5 transition-all duration-700 ease-in-out`} />
      
      {/* Navigation arrows */}
      <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={prevSlide}
          className="rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
      </div>
      
      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={nextSlide}
          className="rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30"
        >
          <ChevronRight className="w-6 h-6" />
        </Button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 text-center relative z-10">
        {/* Knapsac branding */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-primary mb-2">Knapsac</h1>
          <p className="text-lg text-muted-foreground">Empowering Startup Dreams from Day One</p>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">
            The essential funding platform designed to fuel your bootstrapping journey
          </p>
        </div>

        {/* Slide content */}
        <div className="max-w-lg mx-auto mb-12 transition-all duration-700 ease-in-out transform">
          <div className={`w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br ${current.gradient} flex items-center justify-center shadow-lg`}>
            <IconComponent className="w-12 h-12 text-white" />
          </div>
          
          <h2 className="text-2xl font-bold mb-4 text-foreground">
            {current.caption}
          </h2>
          
          <p className="text-lg text-muted-foreground">
            {current.description}
          </p>
        </div>

        {/* Get Started button */}
        <Button
          onClick={onGetStarted}
          size="lg"
          className={`px-8 py-3 text-lg font-semibold bg-gradient-to-r ${current.gradient} hover:opacity-90 transition-all duration-300 shadow-lg`}
        >
          Get Started
        </Button>
      </div>

      {/* Slide indicators */}
      <div className="flex justify-center space-x-2 pb-8 relative z-10">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              index === currentSlide
                ? 'bg-primary scale-125'
                : 'bg-primary/30 hover:bg-primary/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default LandingSlides;
