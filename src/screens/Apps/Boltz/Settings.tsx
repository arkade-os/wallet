import { useContext, useEffect, useState } from 'react'
import type { BoltzSubmarineSwap, SubmarineRecoveryInfo } from '@arkade-os/boltz-swap'
import Padded from '../../../components/Padded'
import Header from '../../../components/Header'
import Content from '../../../components/Content'
import FlexCol from '../../../components/FlexCol'
import FlexRow from '../../../components/FlexRow'
import Toggle from '../../../components/Toggle'
import Text, { TextLabel } from '../../../components/Text'
import Button from '../../../components/Button'
import ErrorMessage from '../../../components/Error'
import WarningBox from '../../../components/Warning'
import { SwapsContext } from '../../../providers/swaps'
import { useToast } from '../../../components/Toast'
import { consoleError } from '../../../lib/logs'
import { extractError } from '../../../lib/error'
import { prettyAmount } from '../../../lib/format'

export default function AppBoltzSettings() {
  const { arkadeSwaps, connected, getApiUrl, restoreSwaps, toggleConnection } = useContext(SwapsContext)
  const { toast } = useToast()

  // Boltz API URL hidden tap counter (preserved from previous behaviour)
  const [counter, setCounter] = useState(0)
  const [restoreResults, setRestoreResults] = useState('')

  // Recovery state
  const [scanned, setScanned] = useState<SubmarineRecoveryInfo[] | null>(null)
  const [scanError, setScanError] = useState('')
  const [scanning, setScanning] = useState(false)
  const [recoveringIds, setRecoveringIds] = useState<Set<string>>(new Set())
  const [rowErrors, setRowErrors] = useState<Record<string, RowError>>({})

  useEffect(() => {
    if (counter !== 5) return
    restoreSwaps()
      .then((numSwapsRestored) => {
        setRestoreResults(
          numSwapsRestored === 0
            ? 'Unable to find swaps available to restore'
            : `Successfully restored ${numSwapsRestored} swaps`,
        )
      })
      .catch((error) => {
        consoleError(error, 'Error restoring swaps')
        setRestoreResults(`Error restoring swaps: ${extractError(error)}`)
      })
  }, [counter, restoreSwaps])

  const recoverable = scanned?.filter((s) => s.status === 'recoverable') ?? []
  const preCltv = scanned?.filter((s) => s.status === 'pre_cltv') ?? []
  const invalid = scanned?.filter((s) => s.status === 'invalid_swap') ?? []
  // `none` and `already_spent` are healthy states; we don't show them.

  const anyRecovering = recoveringIds.size > 0

  const handleScan = async () => {
    if (!arkadeSwaps) {
      setScanError('Boltz integration is not ready yet. Try again in a moment.')
      return
    }
    setScanning(true)
    setScanned(null)
    setScanError('')
    setRowErrors({})
    try {
      const results = await arkadeSwaps.scanRecoverableSubmarineSwaps()
      setScanned(results)
    } catch (err) {
      consoleError(err, 'Failed to scan recoverable submarine swaps')
      setScanError(`Could not scan: ${extractError(err)}`)
    } finally {
      setScanning(false)
    }
  }

  const handleRecoverOne = async (swap: BoltzSubmarineSwap) => {
    if (!arkadeSwaps) {
      toast('Boltz integration is not ready yet')
      return
    }
    setRecoveringIds((prev) => {
      const next = new Set(prev)
      next.add(swap.id)
      return next
    })
    setRowErrors((prev) => {
      if (!(swap.id in prev)) return prev
      const next = { ...prev }
      delete next[swap.id]
      return next
    })

    try {
      const outcome = await arkadeSwaps.recoverSubmarineFunds(swap)
      if (outcome.swept > 0) {
        toast(`Recovered ${outcome.swept} VTXO${outcome.swept === 1 ? '' : 's'}`)
        try {
          const fresh = await arkadeSwaps.scanRecoverableSubmarineSwaps()
          setScanned(fresh)
        } catch (err) {
          consoleError(err, 'Failed to refresh recovery scan after recover')
        }
      } else if (outcome.skipped > 0) {
        setRowErrors((prev) => ({ ...prev, [swap.id]: { type: 'deferred_locktime' } }))
      } else {
        setRowErrors((prev) => ({
          ...prev,
          [swap.id]: { type: 'message', message: 'Nothing was swept; try again later.' },
        }))
      }
    } catch (err) {
      consoleError(err, 'Per-swap recovery failed')
      setRowErrors((prev) => ({ ...prev, [swap.id]: { type: 'message', message: extractError(err) } }))
    } finally {
      setRecoveringIds((prev) => {
        const next = new Set(prev)
        next.delete(swap.id)
        return next
      })
    }
  }

  return (
    <>
      <Header text='Boltz settings' back />
      <Content>
        <Padded>
          <FlexCol gap='2rem'>
            <Toggle
              checked={connected}
              onClick={toggleConnection}
              text='Enable Boltz'
              subtext='Turn Boltz integration on or off'
            />
            <FlexCol border gap='0.5rem' padding='0 0 1rem 0'>
              <div onClick={() => setCounter((c) => (c += 1))}>
                <Text thin>Boltz API URL</Text>
              </div>
              <Text color='dark50' small thin>
                {getApiUrl() ?? 'No server available'}
              </Text>
            </FlexCol>
            {restoreResults ? (
              <Text small thin>
                {restoreResults}
              </Text>
            ) : null}

            <RecoverSection
              arkadeSwapsReady={Boolean(arkadeSwaps)}
              scanned={scanned}
              scanning={scanning}
              anyRecovering={anyRecovering}
              recoveringIds={recoveringIds}
              rowErrors={rowErrors}
              scanError={scanError}
              recoverable={recoverable}
              preCltv={preCltv}
              invalid={invalid}
              onScan={handleScan}
              onRecoverOne={handleRecoverOne}
            />
          </FlexCol>
        </Padded>
      </Content>
    </>
  )
}

type RowError = { type: 'deferred_locktime' } | { type: 'message'; message: string }

interface RecoverSectionProps {
  arkadeSwapsReady: boolean
  scanned: SubmarineRecoveryInfo[] | null
  scanning: boolean
  anyRecovering: boolean
  recoveringIds: Set<string>
  rowErrors: Record<string, RowError>
  scanError: string
  recoverable: SubmarineRecoveryInfo[]
  preCltv: SubmarineRecoveryInfo[]
  invalid: SubmarineRecoveryInfo[]
  onScan: () => void
  onRecoverOne: (swap: BoltzSubmarineSwap) => void
}

function RecoverSection({
  arkadeSwapsReady,
  scanned,
  scanning,
  anyRecovering,
  recoveringIds,
  rowErrors,
  scanError,
  recoverable,
  preCltv,
  invalid,
  onScan,
  onRecoverOne,
}: RecoverSectionProps) {
  const nothingFound = scanned !== null && recoverable.length === 0 && preCltv.length === 0 && invalid.length === 0

  return (
    <FlexCol gap='1rem'>
      <TextLabel>Recover stranded funds</TextLabel>
      <Text color='dark50' small thin wrap>
        Scan your local swap history for funds still locked at submarine swap addresses. This includes failed swaps that
        were never refunded and successful swaps that received an extra deposit. Boltz is not contacted; only swaps
        recorded on this device are checked.
      </Text>

      <ErrorMessage error={Boolean(scanError)} text={scanError} />

      {scanned ? (
        nothingFound ? (
          <WarningBox green text='Nothing to recover. No stranded funds were found in your local swap history.' />
        ) : (
          <FlexCol gap='1.5rem'>
            {recoverable.length > 0 ? (
              <RecoveryGroup
                title='Refundable now'
                tone='green'
                entries={recoverable}
                recoveringIds={recoveringIds}
                rowErrors={rowErrors}
                onRecoverOne={onRecoverOne}
                disabled={!arkadeSwapsReady || scanning}
              />
            ) : null}
            {preCltv.length > 0 ? (
              <RecoveryGroup
                title='Waiting for timelock'
                tone='orange'
                entries={preCltv}
                hint='These VTXOs become refundable once the on-chain locktime expires.'
              />
            ) : null}
            {invalid.length > 0 ? (
              <RecoveryGroup
                title='Could not inspect'
                tone='red'
                entries={invalid}
                hint='These swaps are missing data or are still pending; they cannot be inspected for recovery.'
              />
            ) : null}
          </FlexCol>
        )
      ) : null}

      <Button
        onClick={onScan}
        loading={scanning}
        disabled={!arkadeSwapsReady || scanning || anyRecovering}
        label={scanned ? 'Scan again' : 'Check for refundable funds'}
        secondary={scanned !== null}
      />
    </FlexCol>
  )
}

interface RecoveryGroupProps {
  title: string
  tone: 'green' | 'orange' | 'red'
  entries: SubmarineRecoveryInfo[]
  hint?: string
  recoveringIds?: Set<string>
  rowErrors?: Record<string, RowError>
  onRecoverOne?: (swap: BoltzSubmarineSwap) => void
  disabled?: boolean
}

function RecoveryGroup({
  title,
  tone,
  entries,
  hint,
  recoveringIds,
  rowErrors,
  onRecoverOne,
  disabled,
}: RecoveryGroupProps) {
  const toneColor = tone === 'green' ? 'green' : tone === 'orange' ? 'orange' : 'red'
  return (
    <FlexCol gap='0.5rem'>
      <FlexRow between>
        <Text color={toneColor} small bold>
          {title}
        </Text>
        <Text color='dark50' small thin>
          {entries.length} swap{entries.length === 1 ? '' : 's'}
        </Text>
      </FlexRow>
      {hint ? (
        <Text color='dark50' small thin wrap>
          {hint}
        </Text>
      ) : null}
      <FlexCol gap='0.25rem'>
        {entries.map((info) => (
          <RecoveryRow
            key={info.swap.id}
            info={info}
            recovering={recoveringIds?.has(info.swap.id) ?? false}
            error={rowErrors?.[info.swap.id]}
            onRecover={onRecoverOne}
            disabled={disabled}
          />
        ))}
      </FlexCol>
    </FlexCol>
  )
}

const LOCKTIME_THRESHOLD = 500_000_000

interface RecoveryRowProps {
  info: SubmarineRecoveryInfo
  recovering: boolean
  error?: RowError
  onRecover?: (swap: BoltzSubmarineSwap) => void
  disabled?: boolean
}

function RecoveryRow({ info, recovering, error, onRecover, disabled }: RecoveryRowProps) {
  const nowUnixSeconds = Math.floor(Date.now() / 1000)
  const style: React.CSSProperties = {
    backgroundColor: 'var(--dark10)',
    border: '1px solid var(--dark20)',
    borderRadius: '0.25rem',
    padding: '0.5rem 0.75rem',
    width: '100%',
  }

  let blocksAway: number | null = null
  let secondsAway: number | null = null

  if (info.refundLocktime !== undefined) {
    if (info.refundLocktime >= LOCKTIME_THRESHOLD) {
      secondsAway = Math.max(0, info.refundLocktime - nowUnixSeconds)
    } else if (info.currentBlockHeight !== undefined) {
      blocksAway = Math.max(0, info.refundLocktime - info.currentBlockHeight)
    }
  }

  const showRecoverButton = info.status === 'recoverable' && Boolean(onRecover)
  const errorText = error ? formatRowError(error, blocksAway, secondsAway) : null

  return (
    <div style={style}>
      <FlexRow between>
        <FlexCol gap='0.125rem'>
          <Text small>{info.amountSats > 0 ? prettyAmount(info.amountSats) : `${shortId(info.swap.id)}`}</Text>
          <Text color='dark50' tiny thin>
            {info.amountSats > 0 ? shortId(info.swap.id) : info.swap.status}
          </Text>
          {errorText ? (
            <Text color='red' tiny wrap>
              {errorText}
            </Text>
          ) : null}
        </FlexCol>
        <FlexCol end gap='0.125rem'>
          {showRecoverButton ? (
            <div style={{ minWidth: '6rem' }}>
              <Button
                onClick={() => onRecover?.(info.swap)}
                loading={recovering}
                disabled={disabled || recovering}
                label='Recover'
                secondary
              />
            </div>
          ) : null}
          {info.status === 'pre_cltv' && (blocksAway !== null || secondsAway !== null) ? (
            <Text color='orange' tiny>
              {secondsAway !== null && secondsAway <= 0 ? (
                <>Ready now; scan again</>
              ) : blocksAway !== null ? (
                <>
                  {blocksAway} block{blocksAway === 1 ? '' : 's'} to go
                </>
              ) : (
                <>{formatRemainingTime(secondsAway!)} to go</>
              )}
            </Text>
          ) : null}
          {info.status === 'invalid_swap' && info.error ? (
            <Text color='red' tiny wrap>
              {truncate(info.error, 60)}
            </Text>
          ) : null}
        </FlexCol>
      </FlexRow>
    </div>
  )
}

function formatRowError(error: RowError, blocksAway: number | null, secondsAway: number | null): string {
  if (error.type === 'message') return error.message
  // deferred_locktime: the SDK declined to broadcast because the on-chain
  // refund locktime hasn't passed yet (Boltz cooperative path was rejected
  // and the unilateral refundWithoutReceiver still needs CLTV).
  const remaining = formatLocktimeRemaining(blocksAway, secondsAway)
  return remaining
    ? `Refund locktime not reached yet — try again in ${remaining}.`
    : 'Refund locktime not reached yet — try again later.'
}

function formatLocktimeRemaining(blocksAway: number | null, secondsAway: number | null): string | null {
  if (secondsAway !== null) {
    if (secondsAway <= 0) return null
    return formatRemainingTime(secondsAway)
  }
  if (blocksAway !== null) {
    if (blocksAway <= 0) return null
    return `${blocksAway} block${blocksAway === 1 ? '' : 's'}`
  }
  return null
}

function shortId(id: string): string {
  if (id.length <= 12) return id
  return `${id.slice(0, 6)}…${id.slice(-4)}`
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s
}

function formatRemainingTime(seconds: number): string {
  if (seconds <= 0) return '0 seconds'
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `~${days} day${days === 1 ? '' : 's'}`
  if (hours > 0) return `~${hours} hour${hours === 1 ? '' : 's'}`
  if (minutes > 0) return `~${minutes} minute${minutes === 1 ? '' : 's'}`
  return `${seconds} second${seconds === 1 ? '' : 's'}`
}
