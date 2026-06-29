import { pasteFromClipboard, queryPastePermission } from '../lib/clipboard'
import { PasteButtonOnInput } from './Button'

interface PasteProps {
  onPaste: (arg0: string) => void
}

export default function Paste({ onPaste }: PasteProps) {
  const handleClick = () => {
    queryPastePermission().then((state) => {
      if (['prompt', 'granted'].includes(state)) {
        pasteFromClipboard().then((data) => {
          if (data) onPaste(data)
        })
      }
    })
  }

  return <PasteButtonOnInput onClick={handleClick} />
}
