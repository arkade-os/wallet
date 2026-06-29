import InputWithScanner from './InputWithScanner'

interface InputNpubProps {
  focus?: boolean
  label: string
  onChange: (arg0: any) => void
  openScan: () => void
  placeholder?: string
  value: string
}

export default function InputNpub({ focus, label, onChange, openScan, placeholder, value }: InputNpubProps) {
  return (
    <InputWithScanner
      focus={focus}
      label={label}
      onChange={onChange}
      openScan={openScan}
      placeholder={placeholder}
      value={value}
    />
  )
}
