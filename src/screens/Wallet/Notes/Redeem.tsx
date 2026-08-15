import { useContext, useEffect, useState } from 'react'
import { FlowContext } from '../../../providers/flow'
import Content from '../../../components/Content'
import Padded from '../../../components/Padded'
import ErrorMessage from '../../../components/Error'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import Button from '../../../components/Button'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { extractError } from '../../../lib/error'
import { aspErrorText, redeemNotes } from '../../../lib/asp'
import LoadingLogo from '../../../components/LoadingLogo'
import Header from '../../../components/Header'
import FlexCol from '../../../components/FlexCol'
import { consoleError } from '../../../lib/logs'
import { WalletContext } from '../../../providers/wallet'
import Details, { DetailsProps } from '../../../components/Details'
import { AspContext } from '../../../providers/asp'
import { useTranslation } from '../../../providers/language'

export default function NotesRedeem() {
  const { aspInfo } = useContext(AspContext)
  const { noteInfo } = useContext(FlowContext)
  const { navigate } = useContext(NavigationContext)
  const { svcWallet } = useContext(WalletContext)
  const { t } = useTranslation()

  const defaultButtonLabel = t('notes.redeemNote')

  const [buttonLabel, setButtonLabel] = useState(defaultButtonLabel)
  const [error, setError] = useState('')
  const [redeeming, setRedeeming] = useState(false)

  useEffect(() => {
    setError(aspInfo.unreachable ? aspErrorText(aspInfo, t('init.arkadeServerUnreachable')) : '')
  }, [aspInfo.unreachable, aspInfo.outdated])

  useEffect(() => {
    setButtonLabel(redeeming ? t('notes.redeeming') : defaultButtonLabel)
  }, [redeeming])

  const handleBack = () => {
    navigate(Pages.NotesForm)
  }

  if (!svcWallet) return <LoadingLogo text={t('common.loading')} />

  const handleRedeem = async () => {
    setError('')
    setRedeeming(true)
    try {
      await redeemNotes(svcWallet, [noteInfo.note])
      navigate(Pages.NotesSuccess)
    } catch (err) {
      consoleError(err, 'error redeeming note')
      setError(extractError(err))
    }
    setRedeeming(false)
  }

  const details: DetailsProps = {
    arknote: noteInfo.note,
    satoshis: noteInfo.satoshis,
  }

  return (
    <>
      <Header text={t('notes.redeemNote')} back={handleBack} />
      <Content>
        {redeeming ? (
          <LoadingLogo text={t('notes.processing')} />
        ) : (
          <Padded>
            <FlexCol gap='2rem'>
              <ErrorMessage error={Boolean(error)} text={error} />
              <Details details={details} />
            </FlexCol>
          </Padded>
        )}
      </Content>
      <ButtonsOnBottom>
        <Button onClick={handleRedeem} label={buttonLabel} disabled={redeeming} />
      </ButtonsOnBottom>
    </>
  )
}
