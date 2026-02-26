import { useContext } from 'react'
import Text from './Text'
import { FlowContext } from '../providers/flow'
import { NavigationContext, Pages } from '../providers/navigation'

interface AssetAvatarProps {
  icon?: string
  ticker?: string
  name?: string
  size: number
  onError?: () => void
  assetId?: string
  clickable?: boolean
}

export default function AssetAvatar({ icon, ticker, name, size, onError, assetId, clickable }: AssetAvatarProps) {
  const { setAssetInfo } = useContext(FlowContext)
  const { navigate } = useContext(NavigationContext)

  const content = icon ? (
    <img
      src={icon}
      alt=''
      width={size}
      height={size}
      style={{ borderRadius: '50%', objectFit: 'cover', minWidth: size, minHeight: size }}
      onError={onError}
    />
  ) : (
    <div
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius: '50%',
        background: 'var(--dark20)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text tiny={size <= 16} smaller={size > 16 && size <= 32} big={size > 32}>
        {ticker?.[0] ?? name?.[0] ?? 'A'}
      </Text>
    </div>
  )

  if (!clickable || !assetId) return content

  return (
    <div
      onClick={() => {
        setAssetInfo({ assetId, supply: 0 })
        navigate(Pages.AppAssetDetail)
      }}
      style={{ cursor: 'pointer', transition: 'transform 0.1s', lineHeight: 0 }}
      onPointerDown={(e) => ((e.currentTarget as HTMLElement).style.transform = 'scale(0.95)')}
      onPointerUp={(e) => ((e.currentTarget as HTMLElement).style.transform = '')}
      onPointerLeave={(e) => ((e.currentTarget as HTMLElement).style.transform = '')}
    >
      {content}
    </div>
  )
}
