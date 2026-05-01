import { Switch as SwitchPrimitive } from '@base-ui/react/switch'

import { cn } from '@/lib/utils'

function Switch({
  className,
  size = 'default',
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: 'sm' | 'default' | 'lg'
}) {
  return (
    <SwitchPrimitive.Root
      data-slot='switch'
      data-size={size}
      className={cn(
        // Base styles + 44px min tap target via ::after
        'peer group/switch relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-all duration-200 ease-out outline-none',
        // Tap target: 44px minimum
        'after:absolute after:-inset-x-2 after:-inset-y-3 after:min-h-[44px] after:min-w-[44px]',
        // Focus styles
        'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
        // Invalid styles
        'aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
        // Size variants
        'data-[size=default]:h-[18.4px] data-[size=default]:w-[32px]',
        'data-[size=sm]:h-[14px] data-[size=sm]:w-[24px]',
        'data-[size=lg]:h-[24px] data-[size=lg]:w-[44px]',
        // Track colors + inner shadow for depth
        'data-checked:bg-primary data-unchecked:bg-neutral-300 dark:data-unchecked:bg-neutral-600',
        'shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]',
        // Disabled
        'data-disabled:cursor-not-allowed data-disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot='switch-thumb'
        className={cn(
          'pointer-events-none block rounded-full bg-white ring-0 transition-transform duration-200 ease-out',
          // Three-layer shadow for depth (iOS-like)
          'shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.1),0_2px_4px_rgba(0,0,0,0.06)]',
          // Size variants
          'group-data-[size=default]/switch:size-4',
          'group-data-[size=sm]/switch:size-3',
          'group-data-[size=lg]/switch:size-[20px]',
          // Checked position
          'group-data-[size=default]/switch:data-checked:translate-x-[calc(100%-2px)]',
          'group-data-[size=sm]/switch:data-checked:translate-x-[calc(100%-2px)]',
          'group-data-[size=lg]/switch:data-checked:translate-x-[22px]',
          // Unchecked position
          'group-data-[size=default]/switch:data-unchecked:translate-x-[2px]',
          'group-data-[size=sm]/switch:data-unchecked:translate-x-[2px]',
          'group-data-[size=lg]/switch:data-unchecked:translate-x-[2px]',
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
