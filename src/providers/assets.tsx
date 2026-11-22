import { ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { normalizeAssetId, trackedAssetIds } from '../lib/assetLibrary'
import { consoleError } from '../lib/logs'
import { AspContext } from './asp'

const repo = 'https://raw.githubusercontent.com/ArkLabsHQ/asset-registry/master'

type AssetsContextProps = {
  isRegistered: (assetId: string) => boolean
  registryAssetIds?: readonly string[]
  registryStatus?: 'loading' | 'ready' | 'unavailable'
}

export const AssetsContext = createContext<AssetsContextProps>({
  isRegistered: () => false,
})

export const AssetsProvider = ({ children }: { children: ReactNode }) => {
  const { aspInfo } = useContext(AspContext)

  const [assetRegistry, setAssetRegistry] = useState<{ network: string; ids: string[] | null }>()

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
    if (!aspInfo.network) return
    const network = aspInfo.network
    const url = getRegistryUrl(network)
    if (!url) return
    const controller = new AbortController()
    fetch(url, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json()
      })
      .then((data: unknown) => {
        if (!Array.isArray(data)) throw new Error('Invalid asset registry response')
        if (!controller.signal.aborted) {
          setAssetRegistry({ network, ids: trackedAssetIds(data.filter((id): id is string => typeof id === 'string')) })
        }
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        setAssetRegistry({ network, ids: null })
        consoleError(error, 'Error fetching asset registry data:')
      })
    return () => controller.abort()
  }, [aspInfo.network])

  const registry = assetRegistry?.network === aspInfo.network ? assetRegistry : undefined
  const registryAssetIds = registry?.ids ?? undefined
  const isRegistered = (assetId: string) => registryAssetIds?.includes(normalizeAssetId(assetId)) ?? false
  const registryStatus = registryAssetIds
    ? 'ready'
    : registry || !getRegistryFileName(aspInfo.network)
      ? 'unavailable'
      : 'loading'

  return (
    <AssetsContext.Provider value={{ isRegistered, registryAssetIds, registryStatus }}>
      {children}
    </AssetsContext.Provider>
  )
}
