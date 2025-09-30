import { ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { EscrowClient } from '../lib/escrow'
import { AspContext } from './asp'
import { WalletContext } from './wallet'
import { ConfigContext } from './config'
import { BoltzUrl } from '../lib/constants'
import { consoleError } from '../lib/logs'
import { getPrivateKey } from '../lib/privateKey'

const BASE_URLS: Record<string, string> = {
  mutinynet: 'https://api.escrow.mutinynet.arkade.sh',
  regtest: 'http://localhost:3002',
}

interface EscrowContextProps {
  signout: () => void
  signin: (password: string) => void
  isSignedIn: boolean
}

export const EscrowContext = createContext<EscrowContextProps>({
  signout: () => {},
  signin: () => {},
  isSignedIn: false
})

export const EscrowProvider = async ({ children }: { children: ReactNode }) => {
  const { aspInfo } = useContext(AspContext)
  const { svcWallet } = useContext(WalletContext)
  const { config, updateConfig } = useContext(ConfigContext)
  const [escrowClient, setEscrowClient] = useState<EscrowClient>(new EscrowClient(BASE_URLS[aspInfo.network], aspInfo, svcWallet!))
  const [ isSignedIn, setIsSignedIn ] = useState(false)


  const signin = async (password: string) => {
    const priv = await getPrivateKey(password)
    console.log('signin: ', priv)
    await escrowClient.signin(priv)
    setIsSignedIn(true)
  }

  const signout = async () => {
    await escrowClient.signout()
    setIsSignedIn(false)
  }

  return (
    <EscrowContext.Provider
      value={{
        signin,
        signout,
        isSignedIn
      }}
    >
      {children}
    </EscrowContext.Provider>
  )
}