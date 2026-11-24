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
