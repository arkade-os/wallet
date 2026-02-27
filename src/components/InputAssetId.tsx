import InputWithScanner from './InputWithScanner'
import { isValidAssetId } from '../lib/assets'

interface InputAssetIdProps {
  focus?: boolean
  label: string
  name: string
  onChange: (arg0: any) => void
  onEnter?: () => void
  openScan: () => void
  value: string
}

export default function InputAssetId({ focus, label, name, onChange, onEnter, openScan, value }: InputAssetIdProps) {
  return (
    <InputWithScanner
      focus={focus}
      label={label}
      name={name}
      onChange={onChange}
      onEnter={onEnter}
      openScan={openScan}
      validator={isValidAssetId}
      value={value}
    />
  )
}
