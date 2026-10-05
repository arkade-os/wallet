import { copyToClipboard } from '../lib/clipboard'
import { useToast } from '../components/Toast'
import { useTranslation } from '../providers/language'

export function useCopyToClipboard(): (value: string) => Promise<boolean> {
  const { toast } = useToast()
  const { t } = useTranslation()

  return async (value: string) => {
    const copied = await copyToClipboard(value)
    toast(copied ? t('common.copiedToClipboard') : t('common.failedToCopy'))
    return copied
  }
}
