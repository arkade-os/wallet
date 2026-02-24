import InputWithScanner from './InputWithScanner'

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
  const is34BytesHex = (str: string) => /^[0-9a-fA-F]{68}$/.test(str)
  return (
    <InputWithScanner
      focus={focus}
      label={label}
      name={name}
      onChange={onChange}
      onEnter={onEnter}
      openScan={openScan}
      validator={is34BytesHex}
      value={value}
    />
  )
}
