import { useContext, useRef } from 'react'
import { Themes } from '../../lib/types'
import Select from '../../components/Select'
import Padded from '../../components/Padded'
import Content from '../../components/Content'
import { ConfigContext, resolveTheme } from '../../providers/config'
import Header from './Header'

export default function Theme() {
  const { backupConfig, config, effectiveTheme, systemTheme, updateConfig } = useContext(ConfigContext)
  const clickCoords = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  const handleChange = async (theme: string) => {
    const newConfig = { ...config, theme: theme as Themes }
    if (config.nostrBackup) await backupConfig(newConfig)

    const newEffective = resolveTheme(newConfig.theme)
    const shouldAnimate =
      newEffective !== effectiveTheme &&
      typeof document.startViewTransition === 'function' &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (shouldAnimate) {
      const { x, y } = clickCoords.current
      const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
      const root = document.documentElement
      root.style.setProperty('--ripple-x', `${x}px`)
      root.style.setProperty('--ripple-y', `${y}px`)
      root.style.setProperty('--ripple-radius', `${radius}px`)
      document.startViewTransition(() => updateConfig(newConfig))
    } else {
      updateConfig(newConfig)
    }
  }

  const options = [Themes.Auto, Themes.Dark, Themes.Light]
  const labels = options.map((option) =>
    option === Themes.Auto ? `Auto (${systemTheme})` : option,
  )

  return (
    <>
      <Header text='Theme' back />
      <Content>
        <Padded>
          <div onClickCapture={(e) => { clickCoords.current = { x: e.clientX, y: e.clientY } }}>
            <Select labels={labels} onChange={handleChange} options={options} selected={config.theme} />
          </div>
        </Padded>
      </Content>
    </>
  )
}
