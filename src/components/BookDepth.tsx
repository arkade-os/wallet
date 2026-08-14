import { useMemo } from 'react'
import { Area, AreaChart, XAxis, YAxis } from 'recharts'

import { Book, DepthPoint, depthCurve } from '../lib/book'
import { prettyAssetNumber } from '../lib/assets'
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from './ui/chart'

interface BookDepthProps {
  book: Book
  baseTicker: string
  baseDecimals: number
  quoteDecimals?: number
}

/** Both series are already scaled to whole units, so the precision that matters
 * shrinks as the number grows. Same shape as the ladder's price formatter. */
const fmt = (n: number): string =>
  Number.isFinite(n) ? prettyAssetNumber(n, n >= 1000 ? 0 : n >= 1 ? 2 : n >= 0.01 ? 4 : 8) : ''

const chartConfig = {
  bid: { label: 'bids', theme: { light: 'var(--green-600)', dark: 'var(--green-400)' } },
  ask: { label: 'asks', theme: { light: 'var(--red-600)', dark: 'var(--red-400)' } },
} satisfies ChartConfig

export default function BookDepth({ book, baseTicker, baseDecimals, quoteDecimals = 0 }: BookDepthProps) {
  const data = useMemo(() => depthCurve(book, baseDecimals, quoteDecimals), [book, baseDecimals, quoteDecimals])

  // A single rung is a dot, not a curve — the ladder below says it better.
  if (data.length < 2) return null

  return (
    <ChartContainer
      config={chartConfig}
      role='img'
      aria-label={`${baseTicker} order book depth`}
      className='aspect-auto h-32 w-full'
      data-testid='book-depth'
    >
      <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <XAxis hide dataKey='price' type='number' domain={['dataMin', 'dataMax']} />
        <YAxis hide />
        <ChartTooltip
          content={
            <ChartTooltipContent
              hideLabel
              hideIndicator
              formatter={(value, name, item) => (
                <span
                  className={`font-mono tabular-nums ${
                    name === 'bid' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {`${fmt(Number(value))} ${baseTicker} at ${fmt((item.payload as DepthPoint).price)} sats`}
                </span>
              )}
            />
          }
        />
        {/* stepAfter/stepBefore put each step at the price its orders actually rest at.
            connectNulls={false} leaves the spread as the gap it is. */}
        <Area
          connectNulls={false}
          dataKey='bid'
          dot={false}
          fill='var(--color-bid)'
          fillOpacity={0.15}
          stroke='var(--color-bid)'
          strokeWidth={1.5}
          type='stepAfter'
        />
        <Area
          connectNulls={false}
          dataKey='ask'
          dot={false}
          fill='var(--color-ask)'
          fillOpacity={0.15}
          stroke='var(--color-ask)'
          strokeWidth={1.5}
          type='stepBefore'
        />
      </AreaChart>
    </ChartContainer>
  )
}
