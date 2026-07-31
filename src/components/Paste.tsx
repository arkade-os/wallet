import { pasteFromClipboard } from '../lib/clipboard'
import { PasteButtonOnInput } from './Button'

interface PasteProps {
  onPaste: (arg0: string) => void
}

export default function Paste({ onPaste }: PasteProps) {
  const handleClick = () => {
    // Permission handling lives in the runtime device adapter: the browser one
    // still checks 'clipboard-read' and yields nothing when denied.
    pasteFromClipboard().then((data) => {
      if (data) onPaste(data)
    })
  }

  return <PasteButtonOnInput onClick={handleClick} />
}
