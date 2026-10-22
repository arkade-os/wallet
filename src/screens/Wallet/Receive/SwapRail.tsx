import Button from '../../../components/Button'
import ErrorMessage from '../../../components/Error'
import FlexCol from '../../../components/FlexCol'
import { TextSecondary } from '../../../components/Text'
import type { SwapRail } from '../../../lib/receive/swapRail'
import { useTranslation } from '../../../providers/language'

export default function SwapRailStatus({ rail }: { rail: SwapRail }) {
  const { t } = useTranslation()
  return (
    <>
      {/* Two different things, told apart. "No solver" leaves the ark
          and on-chain addresses working and is worth no more than a
          grey line; a payment that was paid and then lost, or a claim
          that keeps failing, is not. */}
      {rail.lost ? (
        <ErrorMessage error text={t('receive.lightningPaymentLost')} />
      ) : rail.claimError ? (
        <ErrorMessage error text={t('receive.claimFailed', { error: rail.claimError })} />
      ) : null}
      {rail.error ? (
        <FlexCol gap='0.25rem' centered>
          <TextSecondary>
            {rail.noDriver
              ? t('receive.lightningUnavailable', { error: t('receive.noLightningSolver') })
              : t('receive.lightningUnavailable', { error: rail.error })}
          </TextSecondary>
          {rail.retryable ? <Button label={t('common.tryAgain')} onClick={rail.retry} secondary /> : null}
        </FlexCol>
      ) : null}
    </>
  )
}
