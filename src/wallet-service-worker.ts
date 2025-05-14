import { Worker } from '@arklabs/wallet-sdk'
import { vtxosRepository } from './lib/db'

const worker = new Worker(vtxosRepository)
worker.start().catch(console.error)
