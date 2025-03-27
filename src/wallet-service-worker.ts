import { Worker } from '@arklabs/wallet-sdk'

const worker = new Worker()
worker.start().catch(console.error)
