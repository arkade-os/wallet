/**
 * Dev-only preview harness. Renders any wallet screen with mock data so the
 * redesign can be reviewed and screenshotted without a server or a funded
 * wallet. Open /preview.html?screen=Wallet&theme=dark while `pnpm vite` runs.
 * It is not an entry of the production build.
 */
import ReactDOM from 'react-dom/client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import '../tokens.css'
import '../app.css'
import '../index.css'
import { NavigationContext, NavigationDirection, Pages, pageComponent } from '../providers/navigation'
import { ConfigContext } from '../providers/config'
import { AspContext } from '../providers/asp'
import { AssetsContext } from '../providers/assets'
import { FiatContext } from '../providers/fiat'
import { FlowContext } from '../providers/flow'
import { WalletContext } from '../providers/wallet'
import { SwapsContext } from '../providers/swaps'
import { LimitsContext } from '../providers/limits'
import { OptionsProvider } from '../providers/options'
import { LanguageProvider } from '../providers/language'
import { ToastProvider } from '../components/Toast'
import { PageTransition } from '../components/PageTransition'
import { Themes } from '../lib/types'
import { buildFixtures } from './fixtures'

const params = new URLSearchParams(window.location.search)
const theme = params.get('theme') === 'dark' ? Themes.Dark : Themes.Light
const initialScreen = (params.get('screen') ?? 'Wallet') as keyof typeof Pages
const variant = params.get('state') ?? ''

document.documentElement.classList.toggle('palette-dark', theme === Themes.Dark)

function Harness() {
  const [screen, setScreen] = useState<Pages>(Pages[initialScreen] ?? Pages.Wallet)
  const [direction, setDirection] = useState<NavigationDirection>('none')
  const [stack, setStack] = useState<Pages[]>([])
  const fixtures = useMemo(() => buildFixtures(theme, variant), [])
  const [flow, setFlow] = useState(fixtures.flow)
  const [config, setConfig] = useState(fixtures.config.config)

  const navigate = useCallback(
    (page: Pages) => {
      setDirection(page === Pages.Wallet ? 'back' : 'forward')
      setStack((s) => (page === Pages.Wallet ? [] : [...s, screen]))
      setScreen(page)
    },
    [screen],
  )
  const goBack = useCallback(() => {
    setDirection('back')
    setStack((s) => {
      const prev = s.at(-1) ?? Pages.Wallet
      setScreen(prev)
      return s.slice(0, -1)
    })
  }, [])
  const replace = useCallback((page: Pages) => {
    setDirection('none')
    setScreen(page)
  }, [])

  useEffect(() => {
    ;(window as any).__PREVIEW_NAVIGATE__ = (name: keyof typeof Pages) => navigate(Pages[name])
  }, [navigate])

  const flowValue = {
    ...fixtures.flow,
    ...flow,
    setSendInfo: (v: any) => setFlow((f: any) => ({ ...f, sendInfo: typeof v === 'function' ? v(f.sendInfo) : v })),
    setRecvInfo: (v: any) => setFlow((f: any) => ({ ...f, recvInfo: typeof v === 'function' ? v(f.recvInfo) : v })),
    setTxInfo: (v: any) => setFlow((f: any) => ({ ...f, txInfo: v })),
    setAssetInfo: (v: any) => setFlow((f: any) => ({ ...f, assetInfo: v })),
  }
  const configValue = {
    ...fixtures.config,
    config,
    updateConfig: (c: any) => setConfig(c),
  }

  return (
    <NavigationContext.Provider value={{ direction, goBack, isInitialLoad: false, navigate, replace, screen }}>
      <ConfigContext.Provider value={configValue as any}>
        <LanguageProvider>
          <AspContext.Provider value={fixtures.asp as any}>
            <AssetsContext.Provider value={fixtures.assets as any}>
              <FiatContext.Provider value={fixtures.fiat as any}>
                <FlowContext.Provider value={flowValue as any}>
                  <WalletContext.Provider value={fixtures.wallet as any}>
                    <SwapsContext.Provider value={fixtures.swaps as any}>
                      <LimitsContext.Provider value={fixtures.limits as any}>
                        <OptionsProvider>
                          <ToastProvider>
                            <div className='page' data-testid='app'>
                              <AnimatePresence mode='sync' initial={false} custom={direction}>
                                <PageTransition key={String(screen)} direction={direction} pageKey={String(screen)}>
                                  {pageComponent(screen)}
                                </PageTransition>
                              </AnimatePresence>
                            </div>
                          </ToastProvider>
                        </OptionsProvider>
                      </LimitsContext.Provider>
                    </SwapsContext.Provider>
                  </WalletContext.Provider>
                </FlowContext.Provider>
              </FiatContext.Provider>
            </AssetsContext.Provider>
          </AspContext.Provider>
        </LanguageProvider>
      </ConfigContext.Provider>
    </NavigationContext.Provider>
  )
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<Harness />)
