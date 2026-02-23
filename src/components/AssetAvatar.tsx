import Text from './Text'

interface AssetAvatarProps {
  icon?: string
  ticker?: string
  name?: string
  size: number
  onError?: () => void
}

export default function AssetAvatar({ icon, ticker, name, size, onError }: AssetAvatarProps) {
  if (icon) {
    return <img src={icon} alt='' width={size} height={size} style={{ borderRadius: '50%' }} onError={onError} />
  }

  return (
    <div
      style={{
        width: size,
        height: size,
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
}
