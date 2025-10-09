import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EmptyCoinsList, EmptyLogsList, EmptySwapList, EmptyTxList } from '../../components/Empty'

describe('Empty component', () => {
  it('renders EmptyCoinsList with the correct message', () => {
    render(<EmptyCoinsList />)
    expect(screen.getByText('No virtual coins available')).toBeInTheDocument()
    expect(screen.getByText('Generate or import coins to continue')).toBeInTheDocument()
  })

  it('renders EmptyLogsList with the correct message', () => {
    render(<EmptyLogsList />)
    expect(screen.getByText('No logs available')).toBeInTheDocument()
    expect(screen.getByText('Start using the app to generate logs.')).toBeInTheDocument()
  })

  it('renders EmptySwapList with the correct message', () => {
    render(<EmptySwapList />)
    expect(screen.getByText('No swaps yet')).toBeInTheDocument()
    expect(screen.getByText('Your swap history will appear here once you start swapping.')).toBeInTheDocument()
  })

  it('renders EmptyTxList with the correct message', () => {
    render(<EmptyTxList />)
    expect(screen.getByText('No transactions yet')).toBeInTheDocument()
    expect(screen.getByText('Make a transaction to get started.')).toBeInTheDocument()
  })
})
