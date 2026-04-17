import * as React from 'react'
import { Switch as SwitchPrimitive } from 'radix-ui'

import { cn } from '../../lib/utils'
import { useHapticCheckedChange } from '../../lib/haptics'

function Switch({
  className,
  size = 'default',
  onCheckedChange,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: 'sm' | 'default'
}) {
  return (
    <SwitchPrimitive.Root
      data-slot='switch'
      data-size={size}
      onCheckedChange={useHapticCheckedChange<boolean>(onCheckedChange)}
      className={cn(
        // iOS-proportioned default (24×44); sm for dense contexts.
        'peer group/switch inline-flex shrink-0 cursor-pointer items-center rounded-full border border-transparent shadow-xs transition-all outline-none touch-manipulation focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-6 data-[size=default]:w-11 data-[size=sm]:h-4 data-[size=sm]:w-7 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input dark:data-[state=unchecked]:bg-input/80',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot='switch-thumb'
        // translate-x-[calc(100%+2px)] lands the thumb flush-right on both sizes:
        //   default: 20px thumb + 2px = 22px; track 44 − 2 border − 20 thumb = 22px travel ✓
        //   sm:      12px thumb + 2px = 14px; track 28 − 2 border − 12 thumb = 14px travel ✓
        className={cn(
          'pointer-events-none block rounded-full bg-background ring-0 shadow-sm transition-transform group-data-[size=default]/switch:size-5 group-data-[size=sm]/switch:size-3 data-[state=checked]:translate-x-[calc(100%+2px)] data-[state=unchecked]:translate-x-0 dark:data-[state=checked]:bg-primary-foreground dark:data-[state=unchecked]:bg-foreground',
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
