
import { usePrivy } from "@privy-io/react-auth";
import LandingSlides from "./LandingSlides";

const AuthScreen = () => {
  const { login, authenticated } = usePrivy();

  return <LandingSlides onGetStarted={login} authenticated={authenticated} />;
};

export default AuthScreen;
