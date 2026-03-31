import { Component, type ErrorInfo, type ReactNode } from 'react'
import * as Sentry from '@sentry/react'
import Button from './Button'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    Sentry.withScope((scope) => {
      scope.setExtra('componentStack', errorInfo.componentStack)
      Sentry.captureException(error)
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'white' }}>
          <h2>Something went wrong</h2>
          <p style={{ opacity: 0.7, fontSize: '0.875rem', marginBottom: '0.5rem' }}>
            The app ran into an unexpected error. This has been automatically reported to our team. Please reload to
            continue.
          </p>
          <p style={{ opacity: 0.5, fontSize: '0.75rem', marginBottom: '1.5rem' }}>{this.state.error?.message}</p>
          <Button label='Reload' onClick={this.handleReload} />
        </div>
      )
    }

    return this.props.children
  }
}
