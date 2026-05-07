import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Button from '../../../components/Button'
import Padded from '../../../components/Padded'
import QrCode from '../../../components/QrCode'
import { FlowContext } from '../../../providers/flow'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { WalletContext } from '../../../providers/wallet'
import { NotificationsContext } from '../../../providers/notifications'
import Header from '../../../components/Header'
import Content from '../../../components/Content'
import { consoleError } from '../../../lib/logs'
import { canBrowserShareData, shareData } from '../../../lib/share'
import FlexCol from '../../../components/FlexCol'
import FlexRow from '../../../components/FlexRow'
import { LimitsContext } from '../../../providers/limits'
import { Asset, Coin, ExtendedVirtualCoin } from '@arkade-os/sdk'
import LoadingLogo from '../../../components/LoadingLogo'
import { SwapsContext } from '../../../providers/swaps'
import { encodeBip21, encodeBip21Asset } from '../../../lib/bip21'
import { BoltzChainSwap, BoltzReverseSwap } from '@arkade-os/boltz-swap'
import { enableChainSwapsReceive, lnurlServerUrl } from '../../../lib/constants'
import { centsToUnits } from '../../../lib/assets'
import WarningBox from '../../../components/Warning'
import ErrorMessage from '../../../components/Error'
import { getReceivingAddresses } from '../../../lib/asp'
import { extractError } from '../../../lib/error'
import InputAmount from '../../../components/InputAmount'
import Keyboard from '../../../components/Keyboard'
import SheetModal from '../../../components/SheetModal'
import Text, { TextSecondary } from '../../../components/Text'
import { copyToClipboard } from '../../../lib/clipboard'
import { useToast } from '../../../components/Toast'
import { prettyLongText, prettyNumber } from '../../../lib/format'
import CopyIcon from '../../../icons/Copy'
import CheckMarkIcon from '../../../icons/CheckMark'
import { hapticLight, hapticSubtle } from '../../../lib/haptics'
import { isMobileBrowser } from '../../../lib/browser'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import Focusable from '../../../components/Focusable'
import { useLnurlSession } from '../../../hooks/useLnurlSession'
import { useReducedMotion } from '../../../hooks/useReducedMotion'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import { AssetOption } from '../../../lib/types'
import { EASE_OUT_QUINT } from '../../../lib/animations'
import ChevronDownIcon from '../../../icons/ChevronDown'

type ReceiveAssetTicker = 'BTC' | 'USDT' | 'USDC'

const RECEIVE_ASSET_STORAGE_KEY = 'arkade-receive-asset-ticker'

interface ReceiveAssetOption {
  assetId: string
  name: string
  ticker: ReceiveAssetTicker
}

export default function ReceiveQRCode() {
  const { useFiat } = useContext(ConfigContext)
  const { toFiat, fiatDecimals } = useContext(FiatContext)
  const { navigate } = useContext(NavigationContext)
  const { recvInfo, setRecvInfo } = useContext(FlowContext)
  const { notifyPaymentReceived } = useContext(NotificationsContext)
  const { arkadeSwaps, swapsInitError, connected, createBtcToArkSwap, createReverseSwap } = useContext(SwapsContext)
  const { assetBalances, assetMetadataCache, svcWallet } = useContext(WalletContext)
  const { minSwapAllowed, validBtcToArk, validLnSwap, validUtxoTx, validVtxoTx, utxoTxsAllowed, vtxoTxsAllowed } =
    useContext(LimitsContext)

  const { toast } = useToast()

  const [sharing, setSharing] = useState(false)
  const [addressesLoaded, setAddressesLoaded] = useState(false)
  const [qrTransform, setQrTransform] = useState('')

  // Amount sheet state
  const [showAmountSheet, setShowAmountSheet] = useState(false)
  const [showKeys, setShowKeys] = useState(false)
  const [amountInput, setAmountInput] = useState(0)
  const [amountTextValue, setAmountTextValue] = useState('')

  // Copy address sheet state
  const [showCopySheet, setShowCopySheet] = useState(false)
  const [copied, setCopied] = useState('')
  const [showAssetMenu, setShowAssetMenu] = useState(false)

  const prefersReducedMotion = useReducedMotion()

  // Receive methods
  const { boardingAddr, offchainAddr, satoshis, assetId, addressError, received } = recvInfo
  const assetMeta = assetId ? assetMetadataCache.get(assetId) : undefined
  const isAssetReceive = assetId && assetId !== ''
  const hasError = Boolean(addressError)
  const receiveAssetOptions = useMemo(
    () => buildReceiveAssetOptions(assetBalances, assetMetadataCache),
    [assetBalances, assetMetadataCache],
  )
  const [preferredReceiveTicker, setPreferredReceiveTicker] = useState<ReceiveAssetTicker>(() =>
    readStoredReceiveAssetTicker(),
  )
  const selectedReceiveAsset =
    receiveAssetOptions.find((option) => option.assetId && option.assetId === assetId) ??
    receiveAssetOptions.find((option) => option.ticker === preferredReceiveTicker) ??
    receiveAssetOptions[0]

  const [noPaymentMethods, setNoPaymentMethods] = useState(false)
  const [arkAddress, setArkAddress] = useState(offchainAddr)
  const [btcAddress, setBtcAddress] = useState(boardingAddr)
  const [showQrCode, setShowQrCode] = useState(!satoshis)
  const [swapsTimedOut, setSwapsTimedOut] = useState(false)
  const [swapAddress, setSwapAddress] = useState('')
  const [qrCodeValue, setQrCodeValue] = useState('')
  const [bip21Uri, setBip21Uri] = useState('')
  const [invoice, setInvoice] = useState('')

  // Fetch addresses on mount
  useEffect(() => {
    if (!svcWallet) return
    if (boardingAddr && offchainAddr) {
      setAddressesLoaded(true)
      return
    }
    getReceivingAddresses(svcWallet)
      .then(({ offchainAddr, boardingAddr }) => {
        if (!offchainAddr) throw 'Unable to get offchain address'
        if (!boardingAddr) throw 'Unable to get boarding address'
        setRecvInfo({ ...recvInfo, boardingAddr, offchainAddr, satoshis: 0, addressError: undefined })
        setAddressesLoaded(true)
      })
      .catch((err) => {
        const error = extractError(err)
        consoleError(error, 'error getting addresses')
        setRecvInfo({ ...recvInfo, addressError: error })
        setAddressesLoaded(true)
      })
  }, [svcWallet])

  // LNURL session for amountless Lightning receives
  const isAmountlessLnurl =
    !satoshis && !isAssetReceive && !!lnurlServerUrl && connected && !!arkadeSwaps && !swapsInitError

  const handleInvoiceRequest = useCallback(
    async (req: { amountMsat: number }) => {
      const sats = Math.floor(req.amountMsat / 1000)
      const pendingSwap = await createReverseSwap(sats)
      if (!pendingSwap) throw new Error('Failed to create reverse swap')
      // Auto-claim in background
      if (arkadeSwaps) {
        arkadeSwaps
          .waitAndClaim(pendingSwap)
          .then(() => {
            setRecvInfo({ ...recvInfo, received: true, satoshis: pendingSwap.response.onchainAmount ?? 0 })
            notifyPaymentReceived(pendingSwap.response.onchainAmount ?? 0)
            navigate(Pages.ReceiveSuccess)
          })
          .catch((err) => consoleError(err, 'Error claiming LNURL reverse swap'))
      }
      return pendingSwap.response.invoice
    },
    [arkadeSwaps, createReverseSwap, setRecvInfo, recvInfo, navigate, notifyPaymentReceived],
  )
  const lnurlSession = useLnurlSession(isAmountlessLnurl, handleInvoiceRequest)

  const createBtcAddress = () => {
    return new Promise((resolve, reject) => {
      if (!enableChainSwapsReceive) return reject()
      if (!validBtcToArk(satoshis)) return reject()
      createBtcToArkSwap(satoshis)
        .then((result) => {
          if (!result) throw new Error('Failed to create chain swap')
          resolve(result.pendingSwap)
        })
        .catch((error) => {
          consoleError(error, 'Error creating chain swap')
          reject(error)
        })
    })
  }

  const createLightningInvoice = () => {
    return new Promise((resolve, reject) => {
      if (invoice) return reject()
      if (!validLnSwap(satoshis)) return reject()
      createReverseSwap(satoshis)
        .then((pendingSwap) => {
          if (!pendingSwap) throw new Error('Failed to create reverse swap')
          resolve(pendingSwap)
        })
        .catch((error) => {
          consoleError(error, 'Error creating reverse swap:')
          reject(error)
        })
    })
  }

  const createBip21 = (sats = satoshis): { ark: string; btc: string; bip21: string } => {
    const ark = validVtxoTx(sats) && vtxoTxsAllowed() ? recvInfo.offchainAddr : ''
    const btc = validUtxoTx(sats) && utxoTxsAllowed() ? swapAddress || recvInfo.boardingAddr : ''
    const bip21 = isAssetReceive
      ? encodeBip21Asset(ark, assetId, centsToUnits(sats, assetMeta?.metadata?.decimals))
      : encodeBip21(btc, ark, invoice, sats, lnurlSession.lnurl)

    return { ark, btc, bip21 }
  }

  useEffect(() => {
    if (isAssetReceive) return setShowQrCode(true)
    if (!satoshis || !svcWallet) return
    if (!addressesLoaded) return
    if (received) return

    const lnExpected = connected && !isAssetReceive

    if (!arkadeSwaps) {
      if (!lnExpected || swapsInitError) {
        if (lnExpected && swapsInitError) {
          consoleError(swapsInitError, 'Swaps unavailable, showing receive without swap options')
          setSwapsTimedOut(true)
        }
        setShowQrCode(true)
        return
      }
      const timeout = setTimeout(() => {
        setSwapsTimedOut(true)
        setShowQrCode(true)
      }, 5_000)
      return () => clearTimeout(timeout)
    }

    setSwapsTimedOut(false)

    Promise.allSettled([createBtcAddress(), createLightningInvoice()]).then(([btc, lightning]) => {
      if (btc.status === 'fulfilled') {
        const pendingSwap = btc.value as BoltzChainSwap
        const btcAddr = pendingSwap.response.lockupDetails.lockupAddress
        setSwapAddress(btcAddr)
        arkadeSwaps
          .waitAndClaimArk(pendingSwap)
          .then(() => {
            setRecvInfo({ ...recvInfo, received: true, satoshis: pendingSwap.response.claimDetails.amount })
            navigate(Pages.ReceiveSuccess)
          })
          .catch((error) => {
            consoleError(error, 'Error claiming chain swap:')
          })
      }
      if (lightning.status === 'fulfilled') {
        const pendingSwap = lightning.value as BoltzReverseSwap
        const inv = pendingSwap.response.invoice
        setInvoice(inv)
        arkadeSwaps
          .waitAndClaim(pendingSwap)
          .then(() => {
            setRecvInfo({ ...recvInfo, received: true, satoshis: pendingSwap.response.onchainAmount ?? 0 })
            navigate(Pages.ReceiveSuccess)
          })
          .catch((error) => {
            consoleError(error, 'Error claiming reverse swap:')
          })
      }
      setShowQrCode(true)
    })
  }, [satoshis, svcWallet, arkadeSwaps, swapsInitError, addressesLoaded])

  useEffect(() => {
    if (assetId || selectedReceiveAsset.ticker === 'BTC' || !selectedReceiveAsset.assetId) return

    setInvoice('')
    setSwapAddress('')
    setShowQrCode(true)
    setRecvInfo({ ...recvInfo, assetId: selectedReceiveAsset.assetId, addressError: undefined })
  }, [assetId, selectedReceiveAsset.assetId, selectedReceiveAsset.ticker])

  // Build BIP21 URI
  useEffect(() => {
    if (!addressesLoaded && !showQrCode) return

    const { ark, btc, bip21 } = createBip21()
    const hasLnurl = isAmountlessLnurl && lnurlSession.active

    setNoPaymentMethods(!ark && !btc && !invoice && !hasLnurl && !isAssetReceive)
    setArkAddress(ark)
    setBtcAddress(btc)
    setBip21Uri(bip21)
    setQrCodeValue(bip21)
  }, [
    showQrCode,
    swapAddress,
    invoice,
    addressesLoaded,
    recvInfo.offchainAddr,
    recvInfo.boardingAddr,
    satoshis,
    lnurlSession.lnurl,
    lnurlSession.active,
    isAmountlessLnurl,
    assetId,
  ])

  // Payment listener
  useEffect(() => {
    if (!svcWallet) return

    const listenForPayments = (event: MessageEvent) => {
      let sats = 0
      let receivedAssets: Asset[] = []

      if (event.data && event.data.type === 'VTXO_UPDATE') {
        const newVtxos = event.data.payload?.newVtxos
        if (Array.isArray(newVtxos)) {
          sats = (newVtxos as ExtendedVirtualCoin[]).reduce((acc, v) => acc + v.value, 0)
          for (const v of newVtxos as ExtendedVirtualCoin[]) {
            receivedAssets.push(...(v.assets ?? []))
          }
        } else {
          consoleError('VTXO_UPDATE message has unexpected payload shape:', event.data.payload)
        }
      }

      receivedAssets = receivedAssets.reduce((acc, v) => {
        const existing = acc.find((a) => a.assetId === v.assetId)
        if (existing) {
          existing.amount += v.amount
        } else {
          acc.push(v)
        }
        return acc
      }, [] as Asset[])

      if (event.data && event.data.type === 'UTXO_UPDATE') {
        const coins = event.data.payload?.coins
        if (Array.isArray(coins)) {
          sats = (coins as Coin[]).reduce((acc, v) => acc + v.value, 0)
        } else {
          consoleError('UTXO_UPDATE message has unexpected payload shape:', event.data.payload)
        }
      }

      if (sats || receivedAssets.length > 0) {
        setRecvInfo({ ...recvInfo, received: true, satoshis: sats, receivedAssets })
        if (!isAssetReceive) notifyPaymentReceived(sats)
        navigate(Pages.ReceiveSuccess)
      }
    }

    navigator.serviceWorker.addEventListener('message', listenForPayments)
    return () => navigator.serviceWorker.removeEventListener('message', listenForPayments)
  }, [svcWallet])

  // Handlers
  const handleShare = () => {
    setSharing(true)
    shareData(data)
      .catch(consoleError)
      .finally(() => setSharing(false))
  }

  const handleCopy = async (value: string) => {
    if (!prefersReducedMotion) hapticSubtle()
    await copyToClipboard(value)
    toast('Copied to clipboard')
    setShowCopySheet(false)
    setCopied(value)
  }

  const handleReceiveAssetSelect = (option: ReceiveAssetOption) => {
    hapticLight()
    setStoredReceiveAssetTicker(option.ticker)
    setPreferredReceiveTicker(option.ticker)
    setShowAssetMenu(false)
    setInvoice('')
    setSwapAddress('')
    setShowQrCode(true)
    setRecvInfo({ ...recvInfo, assetId: option.assetId || undefined, addressError: undefined })
  }

  const handleAmountChange = (sats: number) => {
    setAmountInput(sats)
    const value = assetMeta ? centsToUnits(sats, assetMeta.metadata?.decimals) : useFiat ? toFiat(sats) : sats
    const maximumFractionDigits = useFiat
      ? fiatDecimals()
      : assetMeta?.metadata?.decimals
        ? assetMeta?.metadata?.decimals
        : 0
    setAmountTextValue(prettyNumber(value, maximumFractionDigits, false))
  }

  const handleAmountConfirm = (sats = amountInput) => {
    setShowKeys(false)
    setShowAmountSheet(false)
    // if amount was changed, we need to reset invoice and swap address, since they are amount-specific
    // this will also trigger the useEffect to create new ones if needed
    if (sats !== satoshis) {
      setInvoice('')
      setSwapAddress('')
      setShowQrCode(false)
    }
    setRecvInfo({ ...recvInfo, satoshis: sats })
  }

  const handleAmountClear = () => {
    handleAmountChange(0)
    handleAmountConfirm(0)
  }

  const assetOption: AssetOption = {
    assetId: assetId ?? '',
    name: assetMeta?.metadata?.name ?? '',
    ticker: assetMeta?.metadata?.ticker ?? '',
    balance: 0,
    decimals: assetMeta?.metadata?.decimals ?? 0,
    icon: assetMeta?.metadata?.icon,
  }

  const data = { title: 'Receive', text: qrCodeValue }
  const shareDisabled = !canBrowserShareData(data) || sharing || hasError || noPaymentMethods

  // Mobile keyboard — bypass sheet on save, go straight to QR
  if (showKeys) {
    return (
      <Keyboard
        asset={assetOption}
        back={() => {
          setShowKeys(false)
          setShowAmountSheet(false)
        }}
        hideBalance
        onSave={(sats: number) => {
          setShowKeys(false)
          setShowAmountSheet(false)
          handleAmountChange(sats)
          handleAmountConfirm(sats)
        }}
        value={amountInput}
      />
    )
  }

  const amountLabel = satoshis ? 'Edit amount' : 'Add amount'
  const unitLabel = assetMeta?.metadata?.ticker ?? 'sats'

  return (
    <>
      <Header text='Receive' back={() => navigate(Pages.Wallet)} />
      <Content noFade>
        <Padded>
          {hasError ? (
            <ErrorMessage error text={`Failed to get address: ${addressError}`} />
          ) : !addressesLoaded || (!qrCodeValue && !noPaymentMethods) ? (
            <LoadingLogo text='Loading...' />
          ) : noPaymentMethods ? (
            <div>No valid payment methods available for this amount</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 2rem)', gap: '1rem' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <ReceiveAssetPicker
                    onOpenChange={setShowAssetMenu}
                    onSelect={handleReceiveAssetSelect}
                    open={showAssetMenu}
                    options={receiveAssetOptions}
                    prefersReducedMotion={prefersReducedMotion}
                    selected={selectedReceiveAsset}
                  />
                  <button
                    type='button'
                    onClick={() => handleCopy(qrCodeValue)}
                    onPointerDown={() => setQrTransform(prefersReducedMotion ? '' : 'scale(0.97)')}
                    onPointerUp={() => setQrTransform('')}
                    onPointerLeave={() => setQrTransform('')}
                    onPointerCancel={() => setQrTransform('')}
                    aria-label='Copy QR code'
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      margin: '0 auto',
                      display: 'block',
                      width: '100%',
                      maxWidth: '340px',
                      cursor: 'pointer',
                      transition: prefersReducedMotion
                        ? 'none'
                        : `transform 240ms cubic-bezier(${EASE_OUT_QUINT.join(',')})`,
                      WebkitTapHighlightColor: 'transparent',
                      touchAction: 'manipulation',
                      transform: qrTransform,
                    }}
                  >
                    <QrCode value={qrCodeValue} />
                  </button>
                  {satoshis > 0 ? (
                    <div style={{ fontSize: '14px', color: 'var(--neutral-500)', marginTop: '0.5rem' }}>
                      Requesting {prettyNumber(satoshis)} {unitLabel}
                    </div>
                  ) : null}
                  {(!satoshis || satoshis < minSwapAllowed()) && !isAssetReceive ? (
                    <div style={{ fontSize: '13px', color: 'var(--neutral-500)', marginTop: '0.25rem' }}>
                      {minSwapAllowed()} sats min for Lightning
                    </div>
                  ) : null}
                  {swapsTimedOut && !invoice && !isAssetReceive ? (
                    <WarningBox text='Lightning is temporarily unavailable. This QR code only supports Arkade and on-chain payments.' />
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </Padded>
      </Content>

      <ButtonsOnBottom>
        <FlexRow gap='0.75rem'>
          <Button label={amountLabel} onClick={() => setShowAmountSheet(true)} secondary />
          <Button label='Copy' onClick={() => setShowCopySheet(true)} secondary />
        </FlexRow>
        <Button label='Share' onClick={handleShare} disabled={shareDisabled} />
      </ButtonsOnBottom>

      {/* Amount bottom sheet */}
      <SheetModal isOpen={showAmountSheet} onClose={() => setShowAmountSheet(false)}>
        <FlexCol gap='1rem' padding='0.5rem 0'>
          <Text big bold>
            Add amount
          </Text>
          <InputAmount
            asset={assetOption}
            name='receive-amount-sheet'
            focus={!isMobileBrowser}
            label='Amount'
            onSats={handleAmountChange}
            onFocus={() => setShowKeys(isMobileBrowser)}
            readOnly={isMobileBrowser}
            value={amountTextValue ? Number(amountTextValue) : undefined}
            sats={amountInput}
            onEnter={handleAmountConfirm}
          />
          <Button label='Set amount' onClick={() => handleAmountConfirm()} disabled={!amountInput} />
          {satoshis > 0 ? <Button label='Clear amount' onClick={handleAmountClear} secondary /> : null}
        </FlexCol>
      </SheetModal>

      {/* Copy address bottom sheet */}
      <SheetModal isOpen={showCopySheet} onClose={() => setShowCopySheet(false)}>
        <FlexCol gap='1rem' padding='0.5rem 0'>
          <Text big bold>
            Copy address
          </Text>
          <AddressList
            bip21Uri={bip21Uri}
            btcAddress={btcAddress}
            arkAddress={arkAddress}
            lnurl={lnurlSession.lnurl}
            invoice={invoice}
            onCopy={handleCopy}
            onSelect={(v) => {
              setQrCodeValue(v)
              setShowCopySheet(false)
            }}
            copied={copied}
          />
        </FlexCol>
      </SheetModal>
    </>
  )
}

function ReceiveAssetPicker({
  onOpenChange,
  onSelect,
  open,
  options,
  prefersReducedMotion,
  selected,
}: {
  onOpenChange: (open: boolean) => void
  onSelect: (option: ReceiveAssetOption) => void
  open: boolean
  options: ReceiveAssetOption[]
  prefersReducedMotion: boolean
  selected: ReceiveAssetOption
}) {
  return (
    <div className='receive-asset-picker'>
      <button
        type='button'
        className='receive-asset-trigger'
        aria-expanded={open}
        aria-haspopup='listbox'
        onClick={() => {
          hapticLight()
          onOpenChange(!open)
        }}
      >
        <ReceiveAssetIcon option={selected} />
        <span>{selected.ticker}</span>
        <motion.span
          className='receive-asset-chevron'
          animate={prefersReducedMotion ? false : { rotate: open ? 180 : 0 }}
          transition={{ duration: 0.18, ease: EASE_OUT_QUINT }}
        >
          <ChevronDownIcon />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            className='receive-asset-menu'
            role='listbox'
            aria-label='Receive asset'
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.98, y: -4, filter: 'blur(2px)' }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: -3, filter: 'blur(1px)' }}
            transition={{ duration: 0.18, ease: EASE_OUT_QUINT }}
          >
            {options.map((option) => {
              const selectedOption = option.ticker === selected.ticker
              return (
                <button
                  key={option.ticker}
                  type='button'
                  className='receive-asset-option'
                  role='option'
                  aria-selected={selectedOption}
                  onClick={() => onSelect(option)}
                >
                  <ReceiveAssetIcon option={option} />
                  <span className='receive-asset-option__copy'>{option.name}</span>
                  <AnimatePresence initial={false}>
                    {selectedOption ? (
                      <motion.span
                        className='receive-asset-option__check'
                        initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.86 }}
                        animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
                        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.86 }}
                        transition={{ duration: 0.14, ease: EASE_OUT_QUINT }}
                      >
                        <CheckMarkIcon small />
                      </motion.span>
                    ) : null}
                  </AnimatePresence>
                </button>
              )
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

function ReceiveAssetIcon({ option }: { option: ReceiveAssetOption }) {
  return (
    <span className='receive-asset-icon' data-testid={`receive-asset-logo-${option.ticker.toLowerCase()}`}>
      <ReceiveAssetLogo ticker={option.ticker} />
    </span>
  )
}

function ReceiveAssetLogo({ ticker }: { ticker: ReceiveAssetTicker }) {
  if (ticker === 'USDT') return <TetherLogo />
  if (ticker === 'USDC') return <UsdcLogo />
  return <BitcoinLogo />
}

function BitcoinLogo() {
  return (
    <svg aria-hidden='true' viewBox='0 0 32 32' focusable='false'>
      <g fill='none' fillRule='evenodd'>
        <circle cx='16' cy='16' r='16' fill='#F7931A' />
        <path
          fill='#FFF'
          fillRule='nonzero'
          d='M23.189 14.02c.314-2.096-1.283-3.223-3.465-3.975l.708-2.84-1.728-.43-.69 2.765c-.454-.114-.92-.22-1.385-.326l.695-2.783L15.596 6l-.708 2.839c-.376-.086-.746-.17-1.104-.26l.002-.009-2.384-.595-.46 1.846s1.283.294 1.256.312c.7.175.826.638.805 1.006l-.806 3.235c.048.012.11.03.18.057l-.183-.045-1.13 4.532c-.086.212-.303.531-.793.41.018.025-1.256-.313-1.256-.313l-.858 1.978 2.25.561c.418.105.828.215 1.231.318l-.715 2.872 1.727.43.708-2.84c.472.127.93.245 1.378.357l-.706 2.828 1.728.43.715-2.866c2.948.558 5.164.333 6.097-2.333.752-2.146-.037-3.385-1.588-4.192 1.13-.26 1.98-1.003 2.207-2.538zm-3.95 5.538c-.533 2.147-4.148.986-5.32.695l.95-3.805c1.172.293 4.929.872 4.37 3.11zm.535-5.569c-.487 1.953-3.495.96-4.47.717l.86-3.45c.975.243 4.118.696 3.61 2.733z'
        />
      </g>
    </svg>
  )
}

function TetherLogo() {
  return (
    <svg aria-hidden='true' viewBox='0 0 32 32' focusable='false'>
      <g fill='none' fillRule='evenodd'>
        <circle cx='16' cy='16' r='16' fill='#26A17B' />
        <path
          fill='#FFF'
          d='M17.922 17.383v-.002c-.11.008-.677.042-1.942.042-1.01 0-1.721-.03-1.971-.042v.003c-3.888-.171-6.79-.848-6.79-1.658 0-.809 2.902-1.486 6.79-1.66v2.644c.254.018.982.061 1.988.061 1.207 0 1.812-.05 1.925-.06v-2.643c3.88.173 6.775.85 6.775 1.658 0 .81-2.895 1.485-6.775 1.657m0-3.59v-2.366h5.414V7.819H8.595v3.608h5.414v2.365c-4.4.202-7.709 1.074-7.709 2.118 0 1.044 3.309 1.915 7.709 2.118v7.582h3.913v-7.584c4.393-.202 7.694-1.073 7.694-2.116 0-1.043-3.301-1.914-7.694-2.117'
        />
      </g>
    </svg>
  )
}

function UsdcLogo() {
  return (
    <svg aria-hidden='true' viewBox='0 0 32 32' focusable='false'>
      <g fill='none'>
        <circle fill='#3E73C4' cx='16' cy='16' r='16' />
        <g fill='#FFF'>
          <path d='M20.022 18.124c0-2.124-1.28-2.852-3.84-3.156-1.828-.243-2.193-.728-2.193-1.578 0-.85.61-1.396 1.828-1.396 1.097 0 1.707.364 2.011 1.275a.458.458 0 00.427.303h.975a.416.416 0 00.427-.425v-.06a3.04 3.04 0 00-2.743-2.489V9.142c0-.243-.183-.425-.487-.486h-.915c-.243 0-.426.182-.487.486v1.396c-1.829.242-2.986 1.456-2.986 2.974 0 2.002 1.218 2.791 3.778 3.095 1.707.303 2.255.668 2.255 1.639 0 .97-.853 1.638-2.011 1.638-1.585 0-2.133-.667-2.316-1.578-.06-.242-.244-.364-.427-.364h-1.036a.416.416 0 00-.426.425v.06c.243 1.518 1.219 2.61 3.23 2.914v1.457c0 .242.183.425.487.485h.915c.243 0 .426-.182.487-.485V21.34c1.829-.303 3.047-1.578 3.047-3.217z' />
          <path d='M12.892 24.497c-4.754-1.7-7.192-6.98-5.424-11.653.914-2.55 2.925-4.491 5.424-5.402.244-.121.365-.303.365-.607v-.85c0-.242-.121-.424-.365-.485-.061 0-.183 0-.244.06a10.895 10.895 0 00-7.13 13.717c1.096 3.4 3.717 6.01 7.13 7.102.244.121.488 0 .548-.243.061-.06.061-.122.061-.243v-.85c0-.182-.182-.424-.365-.546zm6.46-18.936c-.244-.122-.488 0-.548.242-.061.061-.061.122-.061.243v.85c0 .243.182.485.365.607 4.754 1.7 7.192 6.98 5.424 11.653-.914 2.55-2.925 4.491-5.424 5.402-.244.121-.365.303-.365.607v.85c0 .242.121.424.365.485.061 0 .183 0 .244-.06a10.895 10.895 0 007.13-13.717c-1.096-3.46-3.778-6.07-7.13-7.162z' />
        </g>
      </g>
    </svg>
  )
}

function readStoredReceiveAssetTicker(): ReceiveAssetTicker {
  try {
    const stored = window.localStorage.getItem(RECEIVE_ASSET_STORAGE_KEY)
    if (stored === 'USDT' || stored === 'USDC') return stored
  } catch {
    // Storage can be unavailable in private browsing or test environments.
  }

  return 'BTC'
}

function setStoredReceiveAssetTicker(ticker: ReceiveAssetTicker) {
  try {
    window.localStorage.setItem(RECEIVE_ASSET_STORAGE_KEY, ticker)
  } catch {
    // Non-critical preference only.
  }
}

function buildReceiveAssetOptions(
  assetBalances: { assetId: string }[],
  assetMetadataCache: Map<string, { metadata?: { icon?: string; name?: string; ticker?: string } }>,
): ReceiveAssetOption[] {
  const assetByTicker = new Map<string, ReceiveAssetOption>()

  for (const [assetId, details] of assetMetadataCache.entries()) {
    addReceiveAssetOption(assetByTicker, assetId, details.metadata)
  }

  for (const asset of assetBalances) {
    addReceiveAssetOption(assetByTicker, asset.assetId, assetMetadataCache.get(asset.assetId)?.metadata)
  }

  return [
    { assetId: '', name: 'bitcoin', ticker: 'BTC' },
    assetByTicker.get('USDT') ?? { assetId: '', name: 'USDT', ticker: 'USDT' },
    assetByTicker.get('USDC') ?? { assetId: '', name: 'USDC', ticker: 'USDC' },
  ]
}

function addReceiveAssetOption(
  assetByTicker: Map<string, ReceiveAssetOption>,
  assetId: string,
  metadata?: { name?: string; ticker?: string },
) {
  const ticker = metadata?.ticker?.trim().toUpperCase()
  if (ticker !== 'USDT' && ticker !== 'USDC') return

  assetByTicker.set(ticker, {
    assetId,
    name: ticker,
    ticker,
  })
}

function AddressList({
  bip21Uri,
  btcAddress,
  arkAddress,
  invoice,
  lnurl,
  onCopy,
  onSelect,
  copied,
}: {
  bip21Uri: string
  btcAddress: string
  arkAddress: string
  invoice: string
  lnurl: string
  onCopy: (value: string) => void
  onSelect: (value: string) => void
  copied: string
}) {
  return (
    <FlexCol gap='0.75rem'>
      {bip21Uri ? (
        <AddressLine
          testId='bip21'
          title='Unified'
          value={bip21Uri}
          onCopy={onCopy}
          onSelect={onSelect}
          copied={copied}
        />
      ) : null}
      {invoice ? (
        <AddressLine
          testId='invoice'
          title='Lightning invoice'
          value={invoice}
          onCopy={onCopy}
          onSelect={onSelect}
          copied={copied}
        />
      ) : null}
      {arkAddress ? (
        <AddressLine
          testId='ark'
          title='Arkade address'
          value={arkAddress}
          onCopy={onCopy}
          onSelect={onSelect}
          copied={copied}
        />
      ) : null}
      {btcAddress ? (
        <AddressLine
          testId='btc'
          title='Bitcoin address'
          value={btcAddress}
          onCopy={onCopy}
          onSelect={onSelect}
          copied={copied}
        />
      ) : null}
      {lnurl ? (
        <AddressLine
          testId='lnurl'
          title='LNURL address'
          value={lnurl}
          onCopy={onCopy}
          onSelect={onSelect}
          copied={copied}
        />
      ) : null}
    </FlexCol>
  )
}

function AddressLine({
  testId,
  title,
  value,
  onCopy,
  onSelect,
  copied,
}: {
  testId: string
  title: string
  value: string
  onCopy: (value: string) => void
  onSelect: (value: string) => void
  copied: string
}) {
  return (
    <Focusable
      onEnter={() => {
        onCopy(value)
        onSelect(value)
      }}
    >
      <FlexRow between onClick={() => onSelect(value)}>
        <FlexCol gap='0'>
          <TextSecondary>{title}</TextSecondary>
          <Text>{prettyLongText(value, 12)}</Text>
        </FlexCol>
        <Button
          copy
          ariaLabel={`Copy ${title}`}
          testId={testId + '-address-copy'}
          onClick={(event) => {
            event.stopPropagation()
            onCopy(value)
          }}
        >
          {copied === value ? <CheckMarkIcon /> : <CopyIcon />}
        </Button>
      </FlexRow>
    </Focusable>
  )
}
