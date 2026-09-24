import Button from '../../../components/Button'
import ErrorMessage from '../../../components/Error'
import FlexCol from '../../../components/FlexCol'
import { TextSecondary } from '../../../components/Text'
import type { SwapRail } from '../../../lib/receive/swapRail'

export default function SwapRailStatus({ rail }: { rail: SwapRail }) {
  return (
    <>
      {/* Two different things, told apart. "No solver" leaves the ark
          and on-chain addresses working and is worth no more than a
          grey line; a payment that was paid and then lost, or a claim
          that keeps failing, is not. */}
      {rail.lost ? (
        <ErrorMessage error text='Lightning payment lost: the solver reclaimed it before it could be claimed' />
      ) : rail.claimError ? (
        <ErrorMessage error text={`Claiming the Lightning payment failed: ${rail.claimError}`} />
      ) : null}
      {rail.error ? (
        <FlexCol gap='0.25rem' centered>
          <TextSecondary>
            {rail.noDriver ? 'Lightning receive is temporarily unavailable' : `Lightning unavailable: ${rail.error}`}
          </TextSecondary>
          {rail.retryable ? <Button label='Try again' onClick={rail.retry} secondary /> : null}
        </FlexCol>
      ) : null}
    </>
  )
}
