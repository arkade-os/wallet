import { useContext, useEffect, useRef, useState } from 'react'
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
import { prettyLongText } from '../../lib/format'
import { copyToClipboard } from '../../lib/clipboard'
import { hapticSubtle } from '../../lib/haptics'
import { useToast } from '../../components/Toast'
import { consoleError } from '../../lib/logs'

const cardStyle: React.CSSProperties = {
  backgroundColor: 'var(--neutral-100)',
  border: '1px solid var(--neutral-200)',
  borderRadius: '0.25rem',
  padding: '10px',
  width: '100%',
}

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
  return (
    <div style={cardStyle}>
      <FlexCol gap='0.5rem'>
        <FlexRow between>
          <Text>{contract.type}</Text>
          <Text tiny color={contract.state === 'active' ? 'green' : 'neutral-500'}>
            {contract.state}
          </Text>
        </FlexRow>
        <hr className='dashed' />
        <CopyRow label='address' value={contract.address} />
        <CopyRow label='script' value={contract.script} />
        <CopyRow label='parameters' value={encodeArkContract(contract)} />
      </FlexCol>
    </div>
  )
}

export default function Contracts() {
  const { svcWallet } = useContext(WalletContext)
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)

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

  return (
    <>
      <Header text='Contracts' back />
      <Content noRefresh>
        <Padded>
          <FlexCol className='scroll-fade'>
            <FlexCol gap='0.5rem'>
              {contracts.map((c) => (
                <ContractCard key={c.script} contract={c} />
              ))}
            </FlexCol>
          </FlexCol>
        </Padded>
      </Content>
    </>
  )
}
