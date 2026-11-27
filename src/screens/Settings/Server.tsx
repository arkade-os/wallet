import { useContext, useEffect, useState } from 'react'
import { BackupContext } from '../../providers/backup'
import Button from '../../components/Button'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import Content from '../../components/Content'
import Padded from '../../components/Padded'
import ErrorMessage from '../../components/Error'
import { ConfigContext } from '../../providers/config'
import { getOperatorInfo, operatorErrorText } from '../../lib/operator'
import { WalletContext } from '../../providers/wallet'
import Header from './Header'
import WarningBox from '../../components/Warning'
import InputUrl from '../../components/InputUrl'
import FlexCol from '../../components/FlexCol'
import Scanner from '../../components/Scanner'
import { OperatorContext, OperatorInfo } from '../../providers/operator'
import { consoleError } from '../../lib/logs'
import LoadingLogo from '../../components/LoadingLogo'
import { isMainnet } from '../../lib/constants'
import { useTranslation } from '../../providers/language'
import { isValidUrl } from '@/lib/validators'

export default function Server() {
  const { operatorInfo } = useContext(OperatorContext)
  const { backupConfig } = useContext(BackupContext)
  const { config, updateConfig } = useContext(ConfigContext)
  const { svcWallet, resetWallet } = useContext(WalletContext)
  const { t } = useTranslation()

  const [operatorUrl, setOperatorUrl] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState<OperatorInfo>()
  const [scan, setScan] = useState(false)
  const [loading, setLoading] = useState(false)

  const isValidServerUrl = (url: string) => {
    let fullUrl = url
    if (url.startsWith('localhost') || url.startsWith('127.0.0.1')) fullUrl = 'http://' + url
    else if (!url.startsWith('http')) fullUrl = 'https://' + url
    return isValidUrl(fullUrl)
  }

  useEffect(() => {
    setError(
      operatorInfo.unreachable
        ? operatorErrorText(operatorInfo, t('init.arkadeServerUnreachable'), t('errors.outdatedWallet'))
        : '',
    )
  }, [operatorInfo.unreachable, operatorInfo.outdated, t])

  useEffect(() => {
    if (!operatorUrl || !isValidServerUrl(operatorUrl)) return
    // don't do anything if same server
    if (operatorUrl === config.operatorUrl) return setError(t('settings.sameServer'))
    // test connection
    getOperatorInfo(operatorUrl).then((info) => {
      setError(info.unreachable ? t('settings.unableToConnect') : '')
      setInfo(info)
    })
  }, [operatorUrl, t])

  if (!svcWallet) return <LoadingLogo text={t('common.loading')} />

  // Mirrors the Advanced menu filter: block direct navigation to this screen too,
  // but still allow recovery if the current mainnet server is unreachable.
  const blocked = isMainnet(operatorInfo.network) && !operatorInfo.unreachable

  const handleConnect = async () => {
    if (blocked) return
    setLoading(true)
    try {
      if (!info) return
      await resetWallet()
      updateConfig({ ...config, operatorUrl: info.url })
      await backupConfig({ ...config, operatorUrl: info.url })
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

  if (scan)
    return (
      <Scanner
        close={() => setScan(false)}
        label={t('settings.serverUrl')}
        onData={(data) => {
          setOperatorUrl(data)
          setScan(false)
        }}
        onError={setError}
      />
    )

  if (blocked) {
    return (
      <>
        <Header text={t('settings.server')} back />
        <Content>
          <Padded>
            <WarningBox text={t('settings.serverUnavailableOnMainnet')} />
          </Padded>
        </Content>
      </>
    )
  }

  return (
    <>
      <Header text={t('settings.server')} back />
      <Content>
        <Padded>
          <FlexCol>
            <InputUrl
              focus
              label={t('settings.serverUrl')}
              onChange={setOperatorUrl}
              onEnter={handleEnter}
              openScan={() => setScan(true)}
              placeholder={config.operatorUrl}
            />
            <ErrorMessage error={Boolean(error)} text={error} />
            {info && !error ? <WarningBox green text={t('settings.serverFound')} /> : null}
            <WarningBox text={t('settings.serverResetWarning')} />
          </FlexCol>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button
          onClick={handleConnect}
          label={t('settings.connectToServer')}
          disabled={!info || Boolean(error)}
          loading={loading}
        />
      </ButtonsOnBottom>
    </>
  )
}
