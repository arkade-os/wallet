import { createPendingConfirmations } from '@arkade-os/lnurl-client'

export { createPendingConfirmations, CONFIRMATION_TIMEOUT_MS } from '@arkade-os/lnurl-client'
export type { ReceiverConfirmation } from '@arkade-os/lnurl-client'

export const pendingConfirmations = createPendingConfirmations()
