import { useState } from 'react'
import type { NameOptions } from '@arkade-os/lnurl-client/arkade'
import Button from '../../../components/Button'
import ErrorMessage from '../../../components/Error'
import FlexCol from '../../../components/FlexCol'
import Input from '../../../components/Input'
import { TextSecondary } from '../../../components/Text'
import type { LnurlRail, OnboardingChoice } from '../../../lib/receive/lnurlRail'
import { useTranslation } from '../../../providers/language'

// Reserved names (claim codes) are named from Settings only, so Receive stays one tap for everyone else.
const RECEIVE_CHOICES: OnboardingChoice[] = ['self', 'random']

export default function LnurlRailPanel({ rail }: { rail: LnurlRail }) {
  const { t } = useTranslation()
  const [naming, setNaming] = useState(false)

  if (rail.status === 'off' || rail.status === 'loading') return null
  if (rail.status === 'failed')
    return <TextSecondary>{t('receive.lnaddressUnavailable', { error: rail.error })}</TextSecondary>

  // No error to show: bootstrap never fetches capabilities for a named receiver, and naming is offered only while nameless.
  if (rail.receiver?.lightningAddress) return null

  const choices = rail.choices.includes('self') ? rail.choices.filter((c) => RECEIVE_CHOICES.includes(c)) : []
  const onName = (opts: NameOptions) => (rail.receiver ? rail.upgrade(opts) : rail.claim(opts))
  return (
    <FlexCol gap='0.5rem'>
      {naming || (!rail.receiver && choices.length) ? (
        <NameForm choices={choices} busy={rail.busy} onName={onName} />
      ) : choices.length ? (
        <Button label={t('receive.addName')} onClick={() => setNaming(true)} secondary />
      ) : null}
      <ErrorMessage error={Boolean(rail.error)} text={rail.error} />
    </FlexCol>
  )
}

export function NameForm({
  choices,
  busy,
  onName,
}: {
  choices: OnboardingChoice[]
  busy: boolean
  onName: (opts: NameOptions) => void
}) {
  const { t } = useTranslation()
  const [username, setUsername] = useState('')
  const [claimCode, setClaimCode] = useState('')
  const self = choices.includes('self')
  const admin = choices.includes('admin')
  const canClaim = Boolean(username) && (self || Boolean(claimCode))

  return (
    <FlexCol gap='0.5rem'>
      {self || admin ? (
        <>
          <Input name='lnurl-username' placeholder={t('receive.chooseName')} value={username} onChange={setUsername} />
          {admin ? (
            <Input
              name='lnurl-claim-code'
              label={self ? t('receive.claimCodeOptional') : t('receive.claimCode')}
              placeholder={t('receive.claimCode')}
              value={claimCode}
              onChange={setClaimCode}
            />
          ) : null}
          <Button
            label={t('receive.claimName')}
            disabled={busy || !canClaim}
            onClick={() => onName(claimCode ? { username, claimCode } : { username })}
          />
        </>
      ) : null}
      {choices.includes('random') ? (
        <Button label={t('receive.pickForMe')} disabled={busy} onClick={() => onName({})} secondary />
      ) : null}
    </FlexCol>
  )
}
