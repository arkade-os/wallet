import InputWithScanner from './InputWithScanner'

interface InputAssetIdProps {
  error?: string
  focus?: boolean
  label: string
  name: string
  onChange: (arg0: any) => void
  onEnter?: () => void
  openScan: () => void
  value: string
}

export default function InputAssetId({
  error,
  focus,
  label,
  name,
  onChange,
  onEnter,
  openScan,
  value,
}: InputAssetIdProps) {
  return (
    <InputWithScanner
      error={error}
      focus={focus}
      label={label}
      name={name}
      onChange={onChange}
      onEnter={onEnter}
      openScan={openScan}
      value={value}
    />
  )
}
