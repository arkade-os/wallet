'use client'

import * as React from 'react'
import { CheckIcon } from 'lucide-react'
import { Checkbox as CheckboxPrimitive } from 'radix-ui'

import { cn } from '../../lib/utils'
import { useHapticCheckedChange } from '../../lib/haptics'

function Checkbox({ className, onCheckedChange, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot='checkbox'
      onCheckedChange={useHapticCheckedChange<boolean | 'indeterminate'>(onCheckedChange)}
      // before:-inset expands the invisible hit area to meet iOS 44pt HIG
      // without changing the visible 20px box. touch-manipulation kills the
      // 300ms iOS delay.
      className={cn(
        'peer relative size-5 shrink-0 cursor-pointer rounded-[4px] border border-input shadow-xs outline-none touch-manipulation transition-[color,background-color,border-color,box-shadow] duration-200 ease-out before:absolute before:-inset-[0.625rem] before:content-[""] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:bg-input/30 dark:aria-invalid:ring-destructive/40 dark:data-[state=checked]:bg-primary',
        className,
      )}
      {...props}
    >
      {/* forceMount keeps the indicator in the DOM when unchecked so scale +
          opacity can transition on state change (Radix unmounts otherwise). */}
      <CheckboxPrimitive.Indicator
        forceMount
        data-slot='checkbox-indicator'
        className='grid place-content-center text-current transition-[opacity,transform] duration-200 ease-out data-[state=checked]:scale-100 data-[state=checked]:opacity-100 data-[state=unchecked]:scale-90 data-[state=unchecked]:opacity-0'
      >
        <CheckIcon className='size-4' />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
