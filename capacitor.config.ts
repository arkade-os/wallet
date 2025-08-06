import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.arkadeos.wallet',
  appName: 'Arkade Wallet',
  webDir: 'dist',
  server: {
    allowNavigation: [
      // ARK servers
      'localhost:7070',
      'arkade.money',
      'arkade.computer',
      'arkade.sh',
      '*.arkade.sh',
      // Bitcoin explorers
      '*.blockstream.info',
      'blockstream.info',
      '*.mempool.space',
      'mempool.space',
    ],
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    ArkadeWallet: {
      arkServerUrl: 'https://mutinynet.arkade.sh',
    },
  },
}

export default config
