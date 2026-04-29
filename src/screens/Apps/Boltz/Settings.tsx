import { useContext, useEffect, useState } from 'react'
import type { BoltzSubmarineSwap, SubmarineRecoveryInfo, SubmarineRecoveryResult } from '@arkade-os/boltz-swap'
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

type RecoverySummary = {
  recovered: number
  failed: number
  recoveredSats: number
  errors: string[]
}

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
  const [recovering, setRecovering] = useState(false)
  const [recoverError, setRecoverError] = useState('')
  const [summary, setSummary] = useState<RecoverySummary | null>(null)

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

  const totalRecoverableSats = recoverable.reduce((sum, info) => sum + info.amountSats, 0)

  const resetRecoveryState = () => {
    setScanned(null)
    setScanError('')
    setRecoverError('')
    setSummary(null)
  }

  const handleScan = async () => {
    if (!arkadeSwaps) {
      setScanError('Boltz integration is not ready yet. Try again in a moment.')
      return
    }
    setScanning(true)
    resetRecoveryState()
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

  const handleRecoverAll = async () => {
    if (!arkadeSwaps) {
      setRecoverError('Boltz integration is not ready yet. Try again in a moment.')
      return
    }
    if (recoverable.length === 0) return

    const swaps: BoltzSubmarineSwap[] = recoverable.map((info) => info.swap)
    setRecovering(true)
    setRecoverError('')
    setSummary(null)
    try {
      const results: SubmarineRecoveryResult[] = await arkadeSwaps.recoverAllSubmarineFunds(swaps)
      const recoveredIds = new Set(results.filter((r) => r.recovered).map((r) => r.swapId))
      const errors = results.filter((r) => !r.recovered).map((r) => r.error ?? 'unknown error')
      const recoveredSats = recoverable
        .filter((info) => recoveredIds.has(info.swap.id))
        .reduce((sum, info) => sum + info.amountSats, 0)
      const failed = results.length - recoveredIds.size

      setSummary({ recovered: recoveredIds.size, failed, recoveredSats, errors })

      if (failed === 0) {
        toast(`Recovered ${prettyAmount(recoveredSats)}`)
      } else if (recoveredIds.size === 0) {
        toast('Recovery failed')
      } else {
        toast(`Recovered ${recoveredIds.size} of ${results.length}`)
      }

      // Refresh the scan so already-recovered entries drop off the list.
      try {
        const fresh = await arkadeSwaps.scanRecoverableSubmarineSwaps()
        setScanned(fresh)
      } catch (err) {
        consoleError(err, 'Failed to refresh recovery scan after recover')
      }
    } catch (err) {
      consoleError(err, 'Bulk recovery threw unexpectedly')
      setRecoverError(`Recovery failed: ${extractError(err)}`)
    } finally {
      setRecovering(false)
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
              recovering={recovering}
              scanError={scanError}
              recoverError={recoverError}
              recoverable={recoverable}
              preCltv={preCltv}
              invalid={invalid}
              totalRecoverableSats={totalRecoverableSats}
              summary={summary}
              onScan={handleScan}
              onRecoverAll={handleRecoverAll}
            />
          </FlexCol>
        </Padded>
      </Content>
    </>
  )
}

interface RecoverSectionProps {
  arkadeSwapsReady: boolean
  scanned: SubmarineRecoveryInfo[] | null
  scanning: boolean
  recovering: boolean
  scanError: string
  recoverError: string
  recoverable: SubmarineRecoveryInfo[]
  preCltv: SubmarineRecoveryInfo[]
  invalid: SubmarineRecoveryInfo[]
  totalRecoverableSats: number
  summary: RecoverySummary | null
  onScan: () => void
  onRecoverAll: () => void
}

function RecoverSection({
  arkadeSwapsReady,
  scanned,
  scanning,
  recovering,
  scanError,
  recoverError,
  recoverable,
  preCltv,
  invalid,
  totalRecoverableSats,
  summary,
  onScan,
  onRecoverAll,
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
      <ErrorMessage error={Boolean(recoverError)} text={recoverError} />

      {summary ? <SummaryBox summary={summary} /> : null}

      {scanned ? (
        nothingFound ? (
          <WarningBox green text='Nothing to recover. No stranded funds were found in your local swap history.' />
        ) : (
          <FlexCol gap='1.5rem'>
            {recoverable.length > 0 ? (
              <RecoveryGroup title='Refundable now' tone='green' entries={recoverable} />
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

      <FlexCol gap='0.5rem'>
        <Button
          onClick={onScan}
          loading={scanning}
          disabled={!arkadeSwapsReady || scanning || recovering}
          label={scanned ? 'Scan again' : 'Check for refundable funds'}
          secondary={scanned !== null}
        />
        {recoverable.length > 0 ? (
          <Button
            onClick={onRecoverAll}
            loading={recovering}
            disabled={!arkadeSwapsReady || scanning || recovering}
            label={`Recover ${prettyAmount(totalRecoverableSats)} from ${recoverable.length} swap${recoverable.length === 1 ? '' : 's'}`}
          />
        ) : null}
      </FlexCol>
    </FlexCol>
  )
}

function SummaryBox({ summary }: { summary: RecoverySummary }) {
  if (summary.recovered === 0 && summary.failed === 0) return null

  if (summary.failed === 0) {
    return (
      <WarningBox
        green
        text={`Recovered ${prettyAmount(summary.recoveredSats)} from ${summary.recovered} swap${summary.recovered === 1 ? '' : 's'}.`}
      />
    )
  }
  if (summary.recovered === 0) {
    return <WarningBox red text={`All ${summary.failed} recoveries failed. ${summary.errors[0] ?? ''}`} />
  }
  return (
    <WarningBox
      text={`Recovered ${summary.recovered} of ${summary.recovered + summary.failed} (${prettyAmount(summary.recoveredSats)}). ${summary.failed} failed.`}
    />
  )
}

interface RecoveryGroupProps {
  title: string
  tone: 'green' | 'orange' | 'red'
  entries: SubmarineRecoveryInfo[]
  hint?: string
}

function RecoveryGroup({ title, tone, entries, hint }: RecoveryGroupProps) {
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
          <RecoveryRow key={info.swap.id} info={info} />
        ))}
      </FlexCol>
    </FlexCol>
  )
}

const LOCKTIME_THRESHOLD = 500_000_000

function RecoveryRow({ info }: { info: SubmarineRecoveryInfo }) {
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

  return (
    <div style={style}>
      <FlexRow between>
        <FlexCol gap='0.125rem'>
          <Text small>{info.amountSats > 0 ? prettyAmount(info.amountSats) : `${shortId(info.swap.id)}`}</Text>
          <Text color='dark50' tiny thin>
            {info.amountSats > 0 ? shortId(info.swap.id) : info.swap.status}
          </Text>
        </FlexCol>
        <FlexCol end gap='0.125rem'>
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
