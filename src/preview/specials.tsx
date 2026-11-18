import Keyboard from '../components/Keyboard'
import WalletSuccessSplash from '../components/WalletSuccessSplash'
import Figure from '../components/Figure'

/** Screens that are not pages of their own, addressable as ?screen=_Name. */
export const specials: Record<string, () => JSX.Element> = {
  _Keypad: () => (
    <Keyboard
      back={() => {}}
      onSave={() => {}}
      recipient='maya@example.com'
      saveLabel='Continue'
      initialValue={21000}
    />
  ),
  _KeypadReceive: () => (
    <Keyboard back={() => {}} onSave={() => {}} hideBalance onClear={() => {}} initialValue={25000} />
  ),
  _Received: () => (
    <WalletSuccessSplash
      headline='Payment received'
      text='$30.00 received successfully'
      backdrop={<Figure value='+$30.00' />}
      onDone={() => {}}
    />
  ),
}
