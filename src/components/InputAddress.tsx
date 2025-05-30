import { isArkAddress, isBTCAddress } from '../lib/address'
import { isArkNote } from '../lib/arknote'
import { isBip21 } from '../lib/bip21'
import InputWithScanner from './InputWithScanner'

interface InputAddressProps {
  focus?: boolean
  label?: string
  onChange: (arg0: any) => void
  onEnter?: () => void
  openScan: () => void
  placeholder?: string
  value?: string
}

export default function InputAddress({
  focus,
  label,
  onChange,
  onEnter,
  openScan,
  placeholder,
  value,
}: InputAddressProps) {
  const isAddress = (data: string): boolean => {
    return (
      isBip21(data.toLowerCase()) ||
      isArkAddress(data.toLowerCase()) ||
      isBTCAddress(data.toLowerCase()) ||
      isArkNote(data) // easter egg :)
    )
  }

  return (
    <InputWithScanner
      focus={focus}
      label={label}
      onChange={onChange}
      onEnter={onEnter}
      openScan={openScan}
      placeholder={placeholder}
      validator={isAddress}
      value={value}
    />
  )
}
