import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { useContext } from 'react'
import { ConfigContext, ConfigProvider } from '../../providers/config'
import { readConfigFromStorage } from '../../lib/storage'

describe('ConfigProvider executor flag', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    localStorage.clear()
  })

  it('lets the build switch override a stored executor value', async () => {
    localStorage.setItem('config', JSON.stringify({ executor: true }))
    vi.stubEnv('VITE_EXECUTOR_ENABLED', 'false')

    let executor: boolean | undefined
    const Probe = () => {
      const { config, configLoaded } = useContext(ConfigContext)
      if (configLoaded) executor = config.executor
      return null
    }
    render(
      <ConfigProvider>
        <Probe />
      </ConfigProvider>,
    )

    await waitFor(() => expect(executor).toBe(false))
    expect(readConfigFromStorage()?.executor).toBe(false)
  })
})

describe('ConfigProvider operator URL', () => {
  afterEach(() => localStorage.clear())

  it('reads the operator URL that older builds stored as aspUrl', async () => {
    localStorage.setItem('config', JSON.stringify({ aspUrl: 'https://operator.example' }))

    let operatorUrl: string | undefined
    const Probe = () => {
      const { config, configLoaded } = useContext(ConfigContext)
      if (configLoaded) operatorUrl = config.operatorUrl
      return null
    }
    render(
      <ConfigProvider>
        <Probe />
      </ConfigProvider>,
    )

    await waitFor(() => expect(operatorUrl).toBe('https://operator.example'))
    expect(readConfigFromStorage()?.operatorUrl).toBe('https://operator.example')
    expect(readConfigFromStorage()).not.toHaveProperty('aspUrl')
  })
})
