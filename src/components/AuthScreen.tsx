
import { usePrivy } from "@privy-io/react-auth";
import LandingSlides from "./LandingSlides";

const AuthScreen = () => {
  const { login } = usePrivy();

  return <LandingSlides onGetStarted={login} />;
};

export default AuthScreen;
