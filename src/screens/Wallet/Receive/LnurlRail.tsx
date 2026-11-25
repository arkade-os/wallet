import { useState } from 'react'
import type { NameOptions } from '@arkade-os/lnurl-client/arkade'
import Button from '../../../components/Button'
import ErrorMessage from '../../../components/Error'
import FlexCol from '../../../components/FlexCol'
import Input from '../../../components/Input'
import Text, { TextSecondary } from '../../../components/Text'
import type { LnurlRail, OnboardingChoice } from '../../../lib/receive/lnurlRail'
import { useTranslation } from '../../../providers/language'

// Reserved names (claim codes) are named from Settings only, so Receive stays one tap for everyone else.
const RECEIVE_CHOICES: OnboardingChoice[] = ['self', 'random']

export default function LnurlRailPanel({ rail, showAddress }: { rail: LnurlRail; showAddress: boolean }) {
  const { t } = useTranslation()
  const [naming, setNaming] = useState(false)

  if (rail.status === 'off' || rail.status === 'loading') return null
  if (rail.status === 'failed')
    return <TextSecondary>{t('receive.lnaddressUnavailable', { error: rail.error })}</TextSecondary>

  const address = rail.receiver?.lightningAddress
  // No error to show: bootstrap never fetches capabilities for a named receiver, and naming is offered only while nameless.
  if (address)
    return showAddress ? (
      <Text centered copy={address}>
        {address}
      </Text>
    ) : null

  const choices = rail.choices.includes('self')
    ? rail.choices.filter((c) => RECEIVE_CHOICES.includes(c) && !(c === 'random' && rail.ownsName))
    : []
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
  const [hasCode, setHasCode] = useState(false)
  const self = choices.includes('self')
  const admin = choices.includes('admin')
  // Without `self` a chosen name needs a code, so the code is asked for first and never hidden.
  const codeFirst = admin && !self
  const code = codeFirst || hasCode ? claimCode : ''
  // A code alone claims the reserved name it unlocks; a free-name code gets `username_required` back.
  const canClaim = Boolean(code) || (self && Boolean(username))
  const codeInput = (
    <Input
      name='lnurl-claim-code'
      focus
      label={self ? t('receive.claimCodeOptional') : t('receive.claimCode')}
      placeholder={t('receive.claimCode')}
      value={claimCode}
      onChange={setClaimCode}
    />
  )

  return (
    <FlexCol gap='0.5rem'>
      {self || admin ? (
        <>
          {codeFirst ? codeInput : null}
          <Input
            name='lnurl-username'
            placeholder={codeFirst ? t('receive.chooseNameOptional') : t('receive.chooseName')}
            value={username}
            onChange={setUsername}
          />
          {admin && !codeFirst ? (
            <TextSecondary>
              <a
                href='#'
                aria-expanded={hasCode}
                onClick={(event) => {
                  event.preventDefault()
                  setHasCode(!hasCode)
                }}
              >
                {t('receive.haveClaimCode')}
              </a>
            </TextSecondary>
          ) : null}
          {hasCode && !codeFirst ? codeInput : null}
          <Button
            label={t('receive.claimName')}
            disabled={busy || !canClaim}
            onClick={() => onName({ ...(username && { username }), ...(code && { claimCode: code }) })}
          />
        </>
      ) : null}
      {choices.includes('random') ? (
        <Button label={t('receive.pickForMe')} disabled={busy} onClick={() => onName({})} secondary />
      ) : null}
    </FlexCol>
  )
}
