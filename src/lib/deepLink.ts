export const deepLinkInUrl = (): { appId: string; query: string } | undefined => {
  const clean = window.location.hash.slice(1)
  // Expected format: app+{app_id}?{query_params}
  const [_, afterApp] = clean.split('app+', 2)
  if (!afterApp) return undefined
  const [appId, query] = afterApp.split('?', 2)
  if (!appId) return undefined
  return { appId, query }
}
