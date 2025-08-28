import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}
