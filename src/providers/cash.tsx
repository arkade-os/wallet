import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { WalletContext } from './wallet'
import type { CashRecord } from '../lib/arkadeCashTransfer'

export const CashContext = createContext<{
  voucher?: CashRecord
  /** Selection, so the detail can tell "still loading" from "nothing picked". */
  voucherId: string
  setVoucher: (id: string) => void
  clearVoucher: () => void
  pendingToken: { current?: string }
}>({ voucherId: '', setVoucher: () => {}, clearVoucher: () => {}, pendingToken: {} })

export function CashProvider({ children }: { children: ReactNode }) {
  const { cashRecords = [], pendingCashToken = {} } = useContext(WalletContext)
  const [id, setId] = useState('')
  // Derived, not stored: the record arrives a render after the id is set.
  const voucher = useMemo(() => cashRecords.find((record) => record.id === id), [cashRecords, id])
  useEffect(() => {
    const url = new URL(window.location.href)
    if (id) url.searchParams.set('cash', id)
    else url.searchParams.delete('cash')
    window.history.replaceState(window.history.state, '', url)
  }, [id])
  return (
    <CashContext.Provider
      value={{
        voucher,
        voucherId: id,
        setVoucher: setId,
        clearVoucher: () => setId(''),
        pendingToken: pendingCashToken,
      }}
    >
      {children}
    </CashContext.Provider>
  )
}
