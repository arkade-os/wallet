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
  // Not on a phone: the system keyboard would cover the screen before paste or scan is chosen.
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
