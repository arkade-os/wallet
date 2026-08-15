import { Component, type ErrorInfo, type ReactNode } from 'react'
import ButtonsOnBottom from './ButtonsOnBottom'
import Text, { TextSecondary } from './Text'
import CenterScreen from './CenterScreen'
import * as Sentry from '@sentry/react'
import Content from './Content'
import Button from './Button'
import Padded from './Padded'
import Header from './Header'
import { detectLanguage, translate } from '../providers/language'

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
      const language = detectLanguage()
      return (
        <div className='page'>
          <div className='page'>
            <Header text={translate(language, 'components.somethingWentWrong')} />
            <Content>
              <Padded>
                <CenterScreen>
                  <Text>{translate(language, 'components.unexpectedError')}</Text>
                  <Text>{translate(language, 'components.reloadToContinue')}</Text>
                  <TextSecondary centered>{this.state.error?.message}</TextSecondary>
                </CenterScreen>
              </Padded>
            </Content>
            <ButtonsOnBottom>
              <Button label={translate(language, 'components.reload')} onClick={this.handleReload} />
            </ButtonsOnBottom>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
