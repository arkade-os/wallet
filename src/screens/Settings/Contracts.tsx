import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  Contract,
  encodeArkContract,
  signerSetFromInfo,
  classifyAgainstSignerSet,
  type SignerSet,
  type SignerStatus,
} from '@arkade-os/sdk'
import Header from './Header'
import Content from '../../components/Content'
import Padded from '../../components/Padded'
import FlexCol from '../../components/FlexCol'
import FlexRow from '../../components/FlexRow'
import Shadow from '../../components/Shadow'
import Text, { TextSecondary } from '../../components/Text'
import LoadingLogo from '../../components/LoadingLogo'
import CopyIcon from '../../icons/Copy'
import CheckMarkIcon from '../../icons/CheckMark'
import { WalletContext } from '../../providers/wallet'
import { AspContext } from '../../providers/asp'
import { prettyAgo, prettyLongText } from '../../lib/format'
import { copyToClipboard } from '../../lib/clipboard'
import { hapticSubtle } from '../../lib/haptics'
import { useToast } from '../../components/Toast'
import { consoleError } from '../../lib/logs'

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const { toast } = useToast()

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const handleCopy = async () => {
    hapticSubtle()
    await copyToClipboard(value)
    toast('Copied to clipboard')
    setCopied(true)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setCopied(false), 2000)
  }

  return (
    <FlexRow between onClick={handleCopy}>
      <FlexCol gap='0'>
        <TextSecondary>{label}</TextSecondary>
        <Text small>{prettyLongText(value)}</Text>
      </FlexCol>
      <Shadow flex>{copied ? <CheckMarkIcon /> : <CopyIcon />}</Shadow>
    </FlexRow>
  )
}

// Classifies a contract's server signer against the operator's advertised
// signer set, so the list can flag contracts still locked to a deprecated
// signer (and whether their cooperative-migration cutoff has already passed).
function contractSignerStatus(contract: Contract, signerSet: SignerSet | null): SignerStatus | null {
  if (!signerSet) return null
  const serverPubKey = contract.params?.serverPubKey
  if (!serverPubKey) return null
  try {
    return classifyAgainstSignerSet(serverPubKey, signerSet).status
  } catch {
    return null
  }
}

function DeprecatedSignerBadge({ status }: { status: SignerStatus | null }) {
  if (status === 'EXPIRED')
    return (
      <Text tiny color='red'>
        deprecated signer · past cutoff
      </Text>
    )
  if (status === 'MIGRATABLE' || status === 'DUE_NOW')
    return (
      <Text tiny color='orange'>
        deprecated signer
      </Text>
    )
  return null
}

function ContractCard({ contract, signerSet }: { contract: Contract; signerSet: SignerSet | null }) {
  const encoded = useMemo(() => {
    try {
      return encodeArkContract(contract)
    } catch {
      return ''
    }
  }, [contract])

  const signerStatus = useMemo(() => contractSignerStatus(contract, signerSet), [contract, signerSet])

  return (
    <Shadow border>
      <FlexCol gap='0.5rem'>
        <FlexRow between>
          <FlexCol gap='0'>
            {contract.label ? <Text small>{contract.label}</Text> : null}
            <Text tiny color='neutral-500'>
              {contract.type}
            </Text>
          </FlexCol>
          <FlexCol gap='0' end>
            <Text tiny color={contract.state === 'active' ? 'green' : 'neutral-500'}>
              {contract.state}
            </Text>
            <Text tiny color='neutral-500'>
              {contract.createdAt ? prettyAgo(contract.createdAt) : 'Unknown'}
            </Text>
          </FlexCol>
        </FlexRow>
        <DeprecatedSignerBadge status={signerStatus} />
        <hr className='dashed' />
        <CopyRow label='address' value={contract.address} />
        <CopyRow label='script' value={contract.script} />
        {encoded ? <CopyRow label='parameters' value={encoded} /> : null}
      </FlexCol>
    </Shadow>
  )
}

function Section({
  title,
  contracts,
  signerSet,
}: {
  title: string
  contracts: Contract[]
  signerSet: SignerSet | null
}) {
  if (contracts.length === 0) return null
  return (
    <FlexCol gap='0.5rem'>
      <Text capitalize color='neutral-500' smaller>
        {title}
      </Text>
      {contracts.map((c) => (
        <ContractCard key={c.address} contract={c} signerSet={signerSet} />
      ))}
    </FlexCol>
  )
}

export default function Contracts() {
  const { svcWallet } = useContext(WalletContext)
  const { aspInfo } = useContext(AspContext)
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)

  // Build the operator's signer set once; each ContractCard classifies against
  // it. Guard the empty/unreachable default — signerSetFromInfo throws on a
  // blank signer pubkey.
  const signerSet = useMemo<SignerSet | null>(() => {
    if (!aspInfo?.signerPubkey) return null
    try {
      return signerSetFromInfo(aspInfo)
    } catch {
      return null
    }
  }, [aspInfo])

  useEffect(() => {
    if (!svcWallet) return
    const fetchContracts = async () => {
      try {
        const cm = await svcWallet.getContractManager()
        const data = await cm.getContracts()
        setContracts(data.slice().sort((a, b) => (a.state === b.state ? 0 : a.state === 'active' ? -1 : 1)))
      } catch (err) {
        consoleError(err)
      } finally {
        setLoading(false)
      }
    }
    fetchContracts()
  }, [svcWallet])

  if (!svcWallet || loading) return <LoadingLogo text='Loading...' />

  const active = contracts.filter((c) => c.state === 'active')
  const inactive = contracts.filter((c) => c.state !== 'active')

  return (
    <>
      <Header text='Contracts' back />
      <Content noRefresh>
        <Padded>
          <FlexCol className='scroll-fade'>
            {contracts.length === 0 ? (
              <TextSecondary>No contracts found.</TextSecondary>
            ) : (
              <FlexCol gap='2rem'>
                <Section title='Active' contracts={active} signerSet={signerSet} />
                <Section title='Inactive' contracts={inactive} signerSet={signerSet} />
              </FlexCol>
            )}
          </FlexCol>
        </Padded>
      </Content>
    </>
  )
}
