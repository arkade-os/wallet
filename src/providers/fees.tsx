import { ReactNode, createContext, useContext } from 'react'
import { Vtxo } from '../lib/types'
import { AspContext } from './asp'

interface FeesContextProps {
  calcOffchainInputFee: (vtxo: Vtxo) => number
  calcOffchainOutputFee: (vtxo: Vtxo) => number
  calcOnchainInputFee: (vtxo: Vtxo) => number
  calcOnchainOutputFee: () => number
}

export const FeesContext = createContext<FeesContextProps>({
  calcOffchainInputFee: () => 0,
  calcOffchainOutputFee: () => 0,
  calcOnchainOutputFee: () => 0,
  calcOnchainInputFee: () => 0,
})

export const FeesProvider = ({ children }: { children: ReactNode }) => {
  const { aspInfo } = useContext(AspContext)

  /**
   * Calculates the offchain input fee for a given vtxo.
   * @returns
   */
  const calcOffchainInputFee = (): number => {
    if (!aspInfo.fees?.intentFee?.offchainInput) return 0
    return parseInt(aspInfo.fees?.intentFee?.offchainInput ?? '0', 10) // TODO
  }

  /**
   * Calculates the offchain output fee for a given vtxo.
   * @returns
   */
  const calcOffchainOutputFee = (): number => {
    if (!aspInfo.fees?.intentFee?.offchainOutput) return 0
    return parseInt(aspInfo.fees.intentFee.offchainOutput, 10)
  }

  /**
   * Calculates the onchain input fee for a given vtxo.
   * @returns
   */
  const calcOnchainInputFee = (): number => {
    if (!aspInfo.fees?.intentFee?.onchainInput) return 0
    return parseInt(aspInfo.fees?.intentFee?.onchainInput ?? '0', 10) // TODO
  }

  /**
   * Calculates the onchain output fee for a given vtxo.
   * @returns
   */
  const calcOnchainOutputFee = (): number => {
    if (!aspInfo.fees?.intentFee?.onchainOutput) return 0
    return parseInt(aspInfo.fees?.intentFee?.onchainOutput ?? '0', 10) // TODO
  }

  return (
    <FeesContext.Provider
      value={{
        calcOffchainInputFee,
        calcOffchainOutputFee,
        calcOnchainInputFee,
        calcOnchainOutputFee,
      }}
    >
      {children}
    </FeesContext.Provider>
  )
}
