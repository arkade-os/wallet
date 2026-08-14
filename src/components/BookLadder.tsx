import { Book, BookRow, displayPrice } from '../lib/book'
import { prettyAssetAmount, prettyAssetNumber } from '../lib/assets'
import { hapticTap } from '../lib/haptics'
import FlexCol from './FlexCol'
import FlexRow from './FlexRow'
import Shadow from './Shadow'
import Text, { TextSecondary } from './Text'

interface BookLadderProps {
  book: Book
  baseTicker: string
  baseDecimals: number
  quoteTicker?: string
  quoteDecimals?: number
  takeable: boolean
  takeDisabledReason?: string
  onTake?: (row: BookRow) => void
  onPull?: (row: BookRow) => void
  loading?: boolean
}

/** A row's size in base-atomic units: an ask gives the base, a bid wants it. */
const baseAmount = (row: BookRow): bigint => (row.side === 'ask' ? row.give.amount : row.want.amount)

/** Prices are already scaled to whole units, so the decimals that matter shrink as the number grows. */
const fmtPrice = (n: number): string =>
  Number.isFinite(n) ? prettyAssetNumber(n, n >= 1000 ? 0 : n >= 1 ? 2 : n >= 0.01 ? 4 : 8) : ''

/** Depth bar width, as a percentage of the deepest rung on either side. */
const depthPct = (amount: bigint, max: bigint): number => (max > 0n ? Number((amount * 100n) / max) : 0)

interface RowProps {
  row: BookRow
  baseTicker: string
  baseDecimals: number
  quoteTicker: string
  quoteDecimals: number
  max: bigint
  onPress?: (row: BookRow) => void
}

function LadderRow({ row, baseTicker, baseDecimals, quoteTicker, quoteDecimals, max, onPress }: RowProps) {
  const ask = row.side === 'ask'
  const size = prettyAssetAmount(baseAmount(row), baseDecimals)
  const price = fmtPrice(displayPrice(row.price, baseDecimals, quoteDecimals))
  const verb = row.mine ? 'pull' : 'take'

  return (
    <button
      type='button'
      disabled={!onPress}
      aria-label={`${verb} ${size} ${baseTicker} at ${price} ${quoteTicker}`}
      onClick={() => {
        if (!onPress) return
        hapticTap()
        onPress(row)
      }}
      className='relative flex min-h-11 w-full items-center justify-between gap-3 rounded-sm px-2 text-left transition-colors active:bg-neutral-100 disabled:cursor-default'
    >
      <span
        aria-hidden
        style={{ width: `${depthPct(baseAmount(row), max)}%` }}
        className={`absolute inset-y-0.5 right-0 rounded-sm ${ask ? 'bg-red-500/10' : 'bg-green-500/10'}`}
      />
      <span className='relative flex min-w-0 items-center gap-2'>
        <Text small color='neutral-800'>{`${size} ${baseTicker}`}</Text>
        {row.mine ? (
          <span className='shrink-0 rounded-full border border-neutral-200 px-1.5 text-xs leading-4 text-neutral-500'>
            yours
          </span>
        ) : null}
      </span>
      <span
        className={`relative shrink-0 font-medium tabular-nums ${ask ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'}`}
      >
        {price}
      </span>
    </button>
  )
}

function SideEmpty({ label }: { label: string }) {
  return (
    <FlexRow centered padding='0.5rem'>
      <Text tiny color='neutral-400'>
        {label}
      </Text>
    </FlexRow>
  )
}

function Skeleton() {
  return (
    <FlexCol gap='0' testId='book-ladder-skeleton'>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className='flex h-11 w-full animate-pulse items-center justify-between px-2'>
          <div className='h-3 rounded-full bg-neutral-100' style={{ width: `${30 + ((i * 13) % 25)}%` }} />
          <div className='h-3 w-14 rounded-full bg-neutral-100' />
        </div>
      ))}
    </FlexCol>
  )
}

export default function BookLadder({
  book,
  baseTicker,
  baseDecimals,
  quoteTicker = 'sats',
  quoteDecimals = 0,
  takeable,
  takeDisabledReason,
  onTake,
  onPull,
  loading,
}: BookLadderProps) {
  const { asks, bids, spread } = book
  const empty = asks.length === 0 && bids.length === 0

  // Depth is relative to the deepest rung on either side, so the two halves stay comparable.
  const max = [...asks, ...bids].reduce((m, r) => (baseAmount(r) > m ? baseAmount(r) : m), 0n)

  const press = (row: BookRow): ((row: BookRow) => void) | undefined => {
    if (!takeable) return undefined
    return row.mine ? onPull : onTake
  }

  const rowOf = (row: BookRow) => (
    <LadderRow
      key={row.id}
      row={row}
      baseTicker={baseTicker}
      baseDecimals={baseDecimals}
      quoteTicker={quoteTicker}
      quoteDecimals={quoteDecimals}
      max={max}
      onPress={press(row)}
    />
  )

  return (
    <FlexCol gap='0.5rem' testId='book-ladder'>
      <Shadow lighter>
        <FlexRow between padding='0.25rem 0.5rem 0.5rem'>
          <Text tiny color='neutral-500'>
            size
          </Text>
          <Text tiny color='neutral-500'>{`price · ${quoteTicker}`}</Text>
        </FlexRow>

        {loading ? (
          <Skeleton />
        ) : empty ? (
          <FlexCol centered gap='0.25rem' padding='1.5rem 0.5rem'>
            <TextSecondary centered>{`nobody's standing here yet`}</TextSecondary>
          </FlexCol>
        ) : (
          <FlexCol gap='0'>
            {/* Asks descend into the spread, so the cheapest one sits closest to the middle. */}
            {asks.length ? [...asks].reverse().map(rowOf) : <SideEmpty label='no asks' />}

            <FlexRow centered gap='0.5rem' padding='0.5rem 0.25rem'>
              <div className='h-px flex-1 bg-neutral-200' />
              {spread ? (
                <Text
                  tiny
                  color='neutral-500'
                >{`spread ${fmtPrice(displayPrice(spread, baseDecimals, quoteDecimals))}`}</Text>
              ) : null}
              <div className='h-px flex-1 bg-neutral-200' />
            </FlexRow>

            {bids.length ? bids.map(rowOf) : <SideEmpty label='no bids' />}
          </FlexCol>
        )}
      </Shadow>

      {loading || empty ? null : (
        <FlexRow centered>
          <TextSecondary centered>
            {takeable ? 'tap to take' : (takeDisabledReason ?? 'not takeable right now')}
          </TextSecondary>
        </FlexRow>
      )}
    </FlexCol>
  )
}
