import { AspInfo } from './asp'
import { testServer } from './constants'

const faucet = {
  regtest: 'http://localhost:9999',
  signet: 'https://faucet.signet.arkade.sh',
  mutinynet: {
    main: 'https://faucet.mutinynet.arkade.sh',
    test: 'https://faucet-staging.mutinynet.arkade.sh',
  },
}

export const getFaucetUrl = (aspInfo: AspInfo): string => {
  const { network, url } = aspInfo
  if (network === 'regtest') return faucet.regtest
  if (network === 'signet') return faucet.signet
  if (network === 'mutinynet') {
    if (url === testServer) return faucet.mutinynet.test
    return faucet.mutinynet.main
  }
  return ''
}

export const callFaucet = async (address: string, amount: number, aspInfo: AspInfo): Promise<boolean> => {
  const faucetServerUrl = getFaucetUrl(aspInfo)
  if (!faucetServerUrl) return false
  const url = `${faucetServerUrl}/faucet`
  const res = await fetch(url, {
    body: JSON.stringify({ address, amount }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })
  return res.ok
}

export const pingFaucet = async (aspInfo: AspInfo): Promise<boolean> => {
  try {
    const faucetServerUrl = getFaucetUrl(aspInfo)
    if (!faucetServerUrl) return false
    const opt = { headers: { 'Content-Type': 'application/json' } }
    const url = `${faucetServerUrl}/healthcheck`
    const res = await fetch(url, opt)
    return res.ok
  } catch {
    return false
  }
}
