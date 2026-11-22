import { useSyncExternalStore } from 'react'
import { cardErrors, isNetwork, verifyCardSig, type Card, type LocalCardInput } from '@arkade-os/solver-discovery'
import type { OpenRfqOffer, Outcome } from '@arkade-os/swap'
import Button from '../../../components/Button'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import Content from '../../../components/Content'
import FlexCol from '../../../components/FlexCol'
import Header from '../../../components/Header'
import Padded from '../../../components/Padded'
import Text from '../../../components/Text'
import { toast } from '../../../components/Toast'
import HistoryIcon from '../../../icons/History'
import SuccessIcon from '../../../icons/Success'
import { paymentEndedWithoutDelivery } from '../../../lib/sendRouter'
import { getSolverCardsVersion, readSolverCards, saveSolverCards, subscribeSolverCards } from '../../../lib/solverCards'
import { useTranslation } from '../../../providers/language'

const statusText: Partial<Record<Outcome, string>> = {
  cancelled: 'transaction.cancelled',
  refunding: 'send.paymentRefunding',
  refunded: 'send.paymentRefunded',
  lapsed: 'send.paymentNeedsAttention',
  needs_recovery: 'send.paymentNeedsAttention',
  failed: 'send.paymentNeedsAttention',
}

function SaveProvider({ offer, network }: { offer: OpenRfqOffer; network: string }) {
  const { t } = useTranslation()
  useSyncExternalStore(subscribeSolverCards, getSolverCardsVersion)
  const { signedCard, solverName, solverPubkey } = offer
  if (
    !isNetwork(network) ||
    signedCard.discovery_pubkey !== solverPubkey ||
    !verifyCardSig(signedCard) ||
    cardErrors(signedCard, network).length
  ) {
    return null
  }
  const sharesProviderId = (entry: LocalCardInput) =>
    entry.network === network && (entry.card as Card).discovery_pubkey === solverPubkey
  const matchesProvider = (entry: LocalCardInput) => sharesProviderId(entry) && verifyCardSig(entry.card as Card)

  const save = () => {
    const cards = readSolverCards()
    if (cards.some(matchesProvider)) return
    try {
      saveSolverCards([
        ...cards.filter((entry) => !sharesProviderId(entry)),
        { network, label: solverName.slice(0, 64), card: signedCard },
      ])
    } catch {
      toast.error(t('common.tryAgain'))
    }
  }

  if (readSolverCards().some(matchesProvider)) return <Text small>{t('send.paymentProviderSaved')}</Text>
  return <Button clear label={t('send.savePaymentProvider')} onClick={save} />
}

interface PaymentReceiptProps {
  amount: string
  destination?: string
  onchain: boolean
  delivered: boolean
  outcome?: Outcome
  offer?: OpenRfqOffer
  network: string
  returnHost: string
  onActivity: () => void
  onDone: () => void
}

export default function PaymentReceipt({
  amount,
  destination,
  onchain,
  delivered,
  outcome,
  offer,
  network,
  returnHost,
  onActivity,
  onDone,
}: PaymentReceiptProps) {
  const { t } = useTranslation()
  const status = outcome && statusText[outcome]
  const headline = t(delivered ? 'send.paymentSent' : (status ?? 'send.paymentProcessing'))
  const keepOpen = onchain && !delivered && !paymentEndedWithoutDelivery(outcome)

  return (
    <>
      <Header text={t('send.title')} />
      <Content>
        <Padded>
          <FlexCol centered gap='1rem' padding='1rem 0'>
            <div className='flex h-20 items-center justify-center' aria-hidden='true'>
              {delivered ? <SuccessIcon small /> : <HistoryIcon size={36} />}
            </div>
            <div role='status' className='space-y-2 text-center'>
              <h1 className='text-2xl font-semibold'>{headline}</h1>
              <Text centered big wrap>
                {amount}
              </Text>
            </div>
            {destination ? (
              <Text centered small wrap>
                {destination}
              </Text>
            ) : null}
            {keepOpen ? (
              <Text centered small wrap>
                {t('send.pendingOnchain')}
              </Text>
            ) : null}
            {offer ? (
              <FlexCol centered gap='0.25rem'>
                <Text small wrap centered>
                  {offer.solverName}
                </Text>
                {delivered ? <SaveProvider offer={offer} network={network} /> : null}
              </FlexCol>
            ) : null}
          </FlexCol>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button secondary label={t('send.viewPaymentActivity')} onClick={onActivity} />
        <Button
          label={delivered && returnHost ? t('appIntent.returnTo', { host: returnHost }) : t('send.paymentReceiptDone')}
          onClick={onDone}
        />
      </ButtonsOnBottom>
    </>
  )
}
