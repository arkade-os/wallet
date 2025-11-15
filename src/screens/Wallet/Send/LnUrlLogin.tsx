import { useContext, useEffect, useState } from 'react'
import Button from '../../../components/Button'
import ErrorMessage from '../../../components/Error'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { FlowContext } from '../../../providers/flow'
import Padded from '../../../components/Padded'
import Header from '../../../components/Header'
import Content from '../../../components/Content'
import FlexCol from '../../../components/FlexCol'
import Loading from '../../../components/Loading'
import { WalletContext } from '../../../providers/wallet'
import { loginLnUrl, parseLoginLnUrl } from '../../../lib/lnurl'
import { extractError } from '../../../lib/error'
import { consoleError } from '../../../lib/logs'
import WarningBox from '../../../components/Warning'
import Table from '../../../components/Table'
import TypeIcon from '../../../icons/Type'
import InfoIcon from '../../../icons/Info'
import Success from '../../../components/Success'

export default function LnUrlLogin() {
  const { sendInfo, setSendInfo } = useContext(FlowContext)
  const { navigate } = useContext(NavigationContext)
  const { svcWallet } = useContext(WalletContext)

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [domain, setDomain] = useState('')
  const [k1, setK1] = useState('')

  useEffect(() => {
    if (!sendInfo.lnUrl) {
      navigate(Pages.SendForm)
      return
    }

    const { k1: parsedK1, url } = parseLoginLnUrl(sendInfo.lnUrl)
    if (!parsedK1) {
      navigate(Pages.SendForm)
      return
    }

    setK1(parsedK1)

    // Extract domain from URL
    try {
      const urlObj = new URL(url)
      setDomain(urlObj.hostname)
    } catch {
      setDomain('Unknown service')
    }
  }, [sendInfo.lnUrl, navigate])

  const handleConfirm = async () => {
    if (!sendInfo.lnUrl || !svcWallet || !k1) return

    setLoading(true)
    setError('')

    try {
      const { url } = parseLoginLnUrl(sendInfo.lnUrl)
      const response = await loginLnUrl(url, k1, svcWallet.identity)
      const data = await response.json()

      if (data.status === 'OK') {
        setSuccess(true)
        setLoading(false)
      } else {
        setError(data.reason || 'Login failed')
        setLoading(false)
      }
    } catch (err) {
      consoleError(err, 'error logging in with LNURL')
      setError(extractError(err) || 'Failed to login')
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setSendInfo({ ...sendInfo, lnUrl: undefined })
    navigate(Pages.SendForm)
  }

  const handleBack = () => {
    setSendInfo({ ...sendInfo, lnUrl: undefined })
    navigate(Pages.Wallet)
  }

  if (!sendInfo.lnUrl || !k1) {
    return <Loading text='Loading...' />
  }

  const tableData = [
    ['Service', domain, <TypeIcon key='service-icon' />],
    ['Challenge', k1, <InfoIcon key='challenge-icon' />],
  ]

  return (
    <>
      <Header text='LNURL Login' back={success ? handleBack : handleCancel} />
      <Content>
        {loading ? (
          <Loading text='Signing...' />
        ) : success ? (
          <Success headline='Login successful!' text={`You have successfully signed in to ${domain}`} />
        ) : (
          <Padded>
            <FlexCol>
              <ErrorMessage error={Boolean(error)} text={error} />
              <WarningBox text='By signing this message, you are authenticating yourself to this service. Make sure you trust this website before proceeding.' />
              <Table data={tableData} />
            </FlexCol>
          </Padded>
        )}
      </Content>
      <ButtonsOnBottom>
        {loading ? null : success ? (
          <Button onClick={handleBack} label='Back to Wallet' />
        ) : (
          <>
            <Button onClick={handleCancel} label='Cancel' secondary />
            <Button onClick={handleConfirm} label='Sign' disabled={Boolean(error)} />
          </>
        )}
      </ButtonsOnBottom>
    </>
  )
}
