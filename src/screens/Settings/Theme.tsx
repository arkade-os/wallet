import { useContext, useRef } from 'react'
import { Themes } from '../../lib/types'
import Select from '../../components/Select'
import Padded from '../../components/Padded'
import Content from '../../components/Content'
import { ConfigContext, resolveTheme } from '../../providers/config'
import Header from './Header'

export default function Theme() {
  const { backupConfig, config, effectiveTheme, systemTheme, updateConfig } = useContext(ConfigContext)
  const clickCoords = useRef<{ x: number; y: number } | null>(null)

  const handleChange = async (theme: string) => {
    const newConfig = { ...config, theme: theme as Themes }
    if (config.nostrBackup) await backupConfig(newConfig)

    const coords = clickCoords.current
    const newEffective = resolveTheme(newConfig.theme)
    const shouldAnimate =
      coords &&
      newEffective !== effectiveTheme &&
      typeof document.startViewTransition === 'function' &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (shouldAnimate) {
      const { x, y } = coords
      const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
      const root = document.documentElement
      root.style.setProperty('--ripple-x', `${x}px`)
      root.style.setProperty('--ripple-y', `${y}px`)
      root.style.setProperty('--ripple-radius', `${radius}px`)
      root.style.viewTransitionName = 'theme-ripple'
      const transition = document.startViewTransition(() => updateConfig(newConfig))
      transition.finished.then(() => {
        root.style.viewTransitionName = ''
      })
    } else {
      updateConfig(newConfig)
    }
  }

  const options = [Themes.Auto, Themes.Dark, Themes.Light]
  const labels = options.map((option) => (option === Themes.Auto ? `Auto (${systemTheme})` : option))

  return (
    <>
      <Header text='Theme' back />
      <Content>
        <Padded>
          <div
            onClickCapture={(e) => {
              clickCoords.current = { x: e.clientX, y: e.clientY }
            }}
          >
            <Select labels={labels} onChange={handleChange} options={options} selected={config.theme} />
          </div>
        </Padded>
      </Content>
    </>
  )
}
