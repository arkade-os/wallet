import { useState } from 'react'
import { hapticLight } from '../lib/haptics'
import type { SwapVariant } from '../providers/flow'
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from './ui/popover'

const swapVariants: { id: SwapVariant; name: string; description: string }[] = [
  { id: 'current', name: 'Current', description: 'Edit receive in a drawer.' },
  { id: 'receive-first', name: 'Receive first', description: 'Lead with the amount you need.' },
  { id: 'segmented', name: 'Send or receive', description: 'Choose your intent first.' },
  { id: 'promote', name: 'Promote field', description: 'Flip which amount is primary.' },
  { id: 'equal', name: 'Equal inputs', description: 'Edit either input with one keypad.' },
  { id: 'native', name: 'Native keyboard', description: 'Tap either amount to type.' },
  { id: 'primary-menu', name: 'Header dropdown', description: 'Choose Swap from or Swap to.' },
]

export default function SwapVariantSwitcher({
  selected,
  onSelect,
}: {
  selected: SwapVariant
  onSelect: (variant: SwapVariant) => void
}) {
  const [open, setOpen] = useState(false)

  const selectVariant = (variant: SwapVariant) => {
    hapticLight()
    onSelect(variant)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type='button'
        className='swap-variant-trigger'
        aria-label='Choose swap flow variant'
        onClick={hapticLight}
      >
        V{swapVariants.findIndex((variant) => variant.id === selected) + 1}
      </PopoverTrigger>
      <PopoverContent className='swap-variant-popover' side='top' align='end' sideOffset={8}>
        <PopoverHeader>
          <PopoverTitle>Swap flow</PopoverTitle>
          <PopoverDescription>Choose before opening Swap, or switch in place.</PopoverDescription>
        </PopoverHeader>
        <div className='swap-variant-options' role='radiogroup' aria-label='Swap flow variants'>
          {swapVariants.map((variant, index) => (
            <button
              key={variant.id}
              type='button'
              className='swap-variant-option'
              role='radio'
              aria-checked={variant.id === selected}
              onClick={() => selectVariant(variant.id)}
            >
              <span className='swap-variant-option__badge'>V{index + 1}</span>
              <span>
                <strong>{variant.name}</strong>
                <small>{variant.description}</small>
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
