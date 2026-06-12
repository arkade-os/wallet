import { CSSProperties, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Contract, encodeArkContract } from '@arkade-os/sdk'
import Header from './Header'
import Content from '../../components/Content'
import Padded from '../../components/Padded'
import FlexCol from '../../components/FlexCol'
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
import { cn } from '../../lib/utils'

type ContractStat = {
  label: string
  value: number
}

function stateLabel(state: Contract['state']) {
  return state === 'active' ? 'Active' : 'Inactive'
}

function CopyField({ label, value }: { label: string; value: string }) {
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
    <button type='button' className='contract-copy-field' onClick={handleCopy} aria-label={`Copy ${label}`}>
      <span className='contract-copy-field__text'>
        <span className='contract-copy-field__label'>{label}</span>
        <span className='contract-copy-field__value'>{prettyLongText(value, 14)}</span>
      </span>
      <span
        className={cn('contract-copy-field__icon', copied && 'contract-copy-field__icon--copied')}
        aria-hidden='true'
      >
        {copied ? <CheckMarkIcon /> : <CopyIcon />}
      </span>
    </button>
  )
}

function ContractSummary({ stats }: { stats: ContractStat[] }) {
  return (
    <section className='contract-summary' aria-label='Contract summary'>
      {stats.map((stat) => (
        <div className='contract-summary__item' key={stat.label}>
          <span className='contract-summary__value'>{stat.value}</span>
          <span className='contract-summary__label'>{stat.label}</span>
        </div>
      ))}
    </section>
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

  const title = contract.label || contract.type
  const subtitle = contract.label ? contract.type : 'contract'
  const paramsCount = Object.keys(contract.params).length
  const createdAt = contract.createdAt ? prettyAgo(contract.createdAt) : 'Unknown'

  return (
    <article className='contract-card'>
      <header className='contract-card__header'>
        <span className='contract-card__identity'>
          <span className='contract-card__title'>{title}</span>
          <span className='contract-card__subtitle'>{subtitle}</span>
        </span>
        <span className='contract-card__meta'>
          <span className={cn('contract-card__status', `contract-card__status--${contract.state}`)}>
            {stateLabel(contract.state)}
          </span>
          <span className='contract-card__age'>{createdAt}</span>
        </span>
      </header>

      <div className='contract-card__stats' aria-label={`${title} details`}>
        <span>
          <span>Params</span>
          <strong>{paramsCount}</strong>
        </span>
        <span>
          <span>Script bytes</span>
          <strong>{Math.floor(contract.script.length / 2)}</strong>
        </span>
      </div>

      <div className='contract-card__fields'>
        <CopyField label='Address' value={contract.address} />
        <CopyField label='Script' value={contract.script} />
        {encoded ? <CopyField label='Encoded contract' value={encoded} /> : null}
      </div>
    </article>
  )
}

function Section({ title, contracts }: { title: string; contracts: Contract[] }) {
  if (contracts.length === 0) return null
  return (
    <FlexCol gap='0.75rem'>
      <div className='contract-section-heading'>
        <Text capitalize color='neutral-500' smaller>
          {title}
        </Text>
        <span>{contracts.length}</span>
      </div>
      {contracts.map((c, index) => (
        <div
          className='contract-card-frame'
          style={{ '--contract-card-index': index } as CSSProperties}
          key={c.address}
        >
          <ContractCard contract={c} />
        </div>
      ))}
    </FlexCol>
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

  const active = contracts.filter((c) => c.state === 'active')
  const inactive = contracts.filter((c) => c.state !== 'active')
  const stats: ContractStat[] = [
    { label: 'Total', value: contracts.length },
    { label: 'Active', value: active.length },
    { label: 'Inactive', value: inactive.length },
  ]

  return (
    <>
      <Header text='Contracts' back />
      <Content noRefresh>
        <Padded>
          <FlexCol gap='1.25rem' className='scroll-fade'>
            <FlexCol gap='0.75rem'>
              <TextSecondary>
                Contracts define addresses and scripts used by wallet flows, delegates, swaps, and default receiving.
              </TextSecondary>
              <ContractSummary stats={stats} />
            </FlexCol>
            {contracts.length === 0 ? (
              <div className='contract-empty-state'>
                <TextSecondary centered>No contracts found.</TextSecondary>
              </div>
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
