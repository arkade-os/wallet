import { useEffect, useState } from 'react'
import type { Card, Network } from '@arkade-os/solver-discovery'
import { consoleError } from '../lib/logs'
import { fetchRemoteSolverCard, getCardRendezvous } from '../lib/solverCardRemote'

export type RemoteCardState =
  | { status: 'checking' }
  | { status: 'no-relays' }
  | { status: 'not-found' }
  | { status: 'error' }
  | { status: 'has-remote'; card: unknown }

export function useRemoteSolverCard(card: Card, network: Network): RemoteCardState {
  const [state, setState] = useState<RemoteCardState>({ status: 'checking' })
  useEffect(() => {
    let cancelled = false
    if (!getCardRendezvous(card)) {
      setState({ status: 'no-relays' })
      return
    }
    setState({ status: 'checking' })
    fetchRemoteSolverCard(card, network)
      .then((remote) => {
        if (cancelled) return
        if (!remote) {
          setState({ status: 'not-found' })
          return
        }
        setState({ status: 'has-remote', card: remote.card })
      })
      .catch((err) => {
        if (cancelled) return
        consoleError(err, 'failed to load remote solver card')
        setState({ status: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [card, network])
  return state
}
