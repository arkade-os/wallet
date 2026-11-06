import InputWithScanner from './InputWithScanner'

interface InputAddressProps {
  disabled?: boolean
  error?: string
  focus?: boolean
  label?: string
  name?: string
  onChange: (arg0: any) => void
  onEnter?: () => void
  openScan: () => void
  placeholder?: string
  value?: string
}

export default function InputAddress({
  disabled,
  error,
  focus,
  label,
  name,
  onChange,
  onEnter,
  openScan,
  placeholder,
  value,
}: InputAddressProps) {
  return (
    <InputWithScanner
      disabled={disabled}
      error={error}
      focus={focus}
      label={label}
      name={name}
      onChange={onChange}
      onEnter={onEnter}
      openScan={openScan}
      placeholder={placeholder}
      value={value}
    />
  )
}
