import { isValidLnUrl } from '../lib/lnurl'
import {
  isArkAddress,
  isBTCAddress,
  isEmailAddress,
  isLightningInvoice,
  isURLWithLightningQueryString,
} from '../lib/address'
import { isArkNote } from '../lib/arknote'
import { isBip21 } from '../lib/bip21'
import InputWithScanner from './InputWithScanner'

interface InputAddressProps {
  focus?: boolean
  label?: string
  name?: string
  onBlur?: () => void
  onChange: (arg0: any) => void
  onEnter?: () => void
  onPaste?: (data: string) => void
  openScan: () => void
  placeholder?: string
  value?: string
  validator?: (data: string) => boolean
}

export default function InputAddress({
  focus,
  label,
  name,
  onBlur,
  onChange,
  onEnter,
  onPaste,
  openScan,
  placeholder,
  value,
  validator,
}: InputAddressProps) {
  const isAddress = (data: string): boolean => {
    const lowerData = data.toLowerCase()
    return (
      isBip21(lowerData) ||
      isArkAddress(lowerData) ||
      isBTCAddress(lowerData) ||
      isLightningInvoice(lowerData) ||
      (lowerData.startsWith('lightning:') && isLightningInvoice(lowerData.slice(10))) ||
      isURLWithLightningQueryString(lowerData) ||
      isEmailAddress(data) ||
      isValidLnUrl(data) ||
      isArkNote(data) // easter egg :)
    )
  }

  return (
    <InputWithScanner
      focus={focus}
      label={label}
      name={name}
      onBlur={onBlur}
      onChange={onChange}
      onEnter={onEnter}
      onPaste={onPaste}
      openScan={openScan}
      placeholder={placeholder}
      validator={validator ?? isAddress}
      value={value}
    />
  )
}
