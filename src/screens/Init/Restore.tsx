import type { ServiceWorkerWalletMode } from '@arkade-os/sdk'
import { invalidPrivateKey, nsecToPrivateKey } from '../../lib/privateKey'
import { NavigationContext, Pages } from '../../providers/navigation'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import { useContext, useEffect, useState } from 'react'
import { defaultPassword } from '../../lib/constants'
import { FlowContext } from '../../providers/flow'
import ErrorMessage from '../../components/Error'
import Content from '../../components/Content'
import FlexCol from '../../components/FlexCol'
import { extractError } from '../../lib/error'
import LoadingLogo from '../../components/LoadingLogo'
import { consoleError } from '../../lib/logs'
import Button, { ClearButtonOnInput } from '../../components/Button'
import Header from '../../components/Header'
import Padded from '../../components/Padded'
import Text, { TextSecondary } from '../../components/Text'
import SegmentedControl from '../../components/SegmentedControl'
import { DevModeContext } from '../../providers/devMode'
import { hex } from '@scure/base'
import { OnboardStaggerContainer, OnboardStaggerChild } from '../../components/OnboardLoadIn'
import { validateMnemonic } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english'
import { deriveNostrKeyFromMnemonic } from '../../lib/mnemonic'
import { AspContext } from '../../providers/asp'
import InputWithScanner from '../../components/InputWithScanner'
import InputContainer from '../../components/InputContainer'
import FlexRow from '../../components/FlexRow'
import Scanner from '../../components/Scanner'
import OkIcon from '../../icons/Ok'
import { AnimatePresence, motion } from 'framer-motion'
import { overlaySlideUp, overlayStyle } from '../../lib/animations'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { decodeSeedQr, SEED_QR_FORMAT_LABEL, SeedQrError, type SeedQrScan } from '../../lib/seedQr'
import { BackupContext } from '@/providers/backup'

const scanOverlayStyle = { ...overlayStyle, position: 'fixed' as const, zIndex: 20 }

/** A scanned payload we hand to the existing key validator instead of rejecting. */
const looksLikePrivateKey = (text: string) => /^nsec1[02-9ac-hj-np-z]{58}$/.test(text) || /^[0-9a-f]{64}$/i.test(text)

const INPUT_LABEL = 'Recovery phrase or private key'

/**
 * Stands in for the input once a QR has been read. The phrase itself stays off
 * screen — scanning it is the one restore path where the words never have to be
 * displayed, and showing them back would give that up for no gain. The format
 * and word count are enough to confirm the right backup was scanned.
 */
function ScannedSeed({ onClear, scanned }: { onClear: () => void; scanned: SeedQrScan }) {
  return (
    <InputContainer label={INPUT_LABEL}>
      <FlexRow gap='0.5rem'>
        <span style={{ color: 'var(--green-500)', display: 'flex' }}>
          <OkIcon />
        </span>
        <FlexCol gap='0'>
          <Text small>Recovery phrase scanned</Text>
          <TextSecondary smaller>
            {scanned.words} words · {SEED_QR_FORMAT_LABEL[scanned.format]}
          </TextSecondary>
        </FlexCol>
      </FlexRow>
      <ClearButtonOnInput onClick={onClear} />
    </InputContainer>
  )
}

type RotationChoice = 'Inherit' | 'Static' | 'HD'

// Maps the user's rotation choice to the wallet mode passed into initWallet.
// `undefined` (Inherit) makes resolveWalletMode fall back to config.walletMode,
// which the Nostr backup restored just before navigation (see handleProceed).
const ROTATION_TO_MODE: Record<RotationChoice, ServiceWorkerWalletMode | undefined> = {
  Inherit: undefined,
  Static: 'static',
  HD: 'hd',
}

export default function InitRestore() {
  const { navigate } = useContext(NavigationContext)
  const { setInitInfo } = useContext(FlowContext)
  const { devMode } = useContext(DevModeContext)
  const { restore } = useContext(BackupContext)
  const { aspInfo } = useContext(AspContext)

  const buttonLabel = 'Continue'

  const [error, setError] = useState('')
  const [label, setLabel] = useState(buttonLabel)
  const [mnemonic, setMnemonic] = useState<string>()
  const [privateKey, setPrivateKey] = useState<Uint8Array>()
  const [restoring, setRestoring] = useState(false)
  const [restoreDone, setRestoreDone] = useState(false)
  const [someKey, setSomeKey] = useState<string>()
  const [rotationChoice, setRotationChoice] = useState<RotationChoice>('Inherit')
  const [scan, setScan] = useState(false)
  const [scanned, setScanned] = useState<SeedQrScan | null>(null)
  const [scanError, setScanError] = useState('')

  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    const trimmed = someKey?.trim() ?? ''
    if (!trimmed) {
      setMnemonic(undefined)
      setPrivateKey(undefined)
      setLabel(buttonLabel)
      setError('')
      return
    }

    // Detect mnemonic (input contains spaces)
    if (trimmed.includes(' ')) {
      if (validateMnemonic(trimmed, wordlist)) {
        setMnemonic(trimmed)
        setPrivateKey(undefined)
        setLabel(buttonLabel)
        setError('')
      } else {
        setMnemonic(undefined)
        setPrivateKey(undefined)
        setLabel('Invalid recovery phrase')
        setError('Invalid recovery phrase')
      }
      return
    }

    // Otherwise try nsec/hex private key
    setMnemonic(undefined)
    let pk = undefined
    try {
      if (trimmed.match(/^nsec/)) pk = nsecToPrivateKey(trimmed)
      else pk = hex.decode(trimmed)
      const invalid = invalidPrivateKey(pk)
      setLabel(invalid ? 'Unable to validate private key format' : buttonLabel)
      setError(invalid)
    } catch (err) {
      setLabel('Unable to validate key format')
      setError(extractError(err))
    }
    setPrivateKey(pk)
  }, [someKey])

  const handleCancel = () => navigate(Pages.Init)

  const handleTyping = (value: string) => {
    setScanError('')
    setScanned(null)
    setSomeKey(value)
  }

  const handleClearScan = () => {
    setScanned(null)
    setSomeKey('')
  }

  /**
   * Turns a scanned QR into something the validator below already understands.
   * Seed backups become a mnemonic; an nsec or raw hex key is passed through
   * untouched so the one restore path stays the one restore path.
   */
  const handleScanData = (data: string) => {
    setScanError('')
    try {
      const result = decodeSeedQr(data)
      setScanned(result)
      setSomeKey(result.mnemonic)
    } catch (err) {
      const trimmed = data.trim()
      if (looksLikePrivateKey(trimmed)) return handleTyping(trimmed)
      setScanned(null)
      setSomeKey('')
      setScanError(err instanceof SeedQrError ? err.message : extractError(err))
    }
  }

  const handleProceed = () => {
    setRestoring(true)
    let seckey: Uint8Array
    if (mnemonic) {
      setInitInfo({
        mnemonic,
        password: defaultPassword,
        restoring: true,
        walletMode: ROTATION_TO_MODE[rotationChoice],
      })
      const isNet =
        aspInfo.network !== 'testnet' &&
        aspInfo.network !== 'mutinynet' &&
        aspInfo.network !== 'signet' &&
        aspInfo.network !== 'regtest'
      seckey = deriveNostrKeyFromMnemonic(mnemonic, isNet)
    } else {
      setInitInfo({ privateKey, password: defaultPassword, restoring: true })
      seckey = privateKey!
    }
    restore(seckey)
      .catch((err) => consoleError(err, 'Error restoring from nostr'))
      .finally(() => setRestoreDone(true))
  }

  const handleExitComplete = () => {
    if (error) return setRestoring(false)
    else navigate(Pages.InitConnect)
  }

  const disabled = Boolean((!privateKey && !mnemonic) || error)

  if (restoring)
    return (
      <LoadingLogo
        text='Restoring wallet...'
        done={restoreDone}
        exitMode='fly-up'
        onExitComplete={handleExitComplete}
      />
    )

  // `binary` keeps byte-mode payloads intact — CompactSeedQR is raw entropy.
  const Scan = () => (
    <Scanner
      binary
      close={() => setScan(false)}
      label='Scan recovery QR'
      onData={handleScanData}
      onError={setScanError}
    />
  )

  if (scan) {
    return prefersReducedMotion ? (
      <div style={scanOverlayStyle}>
        <Scan />
      </div>
    ) : (
      <AnimatePresence>
        <motion.div
          key='scanner'
          variants={overlaySlideUp}
          initial='initial'
          animate='animate'
          exit='exit'
          style={scanOverlayStyle}
        >
          <Scan />
        </motion.div>
      </AnimatePresence>
    )
  }

  return (
    <>
      <Header text='Restore wallet' back />
      <Content>
        <Padded>
          <OnboardStaggerContainer>
            <OnboardStaggerChild>
              <FlexCol between>
                <FlexCol>
                  {scanned ? (
                    <ScannedSeed onClear={handleClearScan} scanned={scanned} />
                  ) : (
                    <InputWithScanner
                      label={INPUT_LABEL}
                      name='private-key'
                      onChange={handleTyping}
                      openScan={() => setScan(true)}
                      placeholder='Type or scan...'
                      value={someKey ?? ''}
                    />
                  )}
                  <ErrorMessage error={Boolean(error || scanError)} text={error || scanError} />
                  {devMode && mnemonic ? (
                    <FlexCol gap='0.5rem'>
                      <Text thin>Address rotation</Text>
                      <SegmentedControl
                        options={['Inherit', 'Static', 'HD']}
                        selected={rotationChoice}
                        onChange={(v) => setRotationChoice(v as RotationChoice)}
                      />
                      <TextSecondary wrap>
                        Inherit uses your saved wallet setting (typically restored from backup). If backup restore is
                        unavailable, it falls back to your local/default setting. Pick HD if this wallet rotated receive
                        addresses and you need to force HD recovery.
                      </TextSecondary>
                    </FlexCol>
                  ) : null}
                </FlexCol>
                <TextSecondary wrap>
                  Scan a SeedQR, CompactSeedQR or UR seed backup, or type your 12-word recovery phrase. A private key
                  starting with 'nsec' or a raw hex key works too. Do not share any of them with anyone.
                </TextSecondary>
              </FlexCol>
            </OnboardStaggerChild>
          </OnboardStaggerContainer>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button onClick={handleProceed} label={label} disabled={disabled} />
        <Button onClick={handleCancel} label='Cancel' secondary />
      </ButtonsOnBottom>
    </>
  )
}
