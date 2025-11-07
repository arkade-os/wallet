import { useContext, useEffect, useState } from 'react'
import Button from '../../components/Button'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import Content from '../../components/Content'
import Padded from '../../components/Padded'
import ErrorMessage from '../../components/Error'
import { ConfigContext } from '../../providers/config'
import { getAspInfo } from '../../lib/asp'
import { WalletContext } from '../../providers/wallet'
import Header from './Header'
import WarningBox from '../../components/Warning'
import InputUrl from '../../components/InputUrl'
import FlexCol from '../../components/FlexCol'
import Scanner from '../../components/Scanner'
import { AspContext, AspInfo } from '../../providers/asp'
import { consoleError } from '../../lib/logs'
import Loading from '../../components/Loading'

export default function Server() {
  const { aspInfo } = useContext(AspContext)
  const { config, updateConfig } = useContext(ConfigContext)
  const { svcWallet, resetWallet } = useContext(WalletContext)

  const [aspUrl, setAspUrl] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState<AspInfo>()
  const [scan, setScan] = useState(false)
  const [loading, setLoading] = useState(false)

  const isValidUrl = (url: string) => {
    if (url.startsWith('localhost') || url.startsWith('http://localhost')) return true
    if (url.startsWith('127.0.0.1') || url.startsWith('http://127.0.0.1')) return true
    const urlPattern = /^(https?:\/\/)?([\w-]+(\.[\w-]+)+)([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?$/
    return urlPattern.test(url)
  }

  useEffect(() => {
    setError(aspInfo.unreachable ? 'Ark server unreachable' : '')
  }, [aspInfo.unreachable])

  useEffect(() => {
    if (!aspUrl || !isValidUrl(aspUrl)) return
    // don't do anything if same server
    if (aspUrl === config.aspUrl) return setError('Same server')
    // test connection
    getAspInfo(aspUrl).then((info) => {
      setError(info.unreachable ? 'Unable to connect' : '')
      setInfo(info)
    })
  }, [aspUrl])

  if (!svcWallet) return <Loading text='Loading...' />

  const handleConnect = async () => {
    setLoading(true)
    try {
      if (!info) return
      await resetWallet()
      updateConfig({ ...config, aspUrl: info.url }, true)
      location.reload() // reload app or else weird things happen
    } catch (err) {
      consoleError(err)
    } finally {
      setLoading(false)
    }
  }

  const handleEnter = () => {
    if (!info || Boolean(error)) return
    handleConnect()
  }

  if (scan) return <Scanner close={() => setScan(false)} label='Server URL' onData={setAspUrl} onError={setError} />

  return (
    <>
      <Header text='Server' back />
      <Content>
        <Padded>
          <FlexCol>
            <InputUrl
              focus
              label='Server URL'
              onChange={setAspUrl}
              onEnter={handleEnter}
              openScan={() => setScan(true)}
              placeholder={config.aspUrl}
              value={aspUrl}
            />
            <ErrorMessage error={Boolean(error)} text={error} />
            {info && !error ? <WarningBox green text='Server found' /> : null}
            <WarningBox text='Your wallet will be reset. Make sure you backup your wallet first.' />
          </FlexCol>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button
          onClick={handleConnect}
          label='Connect to server'
          disabled={!info || Boolean(error)}
          loading={loading}
        />
      </ButtonsOnBottom>
    </>
  )
}
