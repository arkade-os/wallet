import { ReactNode, createContext, useState } from 'react'
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

export enum Pages {
  Init,
  InitRestore,
  InitPassword,
  InitConnect,
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
  Unlock,
  Vtxos,
  Wallet,
}

export enum Tabs {
  None = 'none',
  Home = 'home',
  Send = 'send',
  Receive = 'receive',
  Settings = 'settings',
}

const pageTab = {
  [Pages.Init]: Tabs.None,
  [Pages.InitRestore]: Tabs.None,
  [Pages.InitPassword]: Tabs.None,
  [Pages.InitConnect]: Tabs.None,
  [Pages.Loading]: Tabs.None,
  [Pages.NotesRedeem]: Tabs.Settings,
  [Pages.NotesForm]: Tabs.Settings,
  [Pages.NotesSuccess]: Tabs.Settings,
  [Pages.Onboard]: Tabs.None,
  [Pages.ReceiveAmount]: Tabs.Receive,
  [Pages.ReceiveQRCode]: Tabs.Receive,
  [Pages.ReceiveSuccess]: Tabs.Receive,
  [Pages.SendForm]: Tabs.Send,
  [Pages.SendDetails]: Tabs.Send,
  [Pages.SendSuccess]: Tabs.Send,
  [Pages.Settings]: Tabs.Settings,
  [Pages.Transaction]: Tabs.Home,
  [Pages.Unlock]: Tabs.None,
  [Pages.Vtxos]: Tabs.Settings,
  [Pages.Wallet]: Tabs.Home,
}

export const pageComponent = (page: Pages): JSX.Element => {
  switch (page) {
    case Pages.Init:
      return <Init />
    case Pages.InitConnect:
      return <InitConnect />
    case Pages.InitRestore:
      return <InitRestore />
    case Pages.InitPassword:
      return <InitPassword />
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
  navigate: (arg0: Pages) => void
  screen: Pages
  tab: Tabs
}

export const NavigationContext = createContext<NavigationContextProps>({
  navigate: () => {},
  screen: Pages.Init,
  tab: Tabs.None,
})

export const NavigationProvider = ({ children }: { children: ReactNode }) => {
  const [screen, setScreen] = useState(Pages.Init)
  const [tab, setTab] = useState(Tabs.None)

  const navigate = (p: Pages) => {
    setScreen(p)
    setTab(pageTab[p])
  }

  return <NavigationContext.Provider value={{ navigate, screen, tab }}>{children}</NavigationContext.Provider>
}
