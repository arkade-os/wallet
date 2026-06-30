import InputWithScanner from './InputWithScanner'

interface InputUrlProps {
  error?: string
  focus?: boolean
  label?: string
  onChange: (arg0: any) => void
  onEnter: () => void
  openScan: () => void
  placeholder?: string
  value?: string
}

export default function InputUrl({
  error,
  focus,
  label,
  onChange,
  onEnter,
  openScan,
  placeholder,
  value,
}: InputUrlProps) {
  return (
    <InputWithScanner
      error={error}
      focus={focus}
      label={label}
      name='input-url'
      onChange={onChange}
      onEnter={onEnter}
      openScan={openScan}
      placeholder={placeholder}
      value={value}
    />
  )
}
