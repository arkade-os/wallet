import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { copyToClipboard } from '../../lib/clipboard'

const setExecCommand = (impl: () => boolean) => {
  Object.defineProperty(document, 'execCommand', { value: impl, configurable: true })
}

beforeEach(() => {
  setExecCommand(() => false)
})

afterEach(() => {
  Reflect.deleteProperty(navigator, 'clipboard')
  Reflect.deleteProperty(document, 'execCommand')
  vi.restoreAllMocks()
})

describe('copyToClipboard', () => {
  it('uses the Clipboard API when available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

    await copyToClipboard('nsec1secret')

    expect(writeText).toHaveBeenCalledWith('nsec1secret')
  })

  it('falls back to execCommand when the Clipboard API is missing', async () => {
    const execCommand = vi.fn(() => {
      expect(document.querySelector('textarea')).not.toBeNull()
      return true
    })
    setExecCommand(execCommand)

    await copyToClipboard('hello')

    expect(execCommand).toHaveBeenCalledWith('copy')
    expect(document.querySelector('textarea')).toBeNull()
  })

  it('falls back to execCommand when writeText rejects', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'))
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    const execCommand = vi.fn(() => true)
    setExecCommand(execCommand)

    await copyToClipboard('hello')

    expect(writeText).toHaveBeenCalledTimes(1)
    expect(execCommand).toHaveBeenCalledWith('copy')
  })
})
