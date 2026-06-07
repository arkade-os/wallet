import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Contract, encodeArkContract } from '@arkade-os/sdk'
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

function ContractCard({ contract }: { contract: Contract }) {
  const encoded = useMemo(() => {
    try {
      return encodeArkContract(contract)
    } catch {
      return ''
    }
  }, [contract])

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
        <hr className='dashed' />
        <CopyRow label='address' value={contract.address} />
        <CopyRow label='script' value={contract.script} />
        {encoded ? <CopyRow label='parameters' value={encoded} /> : null}
      </FlexCol>
    </Shadow>
  )
}

function Section({ title, contracts }: { title: string; contracts: Contract[] }) {
  if (contracts.length === 0) return null
  return (
    <FlexCol gap='0.5rem'>
      <Text capitalize color='neutral-500' smaller>
        {title}
      </Text>
      {contracts.map((c) => (
        <ContractCard key={c.address} contract={c} />
      ))}
    </FlexCol>
  )
}

export default function Contracts() {
  const { walletReady, advanced } = useContext(WalletContext)
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!walletReady) return
    const fetchContracts = async () => {
      try {
        const cm = await advanced.getContractManager()
        const data = await cm.getContracts()
        setContracts(data.slice().sort((a, b) => (a.state === b.state ? 0 : a.state === 'active' ? -1 : 1)))
      } catch (err) {
        consoleError(err)
      } finally {
        setLoading(false)
      }
    }
    fetchContracts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletReady])

  if (!walletReady || loading) return <LoadingLogo text='Loading...' />

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
                <Section title='Active' contracts={active} />
                <Section title='Inactive' contracts={inactive} />
              </FlexCol>
            )}
          </FlexCol>
        </Padded>
      </Content>
    </>
  )
}
