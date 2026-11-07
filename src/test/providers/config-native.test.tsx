import { render } from '@testing-library/react'
import { useContext } from 'react'
import { beforeEach, expect, it, vi } from 'vitest'
import { ConfigContext, ConfigProvider } from '../../providers/config'
import { mockConfigContextValue } from '../screens/mocks'

vi.mock('../../lib/nativeBridge', () => ({ isNativeHost: () => true }))

let context: React.ContextType<typeof ConfigContext>
function Capture() {
  context = useContext(ConfigContext)
  return null
}
const mount = () =>
  render(
    <ConfigProvider>
      <Capture />
    </ConfigProvider>,
  )
beforeEach(() => localStorage.clear())

it('starts a fresh native profile on Mutinynet', () => {
  mount()
  expect(context.config.aspUrl).toBe('https://mutinynet.arkade.sh')
})

it('preserves an existing server and profile rather than silently moving networks', () => {
  localStorage.setItem(
    'config',
    JSON.stringify({ ...mockConfigContextValue.config, aspUrl: 'https://arkade.computer' }),
  )
  mount()
  expect(context.config.aspUrl).toBe('https://arkade.computer')
})
