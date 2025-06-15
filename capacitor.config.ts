
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.c7081750f80e411da596b97444f3010c',
  appName: 'privy-crypto-hub',
  webDir: 'dist',
  server: {
    url: 'https://c7081750-f80e-411d-a596-b97444f3010c.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      showSpinner: false
    }
  }
};

export default config;
