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
  const isUrl = (data: string): boolean => {
    return /^https?:/.test(data.toLowerCase())
  }

  return (
    <InputWithScanner
      focus={focus}
      label={label}
      onChange={onChange}
      onEnter={onEnter}
      openScan={openScan}
      placeholder={placeholder}
      validator={isUrl}
      value={value}
    />
  )
}
