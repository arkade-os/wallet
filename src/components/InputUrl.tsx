import InputWithScanner from './InputWithScanner'

interface InputUrlProps {
  focus?: boolean
  label?: string
  onChange: (arg0: any) => void
  onEnter: () => void
  openScan: () => void
  placeholder?: string
  value?: string
}

export default function InputUrl({ focus, label, onChange, onEnter, openScan, placeholder, value }: InputUrlProps) {
  return (
    <InputWithScanner
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
