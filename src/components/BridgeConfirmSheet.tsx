import Button from './Button'
import FlexCol from './FlexCol'
import SheetModal from './SheetModal'
import Table, { TableData } from './Table'
import Text, { TextSecondary } from './Text'
import Title from './Title'
import type { ConfirmationRequest } from '../lib/appRequest'
import { useTranslation } from '../providers/language'

interface BridgeConfirmSheetProps {
  onApprove: () => void
  onReject: () => void
  request: ConfirmationRequest | null
}

export default function BridgeConfirmSheet({ onApprove, onReject, request }: BridgeConfirmSheetProps) {
  const { t } = useTranslation()
  const data: TableData = (request?.rows ?? []).map(({ label, value }) => [label, value])

  return (
    <SheetModal isOpen={Boolean(request)} onClose={onReject}>
      {request ? (
        <FlexCol gap='1.5rem' testId='bridge-confirm-sheet'>
          <FlexCol gap='0.25rem'>
            <Title text={request.action} />
            <TextSecondary>{t('components.appAsking', { app: request.app })}</TextSecondary>
          </FlexCol>
          <Table data={data} variant='receipt' />
          {request.note ? (
            <Text small thin wrap color='neutral-500'>
              {request.note}
            </Text>
          ) : null}
          <FlexCol gap='0.5rem'>
            <Button label={request.confirmLabel} onClick={onApprove} testId='bridge-confirm-approve' />
            <Button label={t('common.cancel')} onClick={onReject} secondary testId='bridge-confirm-reject' />
          </FlexCol>
        </FlexCol>
      ) : null}
    </SheetModal>
  )
}
