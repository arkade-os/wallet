import { Variants } from 'framer-motion'

// Easing: Emil Kowalski's ease-out quint
export const EASE_OUT_QUINT = [0.23, 1, 0.32, 1]

// Page transition timing
export const PAGE_TRANSITION_DURATION = 0.3
export const PAGE_TRANSITION_EXIT_DURATION = 0.24 // 20% faster exit

// Stagger timing for wallet load-in
export const STAGGER_DELAY = 0.06
export const STAGGER_DURATION = 0.4

// Slide distance (% of container)
const SLIDE_OFFSET = '20%'

// Dynamic page transition variants — direction is passed via Framer Motion's `custom` prop.
// AnimatePresence's `custom` overrides the child's `custom` for exiting elements,
// ensuring exit animations always use the CURRENT direction, not the stale one from mount time.
export const pageTransitionVariants: Variants = {
  initial: (direction: string) => {
    if (direction === 'forward') return { x: SLIDE_OFFSET, opacity: 0 }
    if (direction === 'back') return { x: `-${SLIDE_OFFSET}`, opacity: 0 }
    return { opacity: 1 }
  },
  animate: (direction: string) => ({
    x: '0%',
    opacity: 1,
    transition: direction === 'none'
      ? { duration: 0 }
      : { duration: PAGE_TRANSITION_DURATION, ease: EASE_OUT_QUINT },
  }),
  exit: (direction: string) => {
    if (direction === 'forward') return {
      x: `-${SLIDE_OFFSET}`,
      opacity: 0,
      pointerEvents: 'none' as const,
      transition: { duration: PAGE_TRANSITION_EXIT_DURATION, ease: EASE_OUT_QUINT },
    }
    if (direction === 'back') return {
      x: SLIDE_OFFSET,
      opacity: 0,
      pointerEvents: 'none' as const,
      transition: { duration: PAGE_TRANSITION_EXIT_DURATION, ease: EASE_OUT_QUINT },
    }
    return { opacity: 0, pointerEvents: 'none' as const, transition: { duration: 0 } }
  },
}

// Keyboard/scanner overlay — slides up from bottom
export const keyboardOverlay: Variants = {
  initial: { y: '100%' },
  animate: {
    y: '0%',
    transition: { duration: PAGE_TRANSITION_DURATION, ease: EASE_OUT_QUINT },
  },
  exit: {
    y: '100%',
    transition: { duration: PAGE_TRANSITION_EXIT_DURATION, ease: EASE_OUT_QUINT },
  },
}

export const walletLoadInContainer: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: STAGGER_DELAY },
  },
}

export const walletLoadInChild: Variants = {
  initial: { y: -16, x: -2, opacity: 0 },
  animate: {
    y: 0,
    x: 0,
    opacity: 1,
    transition: { duration: STAGGER_DURATION, ease: EASE_OUT_QUINT },
  },
}
