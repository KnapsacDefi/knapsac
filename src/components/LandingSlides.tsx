import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Wallet } from "lucide-react";
import { useState } from "react";

interface LandingSlidesProps {
  onGetStarted: () => void;
}

const slides = [
  {
    title: "Welcome to Knapsac",
    description: "Your gateway to the decentralized world. Connect, explore, and build with ease.",
    image: "/images/slide1.svg",
  },
  {
    title: "Seamless Authentication",
    description: "Securely access your favorite web3 apps with just a few taps. No more seed phrases!",
    image: "/images/slide2.svg",
  },
  {
    title: "Discover New Opportunities",
    description: "Explore a curated list of innovative projects and services. The future of web3 is at your fingertips.",
    image: "/images/slide3.svg",
  },
];

const LandingSlides = ({ onGetStarted }: LandingSlidesProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4 bg-background/80 backdrop-blur-sm border-b sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Wallet className="text-primary w-8 h-8" />
          <span className="text-xl font-bold text-primary">
            Knapsac
          </span>
        </div>
        <Button variant="outline" onClick={onGetStarted}>
          Sign In
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-md px-4 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {slides[currentSlide].title}
            </h1>
            <p className="text-gray-700 mb-8">
              {slides[currentSlide].description}
            </p>
            <img
              src={slides[currentSlide].image}
              alt={`Slide ${currentSlide + 1}`}
              className="mx-auto rounded-lg shadow-md"
            />
          </div>
        </div>

        {/* Bottom Navigation Dots */}
        <div className="flex justify-center items-center gap-2 py-6">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                currentSlide === index 
                  ? "bg-primary w-6" 
                  : "bg-primary/30 hover:bg-primary/50"
              )}
            />
          ))}
        </div>

        {/* Get Started Button */}
        <div className="px-4 pb-8">
          <Button
            onClick={onGetStarted}
            className="w-full h-12 text-lg font-semibold"
            size="lg"
          >
            Get Started
          </Button>
        </div>
      </main>
    </div>
  );
};

export default LandingSlides;
