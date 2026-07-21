/**
 * The @arkade-os/sdk EsploraProvider reads the chain tip from
 * `${esploraUrl}/blocks`, an esplora route. mutinynet.com runs only the
 * mempool backend, which serves that data at /api/v1/blocks instead, so
 * the SDK's getChainTip() 404s on mutinynet/signet. Until the SDK handles
 * mempool-only instances itself, rewrite that one request; both endpoints
 * return the fields the SDK reads (id, height, mediantime).
 */
const blocksUrlRewrites: Record<string, string> = {
  'https://mutinynet.com/api/blocks': 'https://mutinynet.com/api/v1/blocks',
}

export const rewriteEsploraBlocksUrl = (url: string): string => blocksUrlRewrites[url] ?? url

export const installEsploraFetchCompat = (): void => {
  const originalFetch = globalThis.fetch.bind(globalThis)
  globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (typeof input === 'string' || input instanceof URL) {
      return originalFetch(rewriteEsploraBlocksUrl(input.toString()), init)
    }
    const rewritten = rewriteEsploraBlocksUrl(input.url)
    return originalFetch(rewritten === input.url ? input : new Request(rewritten, input), init)
  }
}
