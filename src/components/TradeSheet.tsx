import { useMemo, useState } from 'react'
import Button from './Button'
import FlexCol from './FlexCol'
import FlexRow from './FlexRow'
import Input from './Input'
import SheetModal from './SheetModal'
import Text, { TextSecondary } from './Text'
import { atomicToUnits } from '../lib/assets'
import {
  baseOf,
  cmpRatio,
  displayPrice,
  isBtc,
  matchRow,
  parseAtoms,
  parseDecimal,
  quoteAtomsFor,
  termsFor,
  type Book,
  type OrderTerms,
} from '../lib/book'
import { useTranslation } from '../providers/language'

export interface TradePrefill {
  side: 'buy' | 'sell'
  /** Atomic units of the asset. */
  baseAtoms: bigint
  /** Sats the other leg of this exact order moves. */
  quoteAtoms: bigint
}

interface TradeSheetProps {
  open: boolean
  ticker: string
  decimals: number
  book: Book
  takeable: boolean
  /** Satoshis this wallet can spend. Disables Buy when it is zero. */
  sats: number
  /** Atomic units of the asset this wallet holds. Disables Sell when it is zero. */
  assetAtoms: bigint
  prefill?: TradePrefill
  onClose: () => void
  onSubmit: (terms: OrderTerms) => Promise<void>
}

const priceText = (prefill: TradePrefill, decimals: number): string => {
  const shown = displayPrice({ num: prefill.quoteAtoms, den: prefill.baseAtoms }, decimals, 0)
  if (!Number.isFinite(shown)) return ''
  // No grouping separators: the field is parsed back as a decimal.
  const trimmed = Math.round(shown * 1e8) / 1e8
  return String(trimmed)
}

/**
 * One composer for both sides. The price decides whether this fills a resting
 * order or posts one; there is no separate limit switch. The line under the
 * button says which, and it only says "fills now" when `matchRow` agrees.
 */
export default function TradeSheet({
  open,
  ticker,
  decimals,
  book,
  takeable,
  sats,
  assetAtoms,
  prefill,
  onClose,
  onSubmit,
}: TradeSheetProps) {
  const { t } = useTranslation()
  const [side, setSide] = useState<'buy' | 'sell'>(prefill?.side ?? 'buy')
  const [amount, setAmount] = useState(prefill ? atomicToUnits(prefill.baseAtoms, decimals) : '')
  const [price, setPrice] = useState(prefill ? priceText(prefill, decimals) : '')
  const [dirty, setDirty] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>()

  const assetId = baseOf(book.pairKey)
  const terms = useMemo((): OrderTerms | undefined => {
    if (!dirty && prefill && side === prefill.side) {
      return termsFor(prefill.side, assetId, prefill.baseAtoms, prefill.quoteAtoms)
    }
    if (!assetId || isBtc(assetId)) return undefined
    const baseAtoms = parseAtoms(amount, decimals)
    const typed = parseDecimal(price)
    if (!baseAtoms || !typed) return undefined
    const quoteAtoms = quoteAtomsFor(baseAtoms, typed, decimals, side === 'sell' ? 'up' : 'down')
    return termsFor(side, assetId, baseAtoms, quoteAtoms)
  }, [amount, assetId, decimals, dirty, prefill, price, side])

  const match = terms ? matchRow(book, terms, takeable) : undefined
  const crossed = Boolean(terms && !match && takeable && wouldCross(book, terms))

  const outlook = !terms
    ? undefined
    : match
      ? t('book.fillsNow')
      : crossed
        ? t('book.waitsForSize')
        : side === 'buy'
          ? t('book.waitsUntilSell')
          : t('book.waitsUntilBuy')

  const sideDisabled = side === 'buy' ? sats <= 0 : assetAtoms <= 0n

  const submit = async () => {
    if (!terms || sideDisabled) return
    setSubmitting(true)
    setError(undefined)
    try {
      await onSubmit(terms)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('book.tradeFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SheetModal isOpen={open} onClose={onClose}>
      <FlexCol gap='0.75rem'>
        <FlexRow gap='0.5rem'>
          <Button label={t('book.buy')} onClick={() => setSide('buy')} secondary={side !== 'buy'} />
          <Button label={t('book.sell')} onClick={() => setSide('sell')} secondary={side !== 'sell'} />
        </FlexRow>
        <Input
          label={t('book.amount', { ticker })}
          value={amount}
          onChange={(value) => {
            setDirty(true)
            setAmount(value)
          }}
          placeholder='0'
          testId='book-amount'
        />
        <Input
          label={t('book.price', { ticker })}
          value={price}
          onChange={(value) => {
            setDirty(true)
            setPrice(value)
          }}
          placeholder='0'
          testId='book-price'
        />
        {outlook ? (
          <Text centered color='neutral-500' small thin wrap testId='book-outlook'>
            {outlook}
          </Text>
        ) : null}
        {error ? (
          <Text centered color='red' wrap testId='book-error'>
            {error}
          </Text>
        ) : null}
        {!takeable ? <TextSecondary centered>{t('book.takeUnavailable')}</TextSecondary> : null}
        <Button
          label={side === 'buy' ? t('book.buy') : t('book.sell')}
          onClick={submit}
          disabled={!terms || sideDisabled || submitting}
          loading={submitting}
          testId='book-submit'
        />
      </FlexCol>
    </SheetModal>
  )
}

/** A row whose price we would take, but whose size is not the whole deposit. */
const wouldCross = (book: Book, terms: OrderTerms): boolean => {
  if (isBtc(terms.want.assetId)) {
    const ours = { num: terms.want.amount, den: terms.give.amount }
    return book.bids.some((row) => !row.mine && cmpRatio(row.price, ours) >= 0 && row.want.amount !== terms.give.amount)
  }
  const ours = { num: terms.give.amount, den: terms.want.amount }
  return book.asks.some((row) => !row.mine && cmpRatio(row.price, ours) <= 0 && row.give.amount !== terms.want.amount)
}
