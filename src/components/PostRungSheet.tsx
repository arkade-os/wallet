import { useEffect, useState } from 'react'
import Decimal from 'decimal.js'
import { BTC_ASSET_ID } from '@arkade-os/swap'
import Button from './Button'
import FlexCol from './FlexCol'
import FlexRow from './FlexRow'
import InputContainer from './InputContainer'
import SegmentedControl from './SegmentedControl'
import SheetModal from './SheetModal'
import Text, { TextSecondary } from './Text'
import Title from './Title'
import { centsToUnits, unitsToCents } from '../lib/assets'
import { formatAssetAmount, prettyNumber } from '../lib/format'
import { hapticLight } from '../lib/haptics'
import { cn } from '@/lib/utils'

interface PostRungSheetProps {
  isOpen: boolean
  onClose: () => void
  baseTicker: string
  baseAssetId: string
  baseDecimals: number
  /** sats balance available */
  satsBalance: bigint
  /** base asset balance available, atomic units */
  assetBalance: bigint
  /** best opposing price in sats per WHOLE base unit, to prefill. undefined = empty book */
  referencePrice?: number
  dust: bigint
  onSubmit: (params: {
    give: { assetId: string; amount: bigint }
    want: { assetId: string; amount: bigint }
  }) => Promise<void>
}

type Side = 'buy' | 'sell'

/** sats/unit is typed by hand, so quote it with a fixed decimal scale */
const PRICE_DECIMALS = 8
/** solver-discovery caps asset decimals here; anything else is untrustworthy metadata */
const MAX_DECIMALS = 18
/** past this distance from the book a typo is likelier than an intention */
const FAT_FINGER_RATIO = 0.5

const pow10 = (n: number): bigint => 10n ** BigInt(n)

/** ceiling division, non-negative operands only */
const ceilDiv = (a: bigint, b: bigint): bigint => (a + b - 1n) / b

const safeDecimals = (d: number): number => (Number.isInteger(d) && d >= 0 && d <= MAX_DECIMALS ? d : 0)

/**
 * Keep typed text decimal-parseable at every keystroke: digits, at most one
 * dot, no more fraction digits than the denomination carries. Never Number().
 */
const sanitize = (raw: string, decimals: number): string => {
  const cleaned = raw.replace(/[^0-9.]/g, '')
  const dot = cleaned.indexOf('.')
  const integer = (dot === -1 ? cleaned : cleaned.slice(0, dot)).replace(/^0+(?=\d)/, '')
  if (dot === -1 || decimals === 0) return integer
  const fraction = cleaned
    .slice(dot + 1)
    .replace(/\./g, '')
    .slice(0, decimals)
  return `${integer || '0'}.${fraction}`
}

export default function PostRungSheet({
  isOpen,
  onClose,
  baseTicker,
  baseAssetId,
  baseDecimals,
  satsBalance,
  assetBalance,
  referencePrice,
  dust,
  onSubmit,
}: PostRungSheetProps) {
  const [side, setSide] = useState<Side>('buy')
  const [amount, setAmount] = useState('')
  const [price, setPrice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const decimals = safeDecimals(baseDecimals)

  // a reopened sheet is a fresh rung: never inherit a stale amount
  useEffect(() => {
    if (!isOpen) return
    setSide('buy')
    setAmount('')
    setPrice(referencePrice && referencePrice > 0 ? scalePrice(referencePrice, 0) : '')
    setSubmitError('')
    // referencePrice is read once on open — a book tick must not overwrite typing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const buying = side === 'buy'

  const amountAtomic = unitsToCents(amount, decimals)
  const priceAtomic = unitsToCents(price, PRICE_DECIMALS)

  // sats = amount * price, in exact integer math. Rounded UP on both sides so a
  // rung is never quoted cheaper than what was typed.
  const satsTotal = ceilDiv(amountAtomic * priceAtomic, pow10(decimals) * pow10(PRICE_DECIMALS))

  const giveAtomic = buying ? satsTotal : amountAtomic
  const giveBalance = buying ? satsBalance : assetBalance
  const giveLabel = buying ? 'sats' : baseTicker

  const amountError = !buying && amountAtomic > assetBalance ? `not enough ${baseTicker}` : ''
  const balanceError = buying && satsTotal > satsBalance ? 'not enough sats' : ''
  const dustError = satsTotal > 0n && satsTotal < dust ? `the sats leg must be at least ${prettyNumber(dust, 0)}` : ''
  const legError = submitError || balanceError || dustError

  const deviation =
    referencePrice && referencePrice > 0 && priceAtomic > 0n
      ? new Decimal(priceAtomic.toString())
          .div(pow10(PRICE_DECIMALS).toString())
          .minus(referencePrice)
          .div(referencePrice)
          .toNumber()
      : 0
  const warning =
    Math.abs(deviation) > FAT_FINGER_RATIO
      ? `that is ${prettyNumber(Math.abs(deviation) * 100, 0)}% ${deviation > 0 ? 'above' : 'below'} the book. it fills at exactly this price.`
      : ''

  const valid =
    amountAtomic > 0n && priceAtomic > 0n && satsTotal > 0n && satsTotal >= dust && giveAtomic <= giveBalance

  const handleSide = (value: string) => {
    hapticLight()
    setSide(value === 'sell' ? 'sell' : 'buy')
    setSubmitError('')
  }

  const handlePrice = (value: string) => {
    setPrice(sanitize(value, PRICE_DECIMALS))
    setSubmitError('')
  }

  const handleSubmit = async () => {
    if (!valid || submitting) return
    const sats = { assetId: BTC_ASSET_ID, amount: satsTotal }
    const base = { assetId: baseAssetId, amount: amountAtomic }
    setSubmitting(true)
    setSubmitError('')
    try {
      await onSubmit(buying ? { give: sats, want: base } : { give: base, want: sats })
      onClose()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'could not post the rung')
    } finally {
      setSubmitting(false)
    }
  }

  const chips = referencePrice && referencePrice > 0 ? (buying ? [0, -2, -5, -10] : [0, 2, 5, 10]) : []

  return (
    <SheetModal isOpen={isOpen} onClose={submitting ? () => {} : onClose}>
      <FlexCol gap='1.25rem' testId='post-rung-sheet'>
        <FlexCol gap='0.25rem'>
          <Title text='post a rung' />
          <TextSecondary>name your price. it fills or it doesn&apos;t.</TextSecondary>
        </FlexCol>

        <SegmentedControl options={['buy', 'sell']} selected={side} onChange={handleSide} />

        <InputContainer
          label='amount'
          error={amountError}
          bottomRight={`you have ${formatAssetAmount(assetBalance, decimals)} ${baseTicker}`}
        >
          <label className='label'>
            <input
              className='input'
              type='text'
              inputMode='decimal'
              placeholder='0'
              name='rung-amount'
              data-testid='rung-amount'
              value={amount}
              onChange={(ev) => {
                setAmount(sanitize(ev.currentTarget.value, decimals))
                setSubmitError('')
              }}
            />
            <TextSecondary>{baseTicker}</TextSecondary>
            {buying ? null : (
              <button
                type='button'
                className='pill-base'
                aria-label='Use full balance'
                data-testid='rung-amount-max'
                onClick={() => {
                  hapticLight()
                  setAmount(centsToUnits(assetBalance, decimals))
                  setSubmitError('')
                }}
              >
                Max
                <span className='hit-area' />
              </button>
            )}
          </label>
        </InputContainer>

        <FlexCol gap='0.625rem'>
          <InputContainer
            label='price'
            bottomRight={referencePrice && referencePrice > 0 ? `book ${prettyNumber(referencePrice, 8)}` : ''}
          >
            <label className='label'>
              <input
                className='input'
                type='text'
                inputMode='decimal'
                placeholder='0'
                name='rung-price'
                data-testid='rung-price'
                value={price}
                onChange={(ev) => handlePrice(ev.currentTarget.value)}
              />
              <TextSecondary>{`sats / ${baseTicker}`}</TextSecondary>
            </label>
          </InputContainer>

          {chips.length > 0 ? (
            <FlexRow gap='0.5rem'>
              {chips.map((pct) => {
                const value = scalePrice(referencePrice as number, pct)
                const active = value === price
                return (
                  <button
                    key={pct}
                    type='button'
                    onClick={() => {
                      hapticLight()
                      handlePrice(value)
                    }}
                    className={cn(
                      'flex min-h-11 flex-1 items-center justify-center rounded-full border text-[13px] transition-colors',
                      active
                        ? 'border-neutral-300 bg-neutral-200 font-medium text-fg'
                        : 'border-neutral-200 bg-neutral-50 text-neutral-600',
                    )}
                  >
                    {pct === 0 ? 'market' : `${pct > 0 ? '+' : ''}${pct}%`}
                  </button>
                )
              })}
            </FlexRow>
          ) : null}
        </FlexCol>

        <FlexCol gap='0.5rem'>
          <div className='w-full rounded-xl bg-neutral-50 px-4 py-3'>
            <FlexRow between>
              <TextSecondary>{buying ? 'you pay' : 'you receive'}</TextSecondary>
              <Text big bold testId='rung-total'>
                {`${prettyNumber(satsTotal, 0)} sats`}
              </Text>
            </FlexRow>
            <FlexRow between>
              <Text color='neutral-500' tiny>
                {buying ? `you have ${prettyNumber(satsBalance, 0)} sats` : `you lock ${amount || '0'} ${giveLabel}`}
              </Text>
              <Text color='neutral-500' tiny>
                {buying ? `for ${amount || '0'} ${baseTicker}` : ''}
              </Text>
            </FlexRow>
          </div>

          {legError ? (
            <Text color='danger' small wrap>
              {legError}
            </Text>
          ) : null}
          {warning && !legError ? (
            <Text color='orange' small wrap>
              {warning}
            </Text>
          ) : null}
        </FlexCol>

        <FlexCol gap='0.75rem'>
          <Button
            label='post rung'
            disabled={!valid}
            loading={submitting}
            onClick={handleSubmit}
            testId='rung-submit'
          />
          <Text color='neutral-500' tiny wrap>
            it rests until someone fills it or you pull it. nothing expires, and it fills whole or not at all.
          </Text>
        </FlexCol>
      </FlexCol>
    </SheetModal>
  )
}

/** reference price nudged by a percentage, as clean decimal text */
function scalePrice(reference: number, pct: number): string {
  return new Decimal(reference)
    .mul(100 + pct)
    .div(100)
    .toDecimalPlaces(PRICE_DECIMALS, Decimal.ROUND_DOWN)
    .toFixed()
}
