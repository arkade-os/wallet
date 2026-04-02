// src/screens/Apps/Banco/Swap.tsx
import { useContext, useEffect, useRef, useState } from 'react'
import { hex } from '@scure/base'
import { banco, ArkAddress, asset } from '@arkade-os/sdk'
import LoadingLogo from '../../../components/LoadingLogo'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { FlowContext } from '../../../providers/flow'
import { AspContext } from '../../../providers/asp'
import { WalletContext } from '../../../providers/wallet'
import { BancoContext } from '../../../providers/banco'
import { consoleError } from '../../../lib/logs'
import { extractError } from '../../../lib/error'

const INTROSPECTOR_URL = import.meta.env.VITE_INTROSPECTOR_URL
const CANCEL_DELAY_SECONDS = 300

type SwapPhase = 'creating' | 'funding' | 'done' | 'error'

const phaseText: Record<SwapPhase, string> = {
  creating: 'Creating offer...',
  funding: 'Funding swap...',
  done: '',
  error: '',
}

export default function AppBancoSwap() {
  const { navigate } = useContext(NavigationContext)
  const { bancoInfo } = useContext(FlowContext)
  const { aspInfo } = useContext(AspContext)
  const { svcWallet } = useContext(WalletContext)
  const { addSwap, setSelectedSwapId } = useContext(BancoContext)

  const [phase, setPhase] = useState<SwapPhase>('creating')
  const [error, setError] = useState('')
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    if (!svcWallet || !aspInfo.url || !INTROSPECTOR_URL) {
      setError('Missing configuration')
      setPhase('error')
      return
    }

    const execute = async () => {
      try {
        // Phase 1: Create offer
        setPhase('creating')
        const serverUrl = aspInfo.url.startsWith('http') ? aspInfo.url : 'http://' + aspInfo.url
        const maker = new banco.Maker(svcWallet, serverUrl, INTROSPECTOR_URL)
        const { offer, packet, swapPkScript } = await maker.createOffer({
          wantAmount: BigInt(bancoInfo.receiveAmount ?? 0),
          wantAsset: bancoInfo.receiveAsset ? asset.AssetId.fromString(bancoInfo.receiveAsset) : undefined,
          offerAsset: bancoInfo.payAsset ? asset.AssetId.fromString(bancoInfo.payAsset) : undefined,
          cancelDelay: CANCEL_DELAY_SECONDS,
        })

        // Convert swapPkScript to ark address
        // pkScript = OP_1 (0x51) + PUSH32 (0x20) + 32-byte vtxoTaprootKey
        const vtxoTaprootKey = swapPkScript.slice(2)
        const info = await fetch(serverUrl + '/v1/info').then((r) => r.json())
        const rawServerPubkey = hex.decode(info.signerPubkey || info.signer_pubkey || '')
        const serverPubKeyBytes = rawServerPubkey.length === 33 ? rawServerPubkey.slice(1) : rawServerPubkey
        const addrPrefix = info.addrPrefix || info.addr_prefix || 'tark'
        const swapAddress = new ArkAddress(serverPubKeyBytes, vtxoTaprootKey, addrPrefix).encode()

        // Phase 2: Fund the swap
        setPhase('funding')
        const fundingTxid = await svcWallet.send({
          address: swapAddress,
          amount: bancoInfo.payAmount ?? 0,
          extensions: [{ type: packet.type(), payload: packet.serialize() }],
        })

        // Save to store
        const cancelAt = Math.floor(Date.now() / 1000) + CANCEL_DELAY_SECONDS
        addSwap({
          id: fundingTxid,
          pair: bancoInfo.pair ?? '',
          payAmount: bancoInfo.payAmount ?? 0,
          payAsset: bancoInfo.payAsset ?? '',
          receiveAmount: bancoInfo.receiveAmount ?? 0,
          receiveAsset: bancoInfo.receiveAsset ?? '',
          swapAddress,
          swapPkScript: hex.encode(swapPkScript),
          offerHex: offer,
          fundingTxid,
          status: 'pending',
          createdAt: Date.now(),
          cancelAt,
        })

        setSelectedSwapId(fundingTxid)
        setPhase('done')
      } catch (err) {
        consoleError(err, 'error during banco swap')
        setError(extractError(err))
        setPhase('error')
      }
    }

    execute()
  }, [])

  if (phase === 'done') {
    navigate(Pages.AppBancoDetail)
    return null
  }

  if (phase === 'error') {
    return <LoadingLogo text={error || 'Swap failed'} />
  }

  return <LoadingLogo text={phaseText[phase]} />
}
