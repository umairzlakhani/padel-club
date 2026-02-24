import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ul.matchday.app',
  appName: 'Match Day',
  // Minimal fallback directory — the app loads from the server URL below
  webDir: 'capacitor-app',
  server: {
    // IMPORTANT: Set this to your deployed URL before building for the App Store
    // For development, use your local network IP:
    url: 'http://192.168.18.115:3000',
    cleartext: true,
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    backgroundColor: '#0a0a0a',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#0a0a0a',
      showSpinner: false,
      launchFadeOutDuration: 300,
    },
  },
};

export default config;
