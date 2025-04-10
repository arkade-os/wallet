import { useContext, useEffect, useState } from 'react'
import { FlowContext } from '../../../providers/flow'
import Content from '../../../components/Content'
import Padded from '../../../components/Padded'
import Error from '../../../components/Error'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import Button from '../../../components/Button'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { extractError } from '../../../lib/error'
import { redeemNotes } from '../../../lib/asp'
import Loading from '../../../components/Loading'
import Header from '../../../components/Header'
import FlexCol from '../../../components/FlexCol'
import { consoleError } from '../../../lib/logs'
import Details, { DetailsProps } from '../../../components/Details'
import { AspContext } from '../../../providers/asp'

export default function NotesRedeem() {
  const { aspInfo } = useContext(AspContext)
  const { noteInfo } = useContext(FlowContext)
  const { navigate } = useContext(NavigationContext)

  const defaultButtonLabel = 'Redeem Note'

  const [buttonLabel, setButtonLabel] = useState(defaultButtonLabel)
  const [error, setError] = useState('')
  const [redeeming, setRedeeming] = useState(false)

  useEffect(() => {
    setError(aspInfo.unreachable ? 'Ark server unreachable' : '')
  }, [aspInfo.unreachable])

  useEffect(() => {
    setButtonLabel(redeeming ? 'Redeeming...' : defaultButtonLabel)
  }, [redeeming])

  const handleBack = () => {
    navigate(Pages.NotesForm)
  }

  const handleRedeem = async () => {
    setError('')
    setRedeeming(true)
    try {
      await redeemNotes([noteInfo.note])
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
      <Header text='Redeem Note' back={handleBack} />
      <Content>
        {redeeming ? (
          <Loading text='Redeeming a note Processing. This may take a few moments.' />
        ) : (
          <Padded>
            <FlexCol gap='2rem'>
              <Error error={Boolean(error)} text={error} />
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
