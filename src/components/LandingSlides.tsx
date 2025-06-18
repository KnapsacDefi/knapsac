
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselApi } from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface LandingSlidesProps {
  onGetStarted: () => void;
}

const slides = [
  {
    title: "Welcome to Knapsac !",
    description: "Easy Startup Lending",
  },
  {
    title: "Get Credit to bootstrap your vision",
    description: "Let's take care of your essentials",
  },
  {
    title: "Lend impactfully with lower risk",
    description: "Earn up to 60% APR",
  },
  {
    title: "Provide essential services to startups",
    description: "Sell more while you support startups to win",
  },
];

const LandingSlides = ({ onGetStarted }: LandingSlidesProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [api, setApi] = useState<CarouselApi>();
  const { authenticated } = usePrivy();

  useEffect(() => {
    if (!api) {
      return;
    }

    setCurrentSlide(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrentSlide(api.selectedScrollSnap());
    });
  }, [api]);

  const scrollToSlide = (index: number) => {
    if (api) {
      api.scrollTo(index);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4 bg-background/80 backdrop-blur-sm border-b sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <img 
            src="https://jxfqfrfpaiijyvciclrw.supabase.co/storage/v1/object/public/images//Knapsac%20logo%20horizontal.png" 
            alt="Knapsac Logo" 
            className="h-8"
          />
        </div>
        {!authenticated && (
          <Button variant="outline" onClick={onGetStarted}>
            Sign In
          </Button>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center px-4">
          <Carousel 
            className="w-full max-w-md"
            opts={{
              align: "start",
              loop: true,
            }}
            setApi={setApi}
          >
            <CarouselContent>
              {slides.map((slide, index) => (
                <CarouselItem key={index}>
                  <div className="text-center p-6">
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">
                      {slide.title}
                    </h1>
                    <p className="text-gray-700 text-lg">
                      {slide.description}
                    </p>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>

        {/* Bottom Navigation Dots */}
        <div className="flex justify-center items-center gap-2 py-6">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollToSlide(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                currentSlide === index 
                  ? "bg-primary w-6" 
                  : "bg-primary/30 hover:bg-primary/50"
              )}
            />
          ))}
        </div>

        {/* Get Started Button - only show for unauthenticated users */}
        {!authenticated && (
          <div className="px-4 pb-8">
            <Button
              onClick={onGetStarted}
              className="w-full h-12 text-lg font-semibold"
              size="lg"
            >
              Get Started
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default LandingSlides;
