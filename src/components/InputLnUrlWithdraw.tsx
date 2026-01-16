import { isLnUrl } from '../lib/lnurl'
import InputWithScanner from './InputWithScanner'

interface InputLnUrlWithdrawProps {
  label: string
  onChange: (arg0: any) => void
  openScan: () => void
  value: string
}

export default function InputLnUrlWithdraw({ label, onChange, openScan, value }: InputLnUrlWithdrawProps) {
  return <InputWithScanner label={label} onChange={onChange} openScan={openScan} validator={isLnUrl} value={value} />
}
