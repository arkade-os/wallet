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

    await expect(copyToClipboard('nsec1secret')).resolves.toBe(true)

    expect(writeText).toHaveBeenCalledWith('nsec1secret')
  })

  it('falls back to execCommand when the Clipboard API is missing', async () => {
    let textareaVisibleDuringCall = false
    const execCommand = vi.fn(() => {
      textareaVisibleDuringCall = document.querySelector('textarea') !== null
      return true
    })
    setExecCommand(execCommand)

    await expect(copyToClipboard('hello')).resolves.toBe(true)

    expect(textareaVisibleDuringCall).toBe(true)
    expect(execCommand).toHaveBeenCalledWith('copy')
    expect(document.querySelector('textarea')).toBeNull()
  })

  it('clears the fallback textarea value before removing it', async () => {
    const removeChild = vi.spyOn(document.body, 'removeChild')
    setExecCommand(() => true)

    await copyToClipboard('nsec1secret')

    const [removed] = removeChild.mock.calls[0]
    const textarea = removed as HTMLTextAreaElement
    expect(textarea.value).toBe('')
  })

  it('falls back to execCommand when writeText rejects', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'))
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    const execCommand = vi.fn(() => true)
    setExecCommand(execCommand)

    await expect(copyToClipboard('hello')).resolves.toBe(true)

    expect(writeText).toHaveBeenCalledTimes(1)
    expect(execCommand).toHaveBeenCalledWith('copy')
  })

  it('logs an error and resolves to false when both copy paths fail', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(copyToClipboard('hello')).resolves.toBe(false)

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
    const [message] = consoleErrorSpy.mock.calls[0]
    expect(String(message)).toContain('error copying via legacy fallback')
    expect(String(message)).toContain('rejected')
  })
})
