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
import LnUrlLogin from '../screens/Wallet/Send/LnUrlLogin'
import Transaction from '../screens/Wallet/Transaction'
import Unlock from '../screens/Wallet/Unlock'
import Vtxos from '../screens/Settings/Vtxos'
import Wallet from '../screens/Wallet/Index'
import Settings from '../screens/Settings/Index'

import Apps from '../screens/Apps/Index'
import AppBoltz from '../screens/Apps/Boltz/Index'
import AppBoltzSettings from '../screens/Apps/Boltz/Settings'
import InitSuccess from '../screens/Init/Success'
import AppBoltzSwap from '../screens/Apps/Boltz/Swap'
import AppLendasat from '../screens/Apps/Lendasat/Index'
import AppLendaswap from '../screens/Apps/Lendaswap/Index'
import AppAssets from '../screens/Apps/Assets/Index'
import AppAssetDetail from '../screens/Apps/Assets/Detail'
import AppAssetImport from '../screens/Apps/Assets/Import'
import AppAssetMint from '../screens/Apps/Assets/Mint'
import AppAssetMintSuccess from '../screens/Apps/Assets/MintSuccess'
import AppAssetReissue from '../screens/Apps/Assets/Reissue'
import AppAssetBurn from '../screens/Apps/Assets/Burn'
import AppAssetsSettings from '../screens/Apps/Assets/Settings'
import Unavailable from '../screens/Wallet/Unavailable'

export type NavigationDirection = 'forward' | 'back' | 'none'

export enum Pages {
  AppBoltz,
  AppBoltzSettings,
  AppBoltzSwap,
  AppLendasat,
  AppLendaswap,
  AppAssets,
  AppAssetDetail,
  AppAssetImport,
  AppAssetMint,
  AppAssetMintSuccess,
  AppAssetReissue,
  AppAssetBurn,
  AppAssetsSettings,
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

  ReceiveAmount,
  ReceiveQRCode,
  ReceiveSuccess,
  SendForm,
  SendDetails,
  SendSuccess,
  LnUrlLogin,
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
  [Pages.AppAssets]: Tabs.Apps,
  [Pages.AppAssetDetail]: Tabs.Apps,
  [Pages.AppAssetImport]: Tabs.Apps,
  [Pages.AppAssetMint]: Tabs.Apps,
  [Pages.AppAssetMintSuccess]: Tabs.Apps,
  [Pages.AppAssetReissue]: Tabs.Apps,
  [Pages.AppAssetBurn]: Tabs.Apps,
  [Pages.AppAssetsSettings]: Tabs.Apps,
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

  [Pages.ReceiveAmount]: Tabs.Wallet,
  [Pages.ReceiveQRCode]: Tabs.Wallet,
  [Pages.ReceiveSuccess]: Tabs.Wallet,
  [Pages.SendForm]: Tabs.Wallet,
  [Pages.SendDetails]: Tabs.Wallet,
  [Pages.SendSuccess]: Tabs.Wallet,
  [Pages.LnUrlLogin]: Tabs.Wallet,
  [Pages.Settings]: Tabs.Settings,
  [Pages.Transaction]: Tabs.Wallet,
  [Pages.Unavailable]: Tabs.None,
  [Pages.Unlock]: Tabs.None,
  [Pages.Vtxos]: Tabs.Settings,
  [Pages.Wallet]: Tabs.Wallet,
}

// Root pages of each tab — tab switches between these get no animation
const ROOT_PAGES = new Set([Pages.Wallet, Pages.Apps, Pages.Settings])

// Coordination point for sub-navigation (e.g., Settings options)
// Sub-navigation providers register here so the main popstate handler can delegate
// Shared flag: set by goBack() before calling history.back(), read by popstate handler
// Lets us distinguish back-button presses (animate) from swipe gestures (no animation)
export const isButtonBack = { current: false }

// Coordination point for sub-navigation (e.g., Settings options)
export const subNavHandler = {
  canGoBack: () => false as boolean,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  goBack: (_fromButton: boolean) => {},
  getDepth: () => 0,
  reset: () => {},
}

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
    case Pages.AppAssets:
      return <AppAssets />
    case Pages.AppAssetDetail:
      return <AppAssetDetail />
    case Pages.AppAssetImport:
      return <AppAssetImport />
    case Pages.AppAssetMint:
      return <AppAssetMint />
    case Pages.AppAssetMintSuccess:
      return <AppAssetMintSuccess />
    case Pages.AppAssetReissue:
      return <AppAssetReissue />
    case Pages.AppAssetBurn:
      return <AppAssetBurn />
    case Pages.AppAssetsSettings:
      return <AppAssetsSettings />
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
    case Pages.LnUrlLogin:
      return <LnUrlLogin />
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
  goBack: () => void
  isInitialLoad: boolean
  navigate: (arg0: Pages) => void
  screen: Pages
  tab: Tabs
}

export const NavigationContext = createContext<NavigationContextProps>({
  direction: 'none',
  goBack: () => {},
  isInitialLoad: false,
  navigate: () => {},
  screen: Pages.Init,
  tab: Tabs.None,
})

export const NavigationProvider = ({ children }: { children: ReactNode }) => {
  const [screen, setScreen] = useState(Pages.Init)
  const [tab, setTab] = useState(Tabs.None)
  const [direction, setDirection] = useState<NavigationDirection>('none')

  const screenRef = useRef(Pages.Init)
  const backStack = useRef<Pages[]>([])
  const previousPage = useRef<Pages>(Pages.Init)
  const skipNextPopstate = useRef(false)

  const isInitialLoad = pageTab[previousPage.current] === Tabs.None && screen === Pages.Wallet

  const handlePopState = useCallback(() => {
    const fromButton = isButtonBack.current
    isButtonBack.current = false

    if (skipNextPopstate.current) {
      skipNextPopstate.current = false
      return
    }

    // delegate to sub-navigation (e.g., Settings options) if it can handle this
    if (subNavHandler.canGoBack()) {
      subNavHandler.goBack(fromButton)
      return
    }

    const stack = backStack.current
    if (stack.length === 0) return

    const prevPage = stack[stack.length - 1]

    // prevent going back to InitConnect or to a loading screen
    if ([Pages.InitConnect, Pages.Loading].includes(prevPage)) {
      stack.pop()
      history.pushState({}, '', '')
      return
    }

    stack.pop()
    previousPage.current = screenRef.current
    setDirection(fromButton ? 'back' : 'none')
    setTab(pageTab[prevPage])
    screenRef.current = prevPage
    setScreen(prevPage)
  }, [])

  useEffect(() => {
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [handlePopState])

  const goBack = useCallback(() => {
    if (backStack.current.length > 0 || subNavHandler.canGoBack()) {
      isButtonBack.current = true
      history.back()
    }
  }, [])

  const navigate = (page: Pages) => {
    const isRootNavigation = ROOT_PAGES.has(page)

    previousPage.current = screenRef.current

    if (isRootNavigation) {
      // tab switch or return to root: clear back stack + sub-nav + remove browser history entries
      const mainEntries = backStack.current.length
      const subEntries = subNavHandler.getDepth()
      const entriesToRemove = mainEntries + subEntries
      backStack.current = []
      if (subEntries > 0) subNavHandler.reset()
      if (entriesToRemove > 0) {
        skipNextPopstate.current = true
        history.go(-entriesToRemove)
      }
      const isSameTab = pageTab[page] === pageTab[screenRef.current]
      const isFromRoot = ROOT_PAGES.has(screenRef.current)
      setDirection(isFromRoot || !isSameTab ? 'none' : 'back')
    } else {
      // forward navigation: push to back stack AND browser history
      backStack.current.push(screenRef.current)
      history.pushState({}, '', '')
      setDirection('forward')
    }

    screenRef.current = page
    setScreen(page)
    setTab(pageTab[page])
  }

  return (
    <NavigationContext.Provider value={{ direction, goBack, isInitialLoad, navigate, screen, tab }}>
      {children}
    </NavigationContext.Provider>
  )
}
