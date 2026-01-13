import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'money.arkade.wallet',
  appName: 'Arkade Wallet',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
  },
  ios: {
    scheme: 'Arkade Wallet',
  },
};

export default config;
