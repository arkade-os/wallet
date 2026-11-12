import Button from './Button'
import FlexCol from './FlexCol'
import FlexRow from './FlexRow'
import Text from './Text'
import { displayPrice, type Book, type BookRow } from '../lib/book'
import { prettyAssetAmount, prettyAssetNumber } from '../lib/assets'
import { useTranslation } from '../providers/language'

interface BookLadderProps {
  book: Book
  /** Decimals of the asset being priced. The quote is sats. */
  decimals: number
  onCancel: (row: BookRow) => void
  onSelect: (row: BookRow) => void
  cancellingId?: string
}

const baseAmount = (row: BookRow): bigint => (row.side === 'ask' ? row.give.amount : row.want.amount)

const priceOf = (row: BookRow, decimals: number): string => prettyAssetNumber(displayPrice(row.price, decimals, 0))

/**
 * Asks above the spread, bids below it. Tapping a row fills the trade sheet
 * with that order's exact size. Cancelling is a separate control, and only on
 * a row this wallet posted.
 */
export default function BookLadder({ book, decimals, onCancel, onSelect, cancellingId }: BookLadderProps) {
  const { t } = useTranslation()
  const asks = [...book.asks].reverse()

  if (asks.length === 0 && book.bids.length === 0) {
    return (
      <Text centered color='neutral-500' small testId='book-empty'>
        {t('book.noOrders')}
      </Text>
    )
  }

  const renderRow = (row: BookRow) => (
    <FlexRow between key={row.id} testId={`book-row-${row.id}`}>
      <button type='button' className='min-w-0 flex-1 bg-transparent text-left' onClick={() => onSelect(row)}>
        <FlexRow between>
          <Text bold>{priceOf(row, decimals)}</Text>
          <Text>
            {prettyAssetAmount(baseAmount(row), decimals)}
            {row.mine ? ` · ${t('book.yourOrder')}` : ''}
          </Text>
        </FlexRow>
      </button>
      {row.mine ? (
        <Button
          label={t('book.cancel')}
          secondary
          disabled={cancellingId === row.id}
          loading={cancellingId === row.id}
          onClick={() => onCancel(row)}
        />
      ) : null}
    </FlexRow>
  )

  return (
    <FlexCol gap='0.25rem'>
      {asks.length > 0 ? (
        <>
          <Text color='neutral-500' small>
            {t('book.asks')}
          </Text>
          {asks.map(renderRow)}
        </>
      ) : null}
      {book.spread ? (
        <Text tiny centered color='neutral-500'>
          {t('book.spread', { spread: prettyAssetNumber(displayPrice(book.spread, decimals, 0)) })}
        </Text>
      ) : null}
      {book.bids.length > 0 ? (
        <>
          <Text color='neutral-500' small>
            {t('book.bids')}
          </Text>
          {book.bids.map(renderRow)}
        </>
      ) : null}
    </FlexCol>
  )
}
