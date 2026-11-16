import type { Page } from '@playwright/test'

export type Outpoint = { txid: string; vout: number }
export type Hold = { id: string; outpoints: Outpoint[]; phase?: string; claimOutpoint?: Outpoint }

export const journal = (page: Page): Promise<Hold[]> =>
  page.evaluate(() =>
    Object.keys(localStorage)
      .filter((key) => key.startsWith('taxi-input-reservations:regtest:'))
      .flatMap((key) => JSON.parse(localStorage.getItem(key)!)),
  )

export const durableHolds = (page: Page): Promise<Hold[]> =>
  page.evaluate(async () => {
    const databases = await indexedDB.databases()
    return (
      await Promise.all(
        databases
          .filter(({ name }) => name?.startsWith('arkade-reservations-'))
          .map(
            ({ name }) =>
              new Promise<Hold[]>((resolve, reject) => {
                const opened = indexedDB.open(name!)
                opened.onerror = () => reject(opened.error)
                opened.onsuccess = () => {
                  const db = opened.result
                  const transaction = db.transaction('reservations', 'readonly')
                  const rows = transaction.objectStore('reservations').getAll()
                  rows.onsuccess = () => resolve(rows.result)
                  rows.onerror = () => reject(rows.error)
                  transaction.oncomplete = transaction.onabort = () => db.close()
                }
              }),
          ),
      )
    ).flat()
  })
