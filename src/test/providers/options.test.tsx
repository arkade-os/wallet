import { act, cleanup, render, screen } from '@testing-library/react'
import { useContext } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { OptionsContext, OptionsProvider } from '../../providers/options'
import { subNavHandler } from '../../providers/navigation'
import { SettingsOptions } from '../../lib/types'

let setOptionFromProbe: (o: SettingsOptions) => void = () => {}

function OptionProbe() {
  const { option, setOption } = useContext(OptionsContext)
  setOptionFromProbe = setOption
  return <div data-testid='option-probe' data-option={option} />
}

const renderProvider = () =>
  render(
    <OptionsProvider>
      <OptionProbe />
    </OptionsProvider>,
  )

const visit = (...opts: SettingsOptions[]) => act(() => opts.forEach((o) => setOptionFromProbe(o)))

// NavigationProvider calls subNavHandler.goBack from its popstate handler
const back = () => act(() => subNavHandler.goBack(true))

const currentOption = () => screen.getByTestId('option-probe').getAttribute('data-option')

describe('OptionsProvider back navigation', () => {
  // setOptionFromProbe and subNavHandler are module-level and re-bound on each
  // render; unmounting runs the provider's effect teardown so no test sees the
  // previous test's handlers.
  afterEach(() => {
    cleanup()
  })

  it('returns to Lock when Password was opened from Lock (#656)', () => {
    renderProvider()
    visit(SettingsOptions.Lock, SettingsOptions.Password)

    back()
    expect(currentOption()).toBe(SettingsOptions.Lock)

    back()
    expect(currentOption()).toBe(SettingsOptions.Menu)
  })

  it('returns to Advanced when Password was opened from Advanced', () => {
    renderProvider()
    visit(SettingsOptions.Advanced, SettingsOptions.Password)

    back()
    expect(currentOption()).toBe(SettingsOptions.Advanced)
  })

  it('returns to the originating option for same-section jumps (Delegates → Vtxos)', () => {
    renderProvider()
    visit(SettingsOptions.Advanced, SettingsOptions.Delegates, SettingsOptions.Vtxos)

    back()
    expect(currentOption()).toBe(SettingsOptions.Delegates)

    back()
    expect(currentOption()).toBe(SettingsOptions.Advanced)
  })

  it('returns to Menu when Password was opened directly from outside Settings', () => {
    renderProvider()
    // the password nudge on the wallet home opens Password without going through Settings
    visit(SettingsOptions.Password)

    back()
    expect(currentOption()).toBe(SettingsOptions.Menu)
  })

  it('forgets the visited options after a reset', () => {
    renderProvider()
    visit(SettingsOptions.Advanced, SettingsOptions.Delegates)
    act(() => subNavHandler.reset())
    visit(SettingsOptions.Password)

    back()
    expect(currentOption()).toBe(SettingsOptions.Menu)

    // a stale stack would bring back Advanced here
    back()
    expect(currentOption()).toBe(SettingsOptions.Menu)
  })

  it('forgets the visited options after returning to Menu', () => {
    renderProvider()
    visit(SettingsOptions.Advanced, SettingsOptions.Delegates, SettingsOptions.Menu)
    visit(SettingsOptions.Password)

    back()
    expect(currentOption()).toBe(SettingsOptions.Menu)

    // a stale stack would bring back Delegates here
    back()
    expect(currentOption()).toBe(SettingsOptions.Menu)
  })
})
