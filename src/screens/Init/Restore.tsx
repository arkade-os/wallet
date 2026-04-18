import { invalidPrivateKey, nsecToPrivateKey } from '../../lib/privateKey'
import { NavigationContext, Pages } from '../../providers/navigation'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import { useContext, useEffect, useState } from 'react'
import { ConfigContext } from '../../providers/config'
import { BackupProvider } from '../../lib/backup'
import { defaultPassword } from '../../lib/constants'
import { FlowContext } from '../../providers/flow'
import ErrorMessage from '../../components/Error'
import Content from '../../components/Content'
import FlexCol from '../../components/FlexCol'
import { extractError } from '../../lib/error'
import LoadingLogo from '../../components/LoadingLogo'
import { consoleError } from '../../lib/logs'
import Button from '../../components/Button'
import Header from '../../components/Header'
import Padded from '../../components/Padded'
import Input from '../../components/Input'
import { TextSecondary } from '../../components/Text'
import { hex } from '@scure/base'
import { IndexedDbSwapRepository } from '@arkade-os/boltz-swap'
import { OnboardStaggerContainer, OnboardStaggerChild } from '../../components/OnboardLoadIn'
import { validateMnemonic } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english'
import { deriveNostrKeyFromMnemonic } from '../../lib/mnemonic'
import { AspContext } from '../../providers/asp'

export default function InitRestore() {
  const { updateConfig } = useContext(ConfigContext)
  const { navigate } = useContext(NavigationContext)
  const { setInitInfo } = useContext(FlowContext)
  const { aspInfo } = useContext(AspContext)

  const buttonLabel = 'Continue'

  const [error, setError] = useState('')
  const [label, setLabel] = useState(buttonLabel)
  const [mnemonic, setMnemonic] = useState<string>()
  const [privateKey, setPrivateKey] = useState<Uint8Array>()
  const [restoring, setRestoring] = useState(false)
  const [restoreDone, setRestoreDone] = useState(false)
  const [someKey, setSomeKey] = useState<string>()

  useEffect(() => {
    if (!someKey) return
    const trimmed = someKey.trim()

    // Detect mnemonic (input contains spaces)
    if (trimmed.includes(' ')) {
      if (validateMnemonic(trimmed, wordlist)) {
        setMnemonic(trimmed)
        setPrivateKey(undefined)
        setLabel(buttonLabel)
        setError('')
      } else {
        setMnemonic(undefined)
        setPrivateKey(undefined)
        setLabel('Invalid recovery phrase')
        setError('Invalid recovery phrase')
      }
      return
    }

    // Otherwise try nsec/hex private key
    setMnemonic(undefined)
    let pk = undefined
    try {
      if (trimmed.match(/^nsec/)) pk = nsecToPrivateKey(trimmed)
      else pk = hex.decode(trimmed)
      const invalid = invalidPrivateKey(pk)
      setLabel(invalid ? 'Unable to validate private key format' : buttonLabel)
      setError(invalid)
    } catch (err) {
      setLabel('Unable to validate key format')
      setError(extractError(err))
    }
    setPrivateKey(pk)
  }, [someKey])

  const handleCancel = () => navigate(Pages.Init)

  const handleProceed = () => {
    setRestoring(true)
    let seckey: Uint8Array
    if (mnemonic) {
      setInitInfo({ mnemonic, password: defaultPassword, restoring: true })
      const isNet =
        aspInfo.network !== 'testnet' &&
        aspInfo.network !== 'mutinynet' &&
        aspInfo.network !== 'signet' &&
        aspInfo.network !== 'regtest'
      seckey = deriveNostrKeyFromMnemonic(mnemonic, isNet)
    } else {
      setInitInfo({ privateKey, password: defaultPassword, restoring: true })
      seckey = privateKey!
    }
    new BackupProvider({ seckey }, new IndexedDbSwapRepository())
      .restore((conf) =>
        // we enforce delegates on restore
        updateConfig({ ...conf, delegate: true }),
      )
      .catch((err) => consoleError(err, 'Error restoring from nostr'))
      .finally(() => setRestoreDone(true))
  }

  const handleExitComplete = () => {
    if (error) return setRestoring(false)
    else navigate(Pages.InitConnect)
  }

  const disabled = Boolean((!privateKey && !mnemonic) || error)

  if (restoring)
    return (
      <LoadingLogo
        text='Restoring wallet...'
        done={restoreDone}
        exitMode='fly-up'
        onExitComplete={handleExitComplete}
      />
    )

  return (
    <>
      <Header text='Restore wallet' back />
      <Content>
        <Padded>
          <OnboardStaggerContainer>
            <OnboardStaggerChild>
              <FlexCol between>
                <FlexCol>
                  <Input name='private-key' label='Recovery phrase or private key' onChange={setSomeKey} value={someKey} />
                  <ErrorMessage error={Boolean(error)} text={error} />
                </FlexCol>
                <TextSecondary wrap>
                  Enter your 12-word recovery phrase, or a private key starting with 'nsec'. Do not share it with anyone.
                </TextSecondary>
              </FlexCol>
            </OnboardStaggerChild>
          </OnboardStaggerContainer>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button onClick={handleProceed} label={label} disabled={disabled} />
        <Button onClick={handleCancel} label='Cancel' secondary />
      </ButtonsOnBottom>
    </>
  )
}
