import { ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { consoleError } from '../lib/logs'
import { OperatorContext } from './operator'

const repo = 'https://raw.githubusercontent.com/ArkLabsHQ/asset-registry/master'

type AssetsContextProps = {
  isRegistered: (assetId: string) => boolean
}

export const AssetsContext = createContext<AssetsContextProps>({
  isRegistered: () => false,
})

export const AssetsProvider = ({ children }: { children: ReactNode }) => {
  const { operatorInfo } = useContext(OperatorContext)

  const [assetRegistry, setAssetRegistry] = useState<string[]>()

  const getRegistryUrl = (network: string): string => {
    if (!getRegistryFileName(network)) return ''
    const host = network === 'regtest' ? '/asset-registry' : repo
    return `${host}/${getRegistryFileName(network)}`
  }

  const getRegistryFileName = (network: string): string => {
    if (network === 'bitcoin') return 'mainnet.json'
    if (network === 'mutinynet') return 'mutinynet.json'
    if (network === 'regtest') return 'regtest.json'
    if (network === 'signet') return 'signet.json'
    return ''
  }

  useEffect(() => {
    setAssetRegistry(undefined)
    if (!operatorInfo.network) return
    const url = getRegistryUrl(operatorInfo.network)
    if (!url) return
    let cancelled = false
    fetch(url)
      .then((response) => response.json())
      .then((data: string[]) => {
        if (!cancelled) setAssetRegistry(data)
      })
      .catch((error) => consoleError(error, 'Error fetching asset registry data:'))
    return () => {
      cancelled = true
    }
  }, [operatorInfo.network])

  const isRegistered = (assetId: string): boolean => {
    return assetRegistry?.includes(assetId) ?? false
  }

  return <AssetsContext.Provider value={{ isRegistered }}>{children}</AssetsContext.Provider>
}
