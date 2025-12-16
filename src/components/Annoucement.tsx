import Modal from './Modal'
import Button from './Button'
import FlexCol from './FlexCol'
import FlexRow from './FlexRow'
import OkIcon from '../icons/Ok'
import { useContext } from 'react'
import { SettingsOptions, Themes } from '../lib/types'
import BoltzIcon from '../icons/Boltz'
import Text, { TextSecondary } from './Text'
import { ConfigContext } from '../providers/config'
import LendasatIcon from '../screens/Apps/Lendasat/LendasatIcon'
import LendaSwapIcon from '../screens/Apps/Lendaswap/LendaswapIcon'
import { NavigationContext, Pages } from '../providers/navigation'
import NostrIcon from '../icons/Nostr'
import { OptionsContext } from '../providers/options'

// icon with pretty gradient background
const PrettyIcon = ({ color, icon }: { color?: string; icon: React.ReactNode }) => {
  const { config } = useContext(ConfigContext)
  const _color = color ?? (config.theme === Themes.Dark ? '#ffffff' : '#000000')
  const circle = 'circle at 50% -70%'
  const gradient = [_color + 'dd 0%', _color + '00 70%']
  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        height: '100px',
        marginTop: '-1rem',
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
      <Text>{point[0]}</Text>
      <TextSecondary>{point[1]}</TextSecondary>
    </FlexCol>
  </FlexRow>
)

const BulletList = ({ points }: { points: string[][] }) =>
  points ? (
    <FlexCol gap='0.5rem'>
      {points.map((point) => (
        <BulletPoint key={point[0]} point={point} />
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
        ['Explore Satellite Data Easily', 'View your historical satellite movement and stats right from your wallet.'],
        ['Track and Discover', 'Follow how your node interacts with others in the network over time.'],
        ['Visualized Data at a Glance', 'Access clean visualizations to understand trends in your Lightning activity.'],
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
        ['Explore Satellite Data Easily', 'View your historical satellite movement and stats right from your wallet.'],
        ['Track and Discover', 'Follow how your node interacts with others in the network over time.'],
        ['Visualized Data at a Glance', 'Access clean visualizations to understand trends in your Lightning activity.'],
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
      message='Swap Bitcoin to USDC instantly'
      bulletPoints={[
        ['Explore Satellite Data Easily', 'View your historical satellite movement and stats right from your wallet.'],
        ['Track and Discover', 'Follow how your node interacts with others in the network over time.'],
        ['Visualized Data at a Glance', 'Access clean visualizations to understand trends in your Lightning activity.'],
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
      message='Backup your wallet to Nostr.'
      bulletPoints={[
        ['Explore Satellite Data Easily', 'View your historical satellite movement and stats right from your wallet.'],
        ['Track and Discover', 'Follow how your node interacts with others in the network over time.'],
        ['Visualized Data at a Glance', 'Access clean visualizations to understand trends in your Lightning activity.'],
      ]}
    />
  )
}
