import { useContext, useState, useSyncExternalStore } from 'react'
import { cardErrors, isNetwork, verifyCardSig, type Card, type LocalCardInput } from '@arkade-os/solver-discovery'
import type { OpenRfqOffer, Outcome } from '@arkade-os/swap'
import Button from '../../../components/Button'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import Content from '../../../components/Content'
import Details from '../../../components/Details'
import ErrorMessage from '../../../components/Error'
import FlexCol from '../../../components/FlexCol'
import Header from '../../../components/Header'
import InputContainer from '../../../components/InputContainer'
import Padded from '../../../components/Padded'
import SheetModal from '../../../components/SheetModal'
import Text from '../../../components/Text'
import { toast } from '../../../components/Toast'
import UnverifiedBadge from '../../../components/UnverifiedBadge'
import { DrawerTitle } from '../../../components/ui/drawer'
import HistoryIcon from '../../../icons/History'
import SuccessIcon from '../../../icons/Success'
import { contactForAddress, isReusableContact, readContacts, saveContact } from '../../../lib/contacts'
import { consoleError } from '../../../lib/logs'
import { paymentEndedWithoutDelivery } from '../../../lib/sendRouter'
import { getSolverCardsVersion, readSolverCards, saveSolverCards, subscribeSolverCards } from '../../../lib/solverCards'
import { BackupContext } from '../../../providers/backup'
import { useTranslation } from '../../../providers/language'

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

function ReceiptRecipient({
  destination,
  invoice,
  delivered,
}: {
  destination?: string
  invoice?: string
  delivered: boolean
}) {
  const { t } = useTranslation()
  const { backupContacts } = useContext(BackupContext)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [saveError, setSaveError] = useState(false)
  const address = destination && isReusableContact(destination) ? destination : undefined
  const contact = contactForAddress(address)
  const canSave = delivered && Boolean(address) && !contact

  const close = () => {
    setOpen(false)
    setName('')
    setSaveError(false)
  }

  const save = () => {
    if (!delivered || !address) return
    if (contactForAddress(address)) return close()
    if (!saveContact(address, name)) return setSaveError(true)
    backupContacts(readContacts()).catch((err) => consoleError(err, 'failed to backup contacts'))
    close()
  }

  return (
    <>
      <Details
        variant='receipt'
        details={{
          destination,
          invoice,
          contactBadge: contact ? contact.name?.trim() || t('contacts.badge') : undefined,
          saveContactAction: canSave ? { label: t('contacts.convert'), onClick: () => setOpen(true) } : undefined,
        }}
      />
      <SheetModal isOpen={open ? canSave : false} onClose={close}>
        <div className='contact-form'>
          <DrawerTitle>{t('contacts.save')}</DrawerTitle>
          <ErrorMessage error={saveError} text={t('contacts.saveFailed')} />
          <InputContainer label={t('contacts.name')}>
            <input
              className='input'
              aria-label={t('contacts.name')}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </InputContainer>
          <Button label={t('contacts.save')} onClick={save} />
          <Button label={t('common.cancel')} secondary onClick={close} />
        </div>
      </SheetModal>
    </>
  )
}

interface PaymentReceiptProps {
  amount: string
  unverifiedAsset: boolean
  destination?: string
  invoice?: string
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
  unverifiedAsset,
  destination,
  invoice,
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
  const statusText: Partial<Record<Outcome, string>> = {
    cancelled: t('transaction.cancelled'),
    refunding: t('send.paymentRefunding'),
    refunded: t('send.paymentRefunded'),
    lapsed: t('send.paymentNeedsAttention'),
    needs_recovery: t('send.paymentNeedsAttention'),
    failed: t('send.paymentNeedsAttention'),
  }
  const status = outcome && statusText[outcome]
  const headline = delivered ? t('send.paymentSent') : (status ?? t('send.paymentProcessing'))
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
              {unverifiedAsset ? <UnverifiedBadge /> : null}
            </div>
            {destination || invoice ? (
              <ReceiptRecipient
                key={destination ?? invoice}
                destination={destination}
                invoice={invoice}
                delivered={delivered}
              />
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
