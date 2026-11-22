import { isMobileBrowser } from '../lib/browser'
import InputWithScanner from './InputWithScanner'

interface InputNoteProps {
  error?: string
  label: string
  onChange: (arg0: any) => void
  openScan: () => void
  value: string
}

export default function InputNote({ error, label, onChange, openScan, value }: InputNoteProps) {
  return (
    <InputWithScanner
      error={error}
      focus={!isMobileBrowser}
      label={label}
      onChange={onChange}
      openScan={openScan}
      value={value}
    />
  )
}
