import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { WalletContext } from './wallet'
import type { CashRecord } from '../lib/arkadeCashTransfer'

export const CashContext = createContext<{
  voucher?: CashRecord
  setVoucher: (id: string) => void
  clearVoucher: () => void
  pendingToken: { current?: string }
}>({ setVoucher: () => {}, clearVoucher: () => {}, pendingToken: {} })

export function CashProvider({ children }: { children: ReactNode }) {
  const { cashRecords = [], pendingCashToken = {} } = useContext(WalletContext)
  const [id, setId] = useState('')
  const [voucher, setVoucher] = useState<CashRecord>()
  useEffect(() => {
    setVoucher(cashRecords.find((record) => record.id === id))
    const url = new URL(window.location.href)
    if (id) url.searchParams.set('cash', id)
    else url.searchParams.delete('cash')
    window.history.replaceState(window.history.state, '', url)
  }, [id, cashRecords])
  return (
    <CashContext.Provider
      value={{ voucher, setVoucher: setId, clearVoucher: () => setId(''), pendingToken: pendingCashToken }}
    >
      {children}
    </CashContext.Provider>
  )
}
