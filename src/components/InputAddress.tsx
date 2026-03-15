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
  onChange: (arg0: any) => void
  onEnter?: () => void
  openScan: () => void
  placeholder?: string
  value?: string
  validator?: (data: string) => boolean
}

export default function InputAddress({
  focus,
  label,
  name,
  onChange,
  onEnter,
  openScan,
  placeholder,
  value,
  validator,
}: InputAddressProps) {
  const isAddress = (data: string): boolean => {
    return (
      isBip21(data.toLowerCase()) ||
      isArkAddress(data.toLowerCase()) ||
      isBTCAddress(data.toLowerCase()) ||
      isLightningInvoice(data.toLowerCase()) ||
      isURLWithLightningQueryString(data.toLowerCase()) ||
      isEmailAddress(data) ||
      isArkNote(data) // easter egg :)
    )
  }

  return (
    <InputWithScanner
      focus={focus}
      label={label}
      name={name}
      onChange={onChange}
      onEnter={onEnter}
      openScan={openScan}
      placeholder={placeholder}
      validator={validator ?? isAddress}
      value={value}
    />
  )
}
