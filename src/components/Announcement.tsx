import Modal from './Modal'
import Button from './Button'
import FlexCol from './FlexCol'
import FlexRow from './FlexRow'
import OkIcon from '../icons/Ok'
import { useContext } from 'react'
import NostrIcon from '../icons/Nostr'
import BoltzIcon from '../icons/Boltz'
import Text, { TextSecondary } from './Text'
import { ConfigContext } from '../providers/config'
import { OptionsContext } from '../providers/options'
import { SettingsOptions, Themes } from '../lib/types'
import LendasatIcon from '../screens/Apps/Lendasat/LendasatIcon'
import LendaSwapIcon from '../screens/Apps/Lendaswap/LendaswapIcon'
import { NavigationContext, Pages } from '../providers/navigation'

// icon with pretty gradient background
const PrettyIcon = ({ color, icon }: { color?: string; icon: React.ReactNode }) => {
  const { config } = useContext(ConfigContext)
  const defaultColor = config.theme === Themes.Dark ? '#ffffff' : '#000000'
  const _color = color?.startsWith('#') ? color : defaultColor
  const circle = 'circle at 50% -70%'
  const gradient = [_color + 'dd 0%', _color + '00 70%']
  return (
    <div
      style={{
        width: 'calc(100% + 2rem)',
        display: 'flex',
        height: '100px',
        margin: '-1rem -1rem 0 -1rem',
        alignItems: 'center',
        justifyContent: 'center',
        background: `radial-gradient(${circle}, ${gradient.join(', ')})`,
      }}
    >
      {icon}
    </div>
  )
}

const Tag = ({ text }: { text: string }) => (
  <div
    style={{
      fontWeight: 400,
      lineHeight: '140%',
      marginTop: '0.5rem',
      fontStyle: 'normal',
      fontSize: '0.75rem',
      borderRadius: '1000px',
      display: 'inline-block',
      padding: '0.25rem 0.75rem',
      color: 'var(--white)',
      backgroundColor: 'var(--purple)',
    }}
  >
    Introducing: {text}
  </div>
)

const BulletPoint = ({ point }: { point: string[] }) => (
  <FlexRow alignItems='flex-start' gap='0.5rem'>
    <div style={{ paddingTop: '0.2rem' }}>
      <OkIcon />
    </div>
    <FlexCol gap='0'>
      <Text>{point[0] ?? ''}</Text>
      {point[1] ? <TextSecondary>{point[1]}</TextSecondary> : null}
    </FlexCol>
  </FlexRow>
)

const BulletList = ({ points }: { points: string[][] }) =>
  points ? (
    <FlexCol gap='0.5rem'>
      {points.map((point, index) => (
        // eslint-disable-next-line react/no-array-index-key
        <BulletPoint key={`${point[0]}-${index}`} point={point} />
      ))}
    </FlexCol>
  ) : null

interface AnnouncementProps {
  page?: Pages
  title: string
  color?: string
  message: string
  close: () => void
  icon: React.ReactNode
  option?: SettingsOptions
  bulletPoints: string[][]
}

export default function Announcement({
  page,
  color,
  title,
  message,
  close,
  icon,
  option,
  bulletPoints,
}: AnnouncementProps) {
  const { navigate } = useContext(NavigationContext)
  const { setOption } = useContext(OptionsContext)

  const handleTryIt = () => {
    if (page) navigate(page)
    else if (option) {
      setOption(option)
      navigate(Pages.Settings)
    }
    close()
  }

  return (
    <Modal>
      <FlexCol gap='1.5rem'>
        <FlexCol centered>
          <PrettyIcon color={color} icon={icon} />
        </FlexCol>
        <FlexCol centered gap='0.5rem'>
          <Tag text={title} />
          <Text big bold centered wrap>
            {message}
          </Text>
        </FlexCol>
        <FlexCol gap='0.75rem'>
          <TextSecondary>What you can do:</TextSecondary>
          <BulletList points={bulletPoints} />
        </FlexCol>
        <FlexCol gap='0.25rem'>
          <Button onClick={handleTryIt} label={`Try ${title}`} />
          <Button onClick={close} label='Maybe later' secondary />
        </FlexCol>
      </FlexCol>
    </Modal>
  )
}

export function BoltzAnnouncement({ close }: { close: () => void }) {
  return (
    <Announcement
      close={close}
      title='Boltz'
      color='#ffe96d'
      page={Pages.AppBoltz}
      icon={<BoltzIcon big />}
      message='Lightning that works.'
      bulletPoints={[
        ['Bridge', 'Swap between different Bitcoin layers while staying in full control.'],
        ['Fast', 'Boltz utilizes Layer 2 scaling technologies like the Lightning Network.'],
        ['Safe', 'Swaps on Boltz are atomic, cryptography ensures that users are always in control of their money.'],
      ]}
    />
  )
}

export function LendaSatAnnouncement({ close }: { close: () => void }) {
  return (
    <Announcement
      close={close}
      title='LendaSat'
      page={Pages.AppLendasat}
      icon={<LendasatIcon big />}
      message='Borrow against your sats.'
      bulletPoints={[
        [
          'Choose a loan',
          'Pick your preferred loan terms from a list of offers or post your own loan request. We will find you the right match.',
        ],
        [
          'Lock your Bitcoin',
          'Lock Bitcoin worth more than your loan amount as collateral. Your Bitcoin stays safe while you get the cash you need.',
        ],
        [
          'Receive the funds',
          'Get your loan instantly via your preferred method: bank transfer, stablecoins (USDT/USDC), or VISA card.',
        ],
      ]}
    />
  )
}

export function LendaSwapAnnouncement({ close }: { close: () => void }) {
  return (
    <Announcement
      close={close}
      title='LendaSwap'
      page={Pages.AppLendaswap}
      icon={<LendaSwapIcon big />}
      message='Swap Bitcoin to USDC.'
      bulletPoints={[
        ['Swap to stablecoins', 'Swap native $BTC for $USDT or $USDC on Ethereum and Polygon.'],
        [
          'Trustless Atomic Swaps',
          'When a swap is started, both parties lock their funds in smart contracts. The swap either completes fully or both parties get refunded.',
        ],
        ['Self-custodial', 'LendaSwap is fully self-custodial. Your keys, your coins.'],
      ]}
    />
  )
}

export function NostrBackupsAnnouncement({ close }: { close: () => void }) {
  return (
    <Announcement
      close={close}
      title='Nostr Backups'
      option={SettingsOptions.Backup}
      icon={<NostrIcon big />}
      message='Backup to Nostr.'
      bulletPoints={[
        ['Backup settings', 'Have your Arkade wallet settings safely backed up on Nostr.'],
        ['Boltz swaps', 'Easily restore your Boltz swap history if you switch devices.'],
        ['Secure', 'All backups are encrypted and stored securely on the Nostr network.'],
      ]}
    />
  )
}
