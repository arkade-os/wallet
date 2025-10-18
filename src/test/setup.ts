import '@testing-library/jest-dom/vitest'
import { setupIonicReact } from '@ionic/react'
import { afterEach, beforeEach, vi } from 'vitest'

setupIonicReact()

// Silence noisy console output while preserving console identity
beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})
