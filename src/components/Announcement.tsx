import Modal from './Modal'
import Button from './Button'
import FlexCol from './FlexCol'
import FlexRow from './FlexRow'
import OkIcon from '../icons/Ok'
import { useContext, useState } from 'react'
import NostrIcon from '../icons/Nostr'
import Text, { TextSecondary } from './Text'
import { ConfigContext } from '../providers/config'
import { OptionsContext } from '../providers/options'
import { SettingsOptions, Themes } from '../lib/types'
import LendasatIcon from '../screens/Apps/Lendasat/LendasatIcon'
import SatoraIcon from '../screens/Apps/Satora/SatoraIcon'
import { NavigationContext, Pages } from '../providers/navigation'
import { useTranslation } from '../providers/language'

// icon with pretty gradient background
const PrettyIcon = ({ color, icon }: { color?: string; icon: React.ReactNode }) => {
  const { effectiveTheme } = useContext(ConfigContext)
  const defaultColor = effectiveTheme === Themes.Dark ? '#ffffff' : '#000000'
  const _color = color?.startsWith('#') ? color : defaultColor
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

const Tag = ({ text }: { text: string }) => {
  const { t } = useTranslation()
  return (
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
      {t('announcement.introducing', { title: text })}
    </div>
  )
}

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
  const { t } = useTranslation()
  const [open, setOpen] = useState(true)

  const handleTryIt = () => {
    if (page) navigate(page)
    else if (option) {
      setOption(option)
      navigate(Pages.Settings)
    }
    close()
  }

  return (
    <Modal open={open} onOpenChange={setOpen} onExitComplete={close}>
      <div style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Note: the negative margin on the container is to offset the negative margin top of PrettyIcon class.*/}
        <div
          style={{ overflowY: 'auto', flex: '1 1 auto', minHeight: 0, marginTop: '-1rem', padding: '1rem 1rem 0 1rem' }}
        >
          <FlexCol gap='1.5rem'>
            <FlexCol centered>
              <PrettyIcon color={color} icon={icon} />
            </FlexCol>
            <FlexCol centered gap='0.5rem'>
              <Tag text={title} />
              <Text big medium centered wrap heading>
                {message}
              </Text>
            </FlexCol>
            <FlexCol gap='0.75rem'>
              <TextSecondary>{t('announcement.whatYouCanDo')}</TextSecondary>
              <BulletList points={bulletPoints} />
            </FlexCol>
          </FlexCol>
        </div>
        <FlexCol gap='0.25rem'>
          <Button onClick={handleTryIt} label={t('announcement.tryTitle', { title })} />
          <Button onClick={() => setOpen(false)} label={t('announcement.maybeLater')} secondary />
        </FlexCol>
      </div>
    </Modal>
  )
}

export function LendaSatAnnouncement({ close }: { close: () => void }) {
  const { t } = useTranslation()
  return (
    <Announcement
      close={close}
      title='LendaSat'
      page={Pages.AppLendasat}
      icon={<LendasatIcon big />}
      message={t('announcement.lendasatMessage')}
      bulletPoints={[
        [t('announcement.lendasatPoint1Title'), t('announcement.lendasatPoint1Body')],
        [t('announcement.lendasatPoint2Title'), t('announcement.lendasatPoint2Body')],
        [t('announcement.lendasatPoint3Title'), t('announcement.lendasatPoint3Body')],
      ]}
    />
  )
}

export function SatoraAnnouncement({ close }: { close: () => void }) {
  const { t } = useTranslation()
  return (
    <Announcement
      close={close}
      title='Satora'
      page={Pages.AppSatora}
      icon={<SatoraIcon big />}
      message={t('announcement.satoraMessage')}
      bulletPoints={[
        [t('announcement.satoraPoint1Title'), t('announcement.satoraPoint1Body')],
        [t('announcement.satoraPoint2Title'), t('announcement.satoraPoint2Body')],
        [t('announcement.satoraPoint3Title'), t('announcement.satoraPoint3Body')],
      ]}
    />
  )
}

export function NostrBackupsAnnouncement({ close }: { close: () => void }) {
  const { t } = useTranslation()
  return (
    <Announcement
      close={close}
      title='Nostr Backups'
      option={SettingsOptions.Backup}
      icon={<NostrIcon big />}
      message={t('announcement.nostrMessage')}
      bulletPoints={[
        [t('announcement.nostrPoint1Title'), t('announcement.nostrPoint1Body')],
        [t('announcement.nostrPoint2Title'), t('announcement.nostrPoint2Body')],
      ]}
    />
  )
}
