import { Component, type ErrorInfo, type ReactNode } from 'react'
import * as Sentry from '@sentry/react'
import Button from './Button'
import { IonApp, IonPage } from '@ionic/react'
import Padded from './Padded'
import Content from './Content'
import Header from './Header'
import ButtonsOnBottom from './ButtonsOnBottom'
import Text, { TextSecondary } from './Text'
import CenterScreen from './CenterScreen'

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
        <IonApp>
          <IonPage>
            <Header text='Something went wrong' />
            <Content>
              <Padded>
                <CenterScreen>
                  <Text>The app ran into an unexpected error</Text>
                  <Text>Please reload to continue</Text>
                  <TextSecondary centered>{this.state.error?.message}</TextSecondary>
                </CenterScreen>
              </Padded>
            </Content>
            <ButtonsOnBottom>
              <Button label='Reload' onClick={this.handleReload} />
            </ButtonsOnBottom>
          </IonPage>
        </IonApp>
      )
    }

    return this.props.children
  }
}
