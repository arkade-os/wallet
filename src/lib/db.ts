import { ExtendedVirtualCoin, VtxoRepository } from '@arkade-os/sdk'
import Dexie, { EntityTable } from 'dexie'

export const db = new Dexie('arkade', { allowEmptyDB: true }) as Dexie & {
  vtxos: EntityTable<ExtendedVirtualCoin>
}

db.version(1).stores({
  vtxos: '[txid+vout], virtualStatus.state, spentBy',
})

export const vtxosRepository: VtxoRepository = {
  addOrUpdate: async (vtxos: ExtendedVirtualCoin[]) => {
    await db.vtxos.bulkPut(vtxos)
  },
  deleteAll: async () => db.vtxos.clear(),
  getSpendableVtxos: async () => {
    return db.vtxos.where('spentBy').equals('').toArray()
  },
  getAllVtxos: async () => {
    const all = await db.vtxos.toArray()
    return {
      spendable: all.filter((vtxo) => vtxo.spentBy === undefined || vtxo.spentBy === ''),
      spent: all.filter((vtxo) => vtxo.spentBy !== undefined && vtxo.spentBy !== ''),
    }
  },
  getSpentVtxos: async () => {
    return db.vtxos.where('spentBy').notEqual('').toArray()
  },
  getSweptVtxos: async () => {
    return db.vtxos.where('virtualStatus.state').equals('swept').toArray()
  },
  close: async () => db.close(),
  open: async () => {
    await db.open()
  },
}
