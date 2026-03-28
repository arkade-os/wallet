import { useContext, useState } from 'react'
import { createPortal } from 'react-dom'
import { WalletContext } from '../providers/wallet'
import Button from './Button'
import Text from './Text'

export default function BootError() {
  const { loadError, reloadWallet, dismissLoadError } = useContext(WalletContext)
  const [retrying, setRetrying] = useState(false)

  const handleRetry = async () => {
    setRetrying(true)
    try {
      await reloadWallet()
    } finally {
      setRetrying(false)
    }
  }

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--ion-background-color, #fff)',
        zIndex: 9,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
          maxWidth: '18rem',
          width: '100%',
          padding: '0 1rem',
        }}
      >
        <Text centered wrap heading>
          {loadError}
        </Text>
        <Button onClick={handleRetry} loading={retrying}>
          Retry
        </Button>
        <Button clear onClick={dismissLoadError}>
          Continue anyway
        </Button>
      </div>
    </div>,
    document.body,
  )
}
