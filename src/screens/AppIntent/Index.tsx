import { toXOnlySignerHex } from '@arkade-os/sdk'
import { useContext, useEffect, useState } from 'react'
import Button from '../../components/Button'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import Content from '../../components/Content'
import ErrorMessage from '../../components/Error'
import FlexCol from '../../components/FlexCol'
import Header from '../../components/Header'
import Padded from '../../components/Padded'
import Text from '../../components/Text'
import { callbackHost, redirectToCallback, type AppIntentErrorCode } from '../../lib/appIntent'
import OpenInApp from './OpenInApp'
import { FlowContext } from '../../providers/flow'
import { useTranslation } from '../../providers/language'
import { NavigationContext, Pages } from '../../providers/navigation'
import { WalletContext } from '../../providers/wallet'

const errorText = (t: (key: string) => string, error: AppIntentErrorCode): string => {
  switch (error) {
    case 'too-long':
      return t('appIntent.tooLong')
    case 'unknown-action':
      return t('appIntent.unknownAction')
    case 'missing-callback':
      return t('appIntent.missingCallback')
    case 'bad-callback':
      return t('appIntent.badCallback')
    case 'missing-request':
      return t('appIntent.missingRequest')
    case 'bad-request':
      return t('appIntent.badRequest')
  }
}

export default function AppIntentScreen() {
  const { appIntent, setAppIntent } = useContext(FlowContext)
  const { navigate } = useContext(NavigationContext)
  const { svcWallet, wallet } = useContext(WalletContext)
  const { t } = useTranslation()
  const [address, setAddress] = useState('')
  const [pubkey, setPubkey] = useState('')
  const [error, setError] = useState('')

  const callback = appIntent && 'callback' in appIntent ? appIntent.callback : undefined
  const host = callback ? callbackHost(callback) : ''

  useEffect(() => {
    if (appIntent?.status !== 'connect' || !svcWallet) return
    let cancelled = false
    Promise.resolve(svcWallet.getAddress())
      .then((next) => {
        if (cancelled) return
        if (!next || !wallet.pubkey) throw new Error('missing address')
        const nextPubkey = toXOnlySignerHex(wallet.pubkey)
        setAddress(next)
        setPubkey(nextPubkey)
      })
      .catch(() => {
        if (!cancelled) setError(t('appIntent.addressFailed'))
      })
    return () => {
      cancelled = true
    }
  }, [appIntent, svcWallet, wallet.pubkey, t])

  const finish = (params?: Record<string, string | undefined>) => {
    // Leave the page first. Clearing the intent before navigation remounts this
    // screen as an error state for a frame.
    if (callback && params) {
      redirectToCallback(callback, params)
      return
    }
    setAppIntent(undefined)
    navigate(Pages.Wallet)
  }

  if (appIntent?.status === 'connect') {
    const canShare = Boolean(address && pubkey && !error)
    return (
      <>
        <Header text={t('appIntent.title')} back={() => finish({ error: 'denied' })} />
        <Content>
          <Padded>
            <FlexCol gap='1rem'>
              <ErrorMessage error={Boolean(error)} text={error} />
              <Text big bold wrap>
                {t('appIntent.wantsAddress', { host: host || t('common.unknown') })}
              </Text>
              <Text color='neutral-700' small wrap>
                {t('appIntent.shareExplainer')}
              </Text>
              <OpenInApp />
              {address ? (
                <FlexCol gap='0.25rem'>
                  <Text tiny color='neutral-500'>
                    {t('appIntent.address')}
                  </Text>
                  <Text copy={address} small wrap testId='app-intent-address'>
                    {address}
                  </Text>
                </FlexCol>
              ) : null}
              {pubkey ? (
                <FlexCol gap='0.25rem'>
                  <Text tiny color='neutral-500'>
                    {t('appIntent.pubkey')}
                  </Text>
                  <Text copy={pubkey} small wrap testId='app-intent-pubkey'>
                    {pubkey}
                  </Text>
                </FlexCol>
              ) : null}
            </FlexCol>
          </Padded>
        </Content>
        <ButtonsOnBottom>
          <Button
            disabled={!canShare}
            label={t('appIntent.share')}
            onClick={() => finish({ address, pubkey })}
            testId='app-intent-share'
          />
          <Button
            label={t('appIntent.deny')}
            onClick={() => finish({ error: 'denied' })}
            secondary
            testId='app-intent-deny'
          />
        </ButtonsOnBottom>
      </>
    )
  }

  const invalid = appIntent?.status === 'invalid' ? appIntent.error : undefined
  return (
    <>
      <Header text={t('appIntent.errorTitle')} back={() => finish(callback ? { error: 'invalid' } : undefined)} />
      <Content>
        <Padded>
          <Text wrap>{invalid ? errorText(t, invalid) : t('appIntent.unknownAction')}</Text>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        {callback ? (
          <Button
            label={t('appIntent.returnTo', { host })}
            onClick={() => finish({ error: 'invalid' })}
            testId='app-intent-return'
          />
        ) : (
          <Button label={t('appIntent.goHome')} onClick={() => finish()} testId='app-intent-home' />
        )}
      </ButtonsOnBottom>
    </>
  )
}
