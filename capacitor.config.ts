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
  plugins: {
    CapacitorSQLite: {
      iosDatabaseLocation: 'Library/CapacitorDatabase',
      iosIsEncryption: false,
      iosKeychainPrefix: 'arkade',
      iosBiometric: {
        biometricAuth: false,
        biometricTitle: 'Biometric login for capacitor sqlite',
      },
      androidIsEncryption: false,
      androidBiometric: {
        biometricAuth: false,
        biometricTitle: 'Biometric login for capacitor sqlite',
        biometricSubTitle: 'Log in using your biometric',
      },
    },
  },
};

export default config;
