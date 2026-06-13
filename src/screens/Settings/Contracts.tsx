import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  Contract,
  encodeArkContract,
  signerSetFromInfo,
  classifyAgainstSignerSet,
  type SignerSet,
  type SignerStatus,
} from '@arkade-os/sdk'
import { bech32m, hex } from '@scure/base'
import Header from './Header'
import Content from '../../components/Content'
import Padded from '../../components/Padded'
import FlexCol from '../../components/FlexCol'
import FlexRow from '../../components/FlexRow'
import Shadow from '../../components/Shadow'
import Text, { TextSecondary } from '../../components/Text'
import LoadingLogo from '../../components/LoadingLogo'
import Input from '../../components/Input'
import SegmentedControl from '../../components/SegmentedControl'
import CopyIcon from '../../icons/Copy'
import CheckMarkIcon from '../../icons/CheckMark'
import ChevronDownIcon from '../../icons/ChevronDown'
import ChevronUpIcon from '../../icons/ChevronUp'
import { WalletContext } from '../../providers/wallet'
import { AspContext } from '../../providers/asp'
import { prettyAgo, prettyLongText } from '../../lib/format'
import { copyToClipboard } from '../../lib/clipboard'
import { hapticSubtle } from '../../lib/haptics'
import { useToast } from '../../components/Toast'
import { consoleError } from '../../lib/logs'

// A boarding contract lives on-chain, so its `script` is a P2TR scriptPubKey
// (OP_1 PUSH32 <x-only output key> = `5120<64 hex>`). Re-encode that witness
// program as a bech32m address with the chain HRP so the row shows a Bitcoin
// Taproot address (bc1p/tb1p/bcrt1p) instead of the Arkade encoding.
function onchainTaprootAddress(script: string, network: string): string | null {
  if (!/^5120[0-9a-f]{64}$/i.test(script)) return null
  try {
    const program = hex.decode(script.slice(4))
    const hrp = network === 'bitcoin' ? 'bc' : network === 'regtest' ? 'bcrt' : 'tb'
    return bech32m.encode(hrp, [1, ...bech32m.toWords(program)])
  } catch {
    return null
  }
}

function displayAddress(contract: Contract, network: string): string {
  if (contract.type === 'boarding') return onchainTaprootAddress(contract.script, network) ?? contract.address
  return contract.address
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

// Pre-computed view model for one contract: display address, encoded params,
// signer status, and a lowercased haystack for the search box.
interface ContractView {
  contract: Contract
  address: string
  encoded: string
  status: SignerStatus | null
  search: string
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

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '0.3rem 0.7rem',
        borderRadius: '999px',
        cursor: 'pointer',
        border: '1px solid var(--neutral-100)',
        backgroundColor: active ? 'var(--neutral-100)' : 'transparent',
        WebkitTapHighlightColor: 'transparent',
        whiteSpace: 'nowrap',
      }}
    >
      <Text tiny color={active ? 'text' : 'neutral-500'}>
        {label}
      </Text>
    </div>
  )
}

function ContractCard({ item, open, onToggle }: { item: ContractView; open: boolean; onToggle: () => void }) {
  const { contract, address, encoded, status } = item

  return (
    <Shadow border>
      <FlexCol gap={open ? '0.5rem' : '0'}>
        {/* Compact, tappable summary — expands to the full address/script/parameters. */}
        <FlexRow between onClick={onToggle}>
          <FlexCol gap='0'>
            <Text small>{contract.label || contract.type}</Text>
            <Text tiny color='neutral-500'>
              {prettyLongText(address)}
            </Text>
            <DeprecatedSignerBadge status={status} />
          </FlexCol>
          <FlexRow gap='0.5rem'>
            <FlexCol gap='0' end>
              <Text tiny color={contract.state === 'active' ? 'green' : 'neutral-500'}>
                {contract.state}
              </Text>
              <Text tiny color='neutral-500'>
                {contract.createdAt ? prettyAgo(contract.createdAt) : 'Unknown'}
              </Text>
            </FlexCol>
            {open ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </FlexRow>
        </FlexRow>
        {open ? (
          <>
            <hr className='dashed' />
            <CopyRow label='address' value={address} />
            <CopyRow label='script' value={contract.script} />
            {encoded ? <CopyRow label='parameters' value={encoded} /> : null}
          </>
        ) : null}
      </FlexCol>
    </Shadow>
  )
}

export default function Contracts() {
  const { svcWallet } = useContext(WalletContext)
  const { aspInfo } = useContext(AspContext)
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('Active')
  const [typeFilter, setTypeFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [openSet, setOpenSet] = useState<Set<string>>(new Set())
  const parentRef = useRef<HTMLDivElement>(null)

  const network = aspInfo?.network ?? ''

  // Build the operator's signer set once; each card classifies against it.
  // Guard the empty/unreachable default — signerSetFromInfo throws on a blank
  // signer pubkey.
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

  // Enrich once per data/signer change: display address, encoded params, signer
  // status, and a search haystack.
  const views = useMemo<ContractView[]>(
    () =>
      contracts.map((contract) => {
        let encoded = ''
        try {
          encoded = encodeArkContract(contract)
        } catch {
          encoded = ''
        }
        const address = displayAddress(contract, network)
        const status = contractSignerStatus(contract, signerSet)
        const search = [contract.type, contract.label, address, contract.address, contract.script, encoded]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return { contract, address, encoded, status, search }
      }),
    [contracts, network, signerSet],
  )

  const types = useMemo(() => ['all', ...Array.from(new Set(contracts.map((c) => c.type)))], [contracts])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return views.filter((v) => {
      const active = v.contract.state === 'active'
      if (tab === 'Active' ? !active : active) return false
      if (typeFilter !== 'all' && v.contract.type !== typeFilter) return false
      if (q && !v.search.includes(q)) return false
      return true
    })
  }, [views, tab, typeFilter, query])

  // Virtualize the list so it stays smooth with many contracts. Row heights vary
  // (collapsed vs expanded, optional badge) so heights are measured dynamically;
  // open state lives here, keyed by address, to survive rows scrolling out.
  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 84,
    overscan: 8,
    getItemKey: (i) => filtered[i].contract.address,
  })

  const toggleOpen = (address: string) =>
    setOpenSet((prev) => {
      const next = new Set(prev)
      if (next.has(address)) next.delete(address)
      else next.add(address)
      return next
    })

  if (!svcWallet || loading) return <LoadingLogo text='Loading...' />

  return (
    <>
      <Header text='Contracts' back />
      <Content noRefresh noFade>
        <Padded>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'stretch',
              gap: '0.75rem',
              height: '100%',
              width: '100%',
            }}
          >
            <Input placeholder='Search type, address, script…' value={query} onChange={setQuery} />
            <SegmentedControl options={['Active', 'Inactive']} selected={tab} onChange={setTab} />
            {types.length > 2 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {types.map((t) => (
                  <Chip key={t} label={t} active={typeFilter === t} onClick={() => setTypeFilter(t)} />
                ))}
              </div>
            ) : null}
            <TextSecondary>
              {filtered.length} {filtered.length === 1 ? 'contract' : 'contracts'}
            </TextSecondary>
            {filtered.length === 0 ? (
              <TextSecondary>No contracts found.</TextSecondary>
            ) : (
              <div
                ref={parentRef}
                className='hide-scrollbar'
                style={{ flex: 1, minHeight: '120px', overflowY: 'auto' }}
              >
                <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative', width: '100%' }}>
                  {virtualizer.getVirtualItems().map((vi) => {
                    const item = filtered[vi.index]
                    return (
                      <div
                        key={vi.key}
                        data-index={vi.index}
                        ref={virtualizer.measureElement}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          transform: `translateY(${vi.start}px)`,
                          paddingBottom: '0.5rem',
                        }}
                      >
                        <ContractCard
                          item={item}
                          open={openSet.has(item.contract.address)}
                          onToggle={() => toggleOpen(item.contract.address)}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </Padded>
      </Content>
    </>
  )
}
