/** Reloads once a newer service worker has taken control of a page that already had one. */
export function reloadOnWorkerTakeover(container: ServiceWorkerContainer | undefined, reload: () => void): void {
  if (!container) return
  // A page's first worker claiming it is installation, not an update: reloading then would interrupt onboarding.
  let controlled = Boolean(container.controller)
  container.addEventListener('controllerchange', () => {
    if (controlled) reload()
    controlled = true
  })
}
