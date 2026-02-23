import { ReactNode, createContext, useCallback, useEffect, useRef, useState } from 'react'
import Init from '../screens/Init/Init'
import InitConnect from '../screens/Init/Connect'
import InitRestore from '../screens/Init/Restore'
import InitPassword from '../screens/Init/Password'
import Loading from '../components/Loading'
import NotesRedeem from '../screens/Wallet/Notes/Redeem'
import NotesForm from '../screens/Wallet/Notes/Form'
import NotesSuccess from '../screens/Wallet/Notes/Success'
import ReceiveAmount from '../screens/Wallet/Receive/Amount'
import ReceiveQRCode from '../screens/Wallet/Receive/QrCode'
import ReceiveSuccess from '../screens/Wallet/Receive/Success'
import SendForm from '../screens/Wallet/Send/Form'
import SendDetails from '../screens/Wallet/Send/Details'
import SendSuccess from '../screens/Wallet/Send/Success'
import Transaction from '../screens/Wallet/Transaction'
import Unlock from '../screens/Wallet/Unlock'
import Vtxos from '../screens/Settings/Vtxos'
import Wallet from '../screens/Wallet/Index'
import Settings from '../screens/Settings/Index'
import Onboard from '../screens/Wallet/Onboard'
import Apps from '../screens/Apps/Index'
import AppBoltz from '../screens/Apps/Boltz/Index'
import AppBoltzSettings from '../screens/Apps/Boltz/Settings'
import InitSuccess from '../screens/Init/Success'
import AppBoltzSwap from '../screens/Apps/Boltz/Swap'
import AppLendasat from '../screens/Apps/Lendasat/Index'
import AppLendaswap from '../screens/Apps/Lendaswap/Index'
import Unavailable from '../screens/Wallet/Unavailable'

export type NavigationDirection = 'forward' | 'back' | 'none'

export enum Pages {
  AppBoltz,
  AppBoltzSettings,
  AppBoltzSwap,
  AppLendasat,
  AppLendaswap,
  Apps,
  Init,
  InitRestore,
  InitPassword,
  InitConnect,
  InitSuccess,
  Loading,
  NotesRedeem,
  NotesForm,
  NotesSuccess,
  Onboard,
  ReceiveAmount,
  ReceiveQRCode,
  ReceiveSuccess,
  SendForm,
  SendDetails,
  SendSuccess,
  Settings,
  Transaction,
  Unavailable,
  Unlock,
  Vtxos,
  Wallet,
}

export enum Tabs {
  Apps = 'apps',
  None = 'none',
  Settings = 'settings',
  Wallet = 'wallet',
}

const pageTab = {
  [Pages.AppBoltz]: Tabs.Apps,
  [Pages.AppBoltzSettings]: Tabs.Apps,
  [Pages.AppBoltzSwap]: Tabs.Apps,
  [Pages.AppLendasat]: Tabs.Apps,
  [Pages.AppLendaswap]: Tabs.Apps,
  [Pages.Apps]: Tabs.Apps,
  [Pages.Init]: Tabs.None,
  [Pages.InitRestore]: Tabs.None,
  [Pages.InitPassword]: Tabs.None,
  [Pages.InitConnect]: Tabs.None,
  [Pages.InitSuccess]: Tabs.None,
  [Pages.Loading]: Tabs.None,
  [Pages.NotesRedeem]: Tabs.Settings,
  [Pages.NotesForm]: Tabs.Settings,
  [Pages.NotesSuccess]: Tabs.Settings,
  [Pages.Onboard]: Tabs.None,
  [Pages.ReceiveAmount]: Tabs.Wallet,
  [Pages.ReceiveQRCode]: Tabs.Wallet,
  [Pages.ReceiveSuccess]: Tabs.Wallet,
  [Pages.SendForm]: Tabs.Wallet,
  [Pages.SendDetails]: Tabs.Wallet,
  [Pages.SendSuccess]: Tabs.Wallet,
  [Pages.Settings]: Tabs.Settings,
  [Pages.Transaction]: Tabs.Wallet,
  [Pages.Unavailable]: Tabs.None,
  [Pages.Unlock]: Tabs.None,
  [Pages.Vtxos]: Tabs.Settings,
  [Pages.Wallet]: Tabs.Wallet,
}

// Root pages of each tab — tab switches between these get no animation
const ROOT_PAGES = new Set([Pages.Wallet, Pages.Apps, Pages.Settings])

export const pageComponent = (page: Pages): JSX.Element => {
  switch (page) {
    case Pages.AppBoltz:
      return <AppBoltz />
    case Pages.AppBoltzSettings:
      return <AppBoltzSettings />
    case Pages.AppBoltzSwap:
      return <AppBoltzSwap />
    case Pages.AppLendasat:
      return <AppLendasat />
    case Pages.AppLendaswap:
      return <AppLendaswap />
    case Pages.Apps:
      return <Apps />
    case Pages.Init:
      return <Init />
    case Pages.InitConnect:
      return <InitConnect />
    case Pages.InitRestore:
      return <InitRestore />
    case Pages.InitPassword:
      return <InitPassword />
    case Pages.InitSuccess:
      return <InitSuccess />
    case Pages.Loading:
      return <Loading />
    case Pages.NotesRedeem:
      return <NotesRedeem />
    case Pages.NotesForm:
      return <NotesForm />
    case Pages.NotesSuccess:
      return <NotesSuccess />
    case Pages.Onboard:
      return <Onboard />
    case Pages.ReceiveAmount:
      return <ReceiveAmount />
    case Pages.ReceiveQRCode:
      return <ReceiveQRCode />
    case Pages.ReceiveSuccess:
      return <ReceiveSuccess />
    case Pages.SendForm:
      return <SendForm />
    case Pages.SendDetails:
      return <SendDetails />
    case Pages.SendSuccess:
      return <SendSuccess />
    case Pages.Settings:
      return <Settings />
    case Pages.Transaction:
      return <Transaction />
    case Pages.Unavailable:
      return <Unavailable />
    case Pages.Unlock:
      return <Unlock />
    case Pages.Vtxos:
      return <Vtxos />
    case Pages.Wallet:
      return <Wallet />
    default:
      return <></>
  }
}

interface NavigationContextProps {
  direction: NavigationDirection
  isInitialLoad: boolean
  navigate: (arg0: Pages) => void
  screen: Pages
  tab: Tabs
}

export const NavigationContext = createContext<NavigationContextProps>({
  direction: 'none',
  isInitialLoad: false,
  navigate: () => {},
  screen: Pages.Init,
  tab: Tabs.None,
})

export const NavigationProvider = ({ children }: { children: ReactNode }) => {
  const [screen, setScreen] = useState(Pages.Init)
  const [tab, setTab] = useState(Tabs.None)
  const [direction, setDirection] = useState<NavigationDirection>('none')

  const navigationHistory = useRef<Pages[]>([])
  const previousPage = useRef<Pages>(Pages.Init)

  const isInitialLoad = previousPage.current === Pages.Loading && screen === Pages.Wallet

  const addEntryToBrowserHistory = () => {
    if (typeof window !== 'undefined' && 'history' in window) {
      history.pushState({}, '', '')
    }
  }

  const push = (page: Pages) => {
    addEntryToBrowserHistory()
    navigationHistory.current.push(page)
  }

  const pop = useCallback(() => {
    const length = navigationHistory.current.length

    // prevent popping when there's no history left
    if (length < 2) {
      // when popstate fires, the browser has already navigated back
      // add a new entry to keep internal and browser history in sync
      addEntryToBrowserHistory()
      return
    }

    const prevPage = navigationHistory.current[length - 2]

    // prevent going back to InitConnect or to a loading screen
    if ([Pages.InitConnect, Pages.Loading].includes(prevPage)) {
      // when popstate fires, the browser has already navigated back
      // add a new entry to keep internal and browser history in sync
      addEntryToBrowserHistory()
      return
    }

    // pop current page
    navigationHistory.current.pop()

    // update UI to show previous page
    previousPage.current = screen
    setDirection('back')
    setTab(pageTab[prevPage])
    setScreen(prevPage)
  }, [screen])

  useEffect(() => {
    const handlePopState = () => pop()
    if (typeof window !== 'undefined') {
      addEntryToBrowserHistory()
      window.addEventListener('popstate', handlePopState)
      return () => window.removeEventListener('popstate', handlePopState)
    }
  }, [pop])

  const navigate = (page: Pages) => {
    const nextTab = pageTab[page]
    const isTabSwitch = nextTab !== tab && ROOT_PAGES.has(page) && ROOT_PAGES.has(screen)

    previousPage.current = screen
    push(page)
    setDirection(isTabSwitch ? 'none' : 'forward')
    setScreen(page)
    setTab(nextTab)
  }

  return (
    <NavigationContext.Provider value={{ direction, isInitialLoad, navigate, screen, tab }}>
      {children}
    </NavigationContext.Provider>
  )
}
