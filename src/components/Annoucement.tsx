import Modal from './Modal'
import Button from './Button'
import FlexCol from './FlexCol'
import FlexRow from './FlexRow'
import OkIcon from '../icons/Ok'
import BoltzIcon from '../icons/Boltz'
import Text, { TextSecondary } from './Text'

const PrettyIcon = ({ color, icon }: { color: string; icon: React.ReactNode }) => {
  const circle = 'circle at 50% -70%'
  const gradient = [color + 'dd 0%', color + '77 30%', color + '00 60%']
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
      color: 'var(--ion-text-color)',
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

interface AnnouncementProps {
  color: string
  title: string
  message: string
  close: () => void
  icon: React.ReactNode
  bulletPoints: string[][]
}

export default function Announcement({ color, title, message, close, icon, bulletPoints }: AnnouncementProps) {
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
          {bulletPoints ? bulletPoints.map((point) => <BulletPoint key={point[0]} point={point} />) : null}
        </FlexCol>
        <FlexCol gap='0.25rem'>
          <Button onClick={() => {}} label={`Try ${title}`} />
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
      color='#ffe96d'
      icon={<BoltzIcon big />}
      title='Boltz'
      message='Lightning that works.'
      bulletPoints={[
        ['Explore Satellite Data Easily', 'View your historical satellite movement and stats right from your wallet.'],
        ['Track and Discover', 'Follow how your node interacts with others in the network over time.'],
        ['Visualized Data at a Glance', 'Access clean visualizations to understand trends in your Lightning activity.'],
      ]}
    />
  )
}
