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
import Text from '../../components/Text'
import Scanner from '../../components/Scanner'
import { AspContext, AspInfo } from '../../providers/asp'
import { consoleError } from '../../lib/logs'
import LoadingLogo from '../../components/LoadingLogo'

export default function Server() {
  const { aspInfo } = useContext(AspContext)
  const { backupConfig, config, updateConfig } = useContext(ConfigContext)
  const { svcWallet, resetWallet } = useContext(WalletContext)

  const [aspUrl, setAspUrl] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState<AspInfo>()
  const [scan, setScan] = useState(false)
  const [loading, setLoading] = useState(false)

  const [emulatorUrl, setEmulatorUrl] = useState('')
  const [emulatorError, setEmulatorError] = useState('')
  const [emulatorScan, setEmulatorScan] = useState(false)
  const [emulatorSaved, setEmulatorSaved] = useState(false)

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

  if (!svcWallet) return <LoadingLogo text='Loading...' />

  const handleConnect = async () => {
    setLoading(true)
    try {
      if (!info) return
      await resetWallet()
      const newConfig = { ...config, aspUrl: info.url }
      if (config.nostrBackup) await backupConfig(newConfig)
      updateConfig(newConfig)
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

  const normalizeUrl = (url: string) => {
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    const local = url.startsWith('localhost') || url.startsWith('127.0.0.1')
    return (local ? 'http://' : 'https://') + url
  }

  const onChangeEmulator = (value: string) => {
    setEmulatorUrl(value)
    setEmulatorError('')
    setEmulatorSaved(false)
  }

  const handleSaveEmulator = async () => {
    const trimmed = emulatorUrl.trim()
    if (!isValidUrl(trimmed)) return setEmulatorError('Invalid URL')
    const newConfig = { ...config, emulatorUrl: normalizeUrl(trimmed) }
    if (config.nostrBackup) await backupConfig(newConfig)
    updateConfig(newConfig)
    setEmulatorSaved(true)
    setEmulatorUrl('')
  }

  if (scan) return <Scanner close={() => setScan(false)} label='Server URL' onData={setAspUrl} onError={setError} />

  if (emulatorScan)
    return (
      <Scanner
        close={() => setEmulatorScan(false)}
        label='Emulator URL'
        onData={onChangeEmulator}
        onError={setEmulatorError}
      />
    )

  return (
    <>
      <Header text='Server' back />
      <Content>
        <Padded>
          <FlexCol gap='2rem'>
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
            <FlexCol gap='0.5rem'>
              <InputUrl
                label='Emulator URL'
                onChange={onChangeEmulator}
                onEnter={handleSaveEmulator}
                openScan={() => setEmulatorScan(true)}
                placeholder={config.emulatorUrl || 'http://localhost:7073'}
                value={emulatorUrl}
              />
              <Text color='dark50' small thin>
                Used for Banco asset swaps. Changing it does not reset your wallet.
              </Text>
              <ErrorMessage error={Boolean(emulatorError)} text={emulatorError} />
              {emulatorSaved ? <WarningBox green text='Emulator URL saved' /> : null}
              <Button secondary label='Save emulator URL' onClick={handleSaveEmulator} disabled={!emulatorUrl.trim()} />
            </FlexCol>
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
