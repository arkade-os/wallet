declare global {
  export interface Window {
    Go: any
    balance: (bool) => Promise<any>
    collaborativeExit: (addr: string, amount: number, withExpiryCoinselect: boolean) => Promise<string>
    dump: () => Promise<string>
    getTransactionHistory: () => Promise<any>
    getVersion: () => Promise<string>
    // getTransactionStream: (callback: any) => Promise<any>
    init: (
      walletType: string,
      clientType: string,
      aspUrl: string,
      privateKey: string,
      password: string,
      chain: string,
      explorer: string,
    ) => Promise<void>
    listVtxos: () => Promise<any>
    lock: () => Promise<any>
    locked: () => Promise<bool>
    receive: () => Promise<any>
    redeemNotes: (notes: string[]) => Promise<void>
    sendOffChain: (withExpiryCoinselect: boolean, recipients: any[], withZeroFees: boolean) => Promise<string>
    sendOnChain: (recipients: any[]) => Promise<string>
    settle: () => Promise<void>
    setNostrNotificationRecipient: (npub: string) => Promise<any>
    unlock: (password: string) => Promise<any>
    notifyIncomingFunds: (address: string) => Promise<string>
  }
}
export {}
