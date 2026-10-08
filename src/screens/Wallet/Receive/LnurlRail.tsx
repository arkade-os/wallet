import { useState } from 'react'
import type { NameOptions } from '@arkade-os/lnurl-client/arkade'
import Button from '../../../components/Button'
import ErrorMessage from '../../../components/Error'
import FlexCol from '../../../components/FlexCol'
import Input from '../../../components/Input'
import Text, { TextSecondary } from '../../../components/Text'
import type { LnurlRail, OnboardingChoice } from '../../../lib/receive/lnurlRail'

export default function LnurlRailPanel({ rail }: { rail: LnurlRail }) {
  const [naming, setNaming] = useState(false)

  if (rail.status === 'off') return null
  if (rail.status === 'loading') return <TextSecondary>Loading lightning address…</TextSecondary>
  if (rail.status === 'failed') return <TextSecondary>Lightning address unavailable: {rail.error}</TextSecondary>

  if (rail.status === 'onboarding') {
    return (
      <FlexCol gap='0.5rem'>
        <TextSecondary>Get a lightning address</TextSecondary>
        {rail.choices.length ? (
          <NameForm
            choices={rail.choices}
            busy={rail.busy}
            onName={(opts) => rail.claim(opts)}
            onNameless={() => rail.claim({ nameless: true })}
          />
        ) : (
          <TextSecondary>This server does not offer addresses to this wallet</TextSecondary>
        )}
        <ErrorMessage error={Boolean(rail.error)} text={rail.error} />
      </FlexCol>
    )
  }

  const address = rail.receiver?.lightningAddress
  if (address) return <Text centered>{address}</Text>

  const namingChoices = rail.choices.filter((choice) => choice !== 'session')
  return (
    <FlexCol gap='0.5rem'>
      <TextSecondary>No name yet — payers can scan the QR</TextSecondary>
      {naming ? (
        <NameForm choices={namingChoices} busy={rail.busy} onName={(opts) => rail.upgrade(opts)} />
      ) : namingChoices.length ? (
        <Button label='Add a name' onClick={() => setNaming(true)} secondary />
      ) : null}
      <ErrorMessage error={Boolean(rail.error)} text={rail.error} />
    </FlexCol>
  )
}

function NameForm({
  choices,
  busy,
  onName,
  onNameless,
}: {
  choices: OnboardingChoice[]
  busy: boolean
  onName: (opts: NameOptions) => void
  onNameless?: () => void
}) {
  const [username, setUsername] = useState('')
  const [claimCode, setClaimCode] = useState('')
  const self = choices.includes('self')
  const admin = choices.includes('admin')
  const canClaim = Boolean(username) && (self || Boolean(claimCode))

  return (
    <FlexCol gap='0.5rem'>
      {self || admin ? (
        <>
          <Input name='lnurl-username' placeholder='Choose a name' value={username} onChange={setUsername} />
          {admin ? (
            <Input
              name='lnurl-claim-code'
              label={self ? 'Claim code (optional)' : 'Claim code'}
              placeholder='Claim code'
              value={claimCode}
              onChange={setClaimCode}
            />
          ) : null}
          <Button
            label='Claim name'
            disabled={busy || !canClaim}
            onClick={() => onName(claimCode ? { username, claimCode } : { username })}
          />
        </>
      ) : null}
      {choices.includes('random') ? (
        <Button label='Pick one for me' disabled={busy} onClick={() => onName({})} secondary />
      ) : null}
      {onNameless && choices.includes('session') ? (
        <Button label='No name' disabled={busy} onClick={onNameless} secondary />
      ) : null}
    </FlexCol>
  )
}
