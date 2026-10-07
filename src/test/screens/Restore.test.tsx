import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Restore from '../../screens/Init/Restore'
import { ConfigContext } from '../../providers/config'
import { NavigationContext } from '../../providers/navigation'
import { FlowContext } from '../../providers/flow'
import { AspContext } from '../../providers/asp'
import { DevModeContext } from '../../providers/devMode'
import { BackupContext } from '../../providers/backup'
import {
  mockConfigContextValue,
  mockNavigationContextValue,
  mockFlowContextValue,
  mockAspContextValue,
  mockDevModeContextValue,
} from './mocks'

const validMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const privateKeyHex = 'aa'.repeat(32)

function renderRestore(devMode: boolean) {
  const backupContextValue = {
    restore: vi.fn().mockResolvedValue(undefined),
  }

  const view = render(
    <DevModeContext.Provider value={{ ...mockDevModeContextValue, devMode }}>
      <ConfigContext.Provider value={mockConfigContextValue as any}>
        <AspContext.Provider value={mockAspContextValue as any}>
          <NavigationContext.Provider value={mockNavigationContextValue as any}>
            <FlowContext.Provider value={mockFlowContextValue as any}>
              <BackupContext.Provider value={backupContextValue as any}>
                <Restore />
              </BackupContext.Provider>
            </FlowContext.Provider>
          </NavigationContext.Provider>
        </AspContext.Provider>
      </ConfigContext.Provider>
    </DevModeContext.Provider>,
  )
  return { ...view, restore: backupContextValue.restore }
}

const typeKey = (value: string) => {
  fireEvent.change(screen.getByRole('combobox'), { target: { value } })
}

describe('Restore screen — rotation control gating', () => {
  it('does not show the rotation control when dev mode is off, even for a valid mnemonic', async () => {
    renderRestore(false)
    typeKey(validMnemonic)
    // give the detection effect a chance to run
    expect(await screen.findByText(/Do not\s+share it with anyone\./)).toBeInTheDocument()
    expect(screen.queryByText('Address rotation')).not.toBeInTheDocument()
  })

  it('shows the rotation control when dev mode is on and a valid mnemonic is detected', async () => {
    renderRestore(true)
    typeKey(validMnemonic)
    expect(await screen.findByText('Address rotation')).toBeInTheDocument()
    expect(screen.getByText('Inherit')).toBeInTheDocument()
  })

  it('does not show the rotation control for a private key, even in dev mode', async () => {
    renderRestore(true)
    typeKey(privateKeyHex)
    expect(await screen.findByText(/Do not\s+share it with anyone\./)).toBeInTheDocument()
    expect(screen.queryByText('Address rotation')).not.toBeInTheDocument()
  })
})

describe('Restore input and validation', () => {
  it('offers explicit suggestions without changing a unique prefix or showing an error', async () => {
    const user = userEvent.setup()
    renderRestore(false)
    const input = screen.getByRole('combobox')
    await user.type(input, 'ah')
    expect(input).toHaveValue('ah')
    expect(input).toHaveAttribute('aria-invalid', 'false')
    await user.click(await screen.findByRole('option', { name: 'ahead' }))
    expect(input).toHaveValue('ahead ')
    expect(input).toHaveFocus()
    expect(input).toHaveAttribute('aria-invalid', 'false')
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled()
  })

  it('lets keyboard users choose a suggestion without submitting', async () => {
    const user = userEvent.setup()
    const { restore } = renderRestore(false)
    const input = screen.getByRole('combobox')
    await user.type(input, 'aban')
    await user.keyboard('{ArrowDown}{Enter}')
    expect(input).toHaveValue('abandon ')
    expect(restore).not.toHaveBeenCalled()
    expect(input).toHaveAttribute('aria-invalid', 'false')
  })

  it('preserves manual typing, deletion and a pasted phrase', async () => {
    const user = userEvent.setup()
    renderRestore(false)
    const input = screen.getByRole('combobox')
    await user.type(input, 'ahead')
    expect(input).toHaveValue('ahead')
    await user.keyboard('{Backspace}')
    expect(input).toHaveValue('ahea')
    await user.clear(input)
    await user.paste(validMnemonic)
    expect(input).toHaveValue(validMnemonic)
    expect(input).toHaveAttribute('aria-invalid', 'false')
  })

  it('shows a word error only after finishing that word and clears it when corrected', async () => {
    const user = userEvent.setup()
    renderRestore(false)
    const input = screen.getByRole('combobox')
    await user.type(input, 'abnadon')
    expect(input).toHaveAttribute('aria-invalid', 'false')
    await user.keyboard(' ')
    expect(screen.getByText('Word 1 isn’t recognized. Check its spelling.')).toBeInTheDocument()
    await user.clear(input)
    await user.type(input, 'abandon ')
    expect(input).toHaveAttribute('aria-invalid', 'false')
  })

  it('blocks incomplete and bad-checksum phrases on Continue without changing its label', async () => {
    const user = userEvent.setup()
    const { restore } = renderRestore(false)
    const input = screen.getByRole('combobox')
    await user.type(input, 'ahead agree ')
    const continueButton = screen.getByRole('button', { name: 'Continue' })
    await user.click(continueButton)
    expect(screen.getByText(/Enter the complete recovery phrase:/)).toBeInTheDocument()
    expect(restore).not.toHaveBeenCalled()
    await user.click(input)
    await user.clear(input)
    await user.paste(Array(12).fill('abandon').join(' '))
    expect(input).toHaveAttribute('aria-invalid', 'false')
    await user.click(continueButton)
    expect(screen.getByText(/This recovery phrase doesn’t validate/)).toBeInTheDocument()
    expect(restore).not.toHaveBeenCalled()
  })

  it('never autocompletes a manually typed hex key and restores valid key bytes', async () => {
    const user = userEvent.setup()
    const { restore } = renderRestore(false)
    const input = screen.getByRole('combobox')
    const key = 'abadef' + 'a'.repeat(58)
    await user.type(input, key)
    expect(input).toHaveValue(key)
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(restore).toHaveBeenCalledTimes(1)
    expect(restore.mock.calls[0][0]).toEqual(Uint8Array.from(key.match(/../g)!, (byte) => parseInt(byte, 16)))
  })

  it('never sends an invalid private key to restore', async () => {
    const user = userEvent.setup()
    const { restore } = renderRestore(false)
    const input = screen.getByRole('combobox')
    await user.type(input, 'nsec1invalid')
    expect(input).toHaveAttribute('aria-invalid', 'false')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByText(/Enter a valid nsec private key/)).toBeInTheDocument()
    expect(restore).not.toHaveBeenCalled()
  })
})

describe('Restore editing edge cases', () => {
  it('replaces an earlier word without removing later words or moving the caret to the end', async () => {
    const user = userEvent.setup()
    renderRestore(false)
    const input = screen.getByRole('combobox') as HTMLInputElement
    await user.click(input)
    await user.paste('ahead agr about')
    await user.keyboard('{Home}{ArrowRight>8/}{ArrowDown}{Enter}')
    expect(input).toHaveValue('ahead agree about')
    expect(input.selectionStart).toBe(12)
  })

  it('dismisses suggestions with Escape without accepting a word, and validates the word on blur', async () => {
    const user = userEvent.setup()
    renderRestore(false)
    const input = screen.getByRole('combobox')
    await user.type(input, 'aban')
    await user.keyboard('{Escape}')
    expect(input).toHaveValue('aban')
    expect(input).toHaveAttribute('aria-invalid', 'false')
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
    await user.tab()
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  it('keeps composition input intact and does not submit on a composing Enter', () => {
    const { restore } = renderRestore(false)
    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    fireEvent.compositionStart(input)
    fireEvent.change(input, { target: { value: 'ah' } })
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
    expect(input).toHaveValue('ah')
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
    expect(restore).not.toHaveBeenCalled()
    fireEvent.compositionEnd(input)
    expect(input).toHaveValue('ah')
  })

  it('restores a normalized valid phrase only after explicit Continue', async () => {
    const user = userEvent.setup()
    const { restore } = renderRestore(false)
    const input = screen.getByRole('combobox')
    await user.click(input)
    await user.paste('  ' + validMnemonic.toUpperCase().replaceAll(' ', '   ') + '  ')
    expect(restore).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(restore).toHaveBeenCalledTimes(1)
  })
})

it('advances past existing whitespace when accepting an already complete word', async () => {
  const user = userEvent.setup()
  renderRestore(false)
  const input = screen.getByRole('combobox') as HTMLInputElement
  await user.click(input)
  await user.paste('ahead agree about')
  await user.keyboard('{Home}{ArrowRight>8/}{ArrowDown}{Enter}')
  expect(input).toHaveValue('ahead agree about')
  expect(input.selectionStart).toBe(12)
})
