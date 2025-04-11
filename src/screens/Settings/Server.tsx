import { useContext, useEffect, useState } from 'react'
import Button from '../../components/Button'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import Content from '../../components/Content'
import Padded from '../../components/Padded'
import Error from '../../components/Error'
import { ConfigContext } from '../../providers/config'
import { AspInfo, getAspInfo } from '../../lib/asp'
import { clearStorage } from '../../lib/storage'
import { WalletContext } from '../../providers/wallet'
import Header from './Header'
import WarningBox from '../../components/Warning'
import InputUrl from '../../components/InputUrl'
import FlexCol from '../../components/FlexCol'
import Scanner from '../../components/Scanner'
import { AspContext } from '../../providers/asp'

export default function Server() {
  const { aspInfo } = useContext(AspContext)
  const { config, updateConfig } = useContext(ConfigContext)
  const { updateWallet, wallet } = useContext(WalletContext)

  const [aspUrl, setAspUrl] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState<AspInfo>()
  const [scan, setScan] = useState(false)

  useEffect(() => {
    setError(aspInfo.unreachable ? 'Ark server unreachable' : '')
  }, [aspInfo.unreachable])

  useEffect(() => {
    if (!aspUrl) return
    // don't do anything if same server
    if (aspUrl === config.aspUrl) return setError('Same server')
    // test connection
    getAspInfo(aspUrl).then((info) => {
      setError(info.unreachable ? 'Unable to connect' : '')
      setInfo(info)
    })
  }, [aspUrl])

  const handleConnect = () => {
    if (!info) return
    clearStorage()
    updateConfig({ ...config, aspUrl: info.url })
    updateWallet({ ...wallet, network: info.network, initialized: false })
    location.reload() // reload app or else weird things happen
  }

  const handleEnter = () => {
    if (!info || Boolean(error)) return
    handleConnect()
  }

  if (scan) return <Scanner close={() => setScan(false)} label='Server URL' setData={setAspUrl} setError={setError} />

  return (
    <>
      <Header text='Server' back />
      <Content>
        <Padded>
          <FlexCol>
            <Error error={Boolean(error)} text={error} />
            <InputUrl
              focus
              label='Server URL'
              onChange={setAspUrl}
              onEnter={handleEnter}
              openScan={() => setScan(true)}
              placeholder={config.aspUrl}
              value={aspUrl}
            />
            {info && !error ? <WarningBox green text='Server found' /> : null}
            <WarningBox text='Your wallet will be reset. Make sure you backup your wallet first.' />
          </FlexCol>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button onClick={handleConnect} label='Connect to server' disabled={!info || Boolean(error)} />
      </ButtonsOnBottom>
    </>
  )
}
