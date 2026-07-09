import { useContext, useEffect, useState } from 'react'
import Header from './Header'
import Button from '../../components/Button'
import Padded from '../../components/Padded'
import Content from '../../components/Content'
import CenterScreen from '../../components/CenterScreen'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import ErrorMessage from '../../components/Error'
import Text, { TextSecondary } from '../../components/Text'
import FlexCol from '../../components/FlexCol'
import FingerprintIcon from '../../icons/Fingerprint'
import { useToast } from '../../components/Toast'
import { WalletContext } from '../../providers/wallet'
import { AspContext } from '../../providers/asp'
import { ConfigContext } from '../../providers/config'
import { NavigationContext, Pages } from '../../providers/navigation'
import { isWebAuthnSupported, registerPasskey } from '../../lib/passkey'
import { hasPasskeyWallet, mnemonicFromPrf } from '../../lib/passkeyVault'
import { computeNewWalletAddress } from '../../lib/migrate'
import { sendOffChain } from '../../lib/asp'
import { consoleError, consoleLog } from '../../lib/logs'
import { prettyNumber } from '../../lib/format'
import { SwapsContext } from '../../providers/swaps'
import { isSwapWithFundsInFlight } from '../../components/SwapsList'

type Step = 'idle' | 'registering' | 'sending' | 'switching'

/**
 * Seed→passkey migration (the recovery counterpart of the passkey-derived
 * wallet): a wallet restored from a seed is a recovery vehicle. This screen
 * creates a fresh passkey (whose PRF derives a new seed), moves the whole
 * spendable balance to the new wallet's address, then switches the app to the
 * new passkey wallet. The old seed stays on paper; the new wallet gets its own
 * 12 words (backup nudge will fire until confirmed).
 */
export default function Passkey() {
  const { assetBalances, migrateToPasskeyWallet, svcWallet, wallet } = useContext(WalletContext)
  const { aspInfo } = useContext(AspContext)
  const { config } = useContext(ConfigContext)
  const { navigate } = useContext(NavigationContext)
  const { getSwapHistory } = useContext(SwapsContext)

  const { toast } = useToast()
  const [error, setError] = useState('')
  const [step, setStep] = useState<Step>('idle')
  const [pendingSwapCount, setPendingSwapCount] = useState(0)

  const isPasskeyWallet = hasPasskeyWallet()
  const hasAssets = assetBalances.length > 0
  const busy = step !== 'idle'

  // informational only: Boltz reports every swap this seed ever touched
  // (including unpaid invoice stubs, which lock nothing and are ignored here).
  // Even swaps with funds in flight stay claimable with the old seed, so
  // nothing blocks the migration.
  useEffect(() => {
    if (isPasskeyWallet) return
    getSwapHistory()
      .then((swaps) => setPendingSwapCount(swaps.filter(isSwapWithFundsInFlight).length))
      .catch(() => setPendingSwapCount(0))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPasskeyWallet])

  const migrate = async () => {
    setError('')
    if (!svcWallet) return setError('Wallet not ready. Try again in a moment.')
    if (hasAssets) return setError('This wallet holds assets, which cannot be moved automatically yet.')
    try {
      // 1. new passkey → new seed (PRF must be supported; a legacy credential
      //    cannot derive a wallet, so abort rather than downgrade silently)
      setStep('registering')
      const reg = await registerPasskey()
      if (reg.kind !== 'prf') {
        setStep('idle')
        return setError("This device's passkey can't derive wallet keys. Keep using this wallet with a password.")
      }
      const newMnemonic = await mnemonicFromPrf(reg.prfOutput)
      reg.prfOutput.fill(0)

      // 2. move the whole spendable balance to the new wallet's address,
      //    computed offline so the active wallet never has to switch first
      setStep('sending')
      const address = await computeNewWalletAddress(newMnemonic, aspInfo, config.delegate)
      const { available } = await svcWallet.getBalance()
      if (available > 0) {
        const txid = await sendOffChain(svcWallet, available, address)
        consoleLog(`Migration: moved ${available} sats to new passkey wallet (${txid})`)
      }

      // 3. switch identities — the provider tears the old wallet down safely
      //    (funds are already at the new address, so erasing the old seed is ok)
      setStep('switching')
      await migrateToPasskeyWallet(reg.credentialId, newMnemonic)
      // toast + navigate: the wallet switch can remount settings, so an
      // in-component success screen would not survive
      toast(
        available > 0
          ? `Moved ${prettyNumber(available)} sats to your new passkey wallet`
          : 'Your new passkey wallet is ready',
      )
      navigate(Pages.Wallet)
    } catch (err) {
      consoleError(err, 'migration to passkey wallet failed')
      // before migrateToPasskeyWallet ran, the old wallet is fully intact; after
      // it, the passkey descriptor is stored, so passkey login recovers the new
      // wallet even if this page dies mid-switch
      setStep('idle')
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError('Passkey creation was cancelled.')
      } else {
        setError('Migration failed. Your funds have not been lost — try again.')
      }
    }
  }

  if (isPasskeyWallet) {
    return (
      <>
        <Header text='Passkey' back />
        <Content>
          <Padded>
            <CenterScreen>
              <FingerprintIcon />
              <Text centered>Secured with a passkey</Text>
              <TextSecondary centered wrap>
                Your wallet keys are derived from your passkey — unlocking and logging in only ever need it. Keep your
                12-word recovery phrase written down as backup in case the passkey is lost.
              </TextSecondary>
            </CenterScreen>
          </Padded>
        </Content>
      </>
    )
  }

  if (!isWebAuthnSupported()) {
    return (
      <>
        <Header text='Passkey' back />
        <Content>
          <Padded>
            <CenterScreen>
              <FingerprintIcon />
              <Text centered>Passkeys unavailable</Text>
              <TextSecondary centered wrap>
                This browser doesn't support passkeys. You can keep using this wallet with a password.
              </TextSecondary>
            </CenterScreen>
          </Padded>
        </Content>
      </>
    )
  }

  return (
    <>
      <Header text='Passkey' back />
      <Content>
        <Padded>
          <FlexCol gap='1rem'>
            <ErrorMessage error={Boolean(error)} text={error} />
            <CenterScreen>
              <FingerprintIcon />
              <Text centered>Move to a passkey wallet</Text>
              <TextSecondary centered wrap>
                {wallet.restoredFromSeed
                  ? 'This wallet was restored from a seed — treat that seed as exposed. This creates a fresh wallet secured by a passkey and moves your funds to it.'
                  : 'This creates a fresh wallet secured by a passkey and moves your funds to it. Unlocking will only need your fingerprint or face.'}
              </TextSecondary>
              <TextSecondary centered wrap>
                The new wallet has its own recovery phrase — write it down afterwards from Settings → Backup.
              </TextSecondary>
              <TextSecondary centered wrap>
                Onchain (boarding) funds stay with the old seed until settled.
              </TextSecondary>
              {pendingSwapCount > 0 ? (
                <TextSecondary centered wrap>
                  {pendingSwapCount === 1
                    ? '1 unresolved swap from this seed’s history remains claimable with your old seed.'
                    : `${pendingSwapCount} unresolved swaps from this seed’s history remain claimable with your old seed.`}
                </TextSecondary>
              ) : null}
              {hasAssets ? (
                <TextSecondary centered wrap>
                  Note: this wallet holds assets, which can't be moved automatically yet.
                </TextSecondary>
              ) : null}
            </CenterScreen>
          </FlexCol>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button
          onClick={migrate}
          disabled={busy || hasAssets}
          loading={busy}
          label={
            step === 'sending'
              ? 'Moving funds…'
              : step === 'switching'
                ? 'Switching wallet…'
                : 'Create passkey & move funds'
          }
        />
      </ButtonsOnBottom>
    </>
  )
}
