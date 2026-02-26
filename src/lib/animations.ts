import { Variants } from 'framer-motion'

// Easing: Emil Kowalski's ease-out quint (Framer Motion tuple format)
export const EASE_OUT_QUINT: [number, number, number, number] = [0.23, 1, 0.32, 1]

// CSS-side easing curves (string format for WAAPI / inline styles)
export const EASE_INTERACTIVE = 'cubic-bezier(0.165, 0.84, 0.44, 1)'
export const EASE_SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)'
export const EASE_LOOP = 'cubic-bezier(0.4, 0, 0.6, 1)'
export const EASE_REVEAL = 'ease-out'

// Duration tokens (ms — for WAAPI / inline styles)
export const DUR_MICRO = 100
export const DUR_STANDARD = 250
export const DUR_MORPH = 350
export const DUR_REVEAL = 400

// Page transition timing — tuned for WebView performance (shorter = less time for jank)
export const PAGE_TRANSITION_DURATION = 0.2
export const PAGE_TRANSITION_EXIT_DURATION = 0.15

// Stagger timing for wallet load-in
export const STAGGER_DELAY = 0.06
export const STAGGER_DURATION = 0.35

// Slide distance (% of container) — smaller = less compositing area per frame
const SLIDE_OFFSET = '12%'

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
    transition: direction === 'none' ? { duration: 0 } : { duration: PAGE_TRANSITION_DURATION, ease: EASE_OUT_QUINT },
  }),
  exit: (direction: string) => {
    if (direction === 'forward')
      return {
        x: `-${SLIDE_OFFSET}`,
        opacity: 0,
        pointerEvents: 'none' as const,
        transition: { duration: PAGE_TRANSITION_EXIT_DURATION, ease: EASE_OUT_QUINT },
      }
    if (direction === 'back')
      return {
        x: SLIDE_OFFSET,
        opacity: 0,
        pointerEvents: 'none' as const,
        transition: { duration: PAGE_TRANSITION_EXIT_DURATION, ease: EASE_OUT_QUINT },
      }
    return { opacity: 0, pointerEvents: 'none' as const, transition: { duration: 0 } }
  },
}

// Fullscreen overlay style (keyboard, scanner, etc.)
export const overlayStyle = {
  position: 'absolute' as const,
  inset: 0,
  zIndex: 10,
  display: 'flex',
  flexDirection: 'column' as const,
  background: 'var(--ion-background-color)',
}

// Overlay slide-up animation — used for keyboard, scanner, etc.
export const overlaySlideUp: Variants = {
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

// Onboarding stagger — fade up, slightly more pronounced for first-time experience
export const ONBOARD_STAGGER_DELAY = 0.08

export const onboardStaggerContainer: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: ONBOARD_STAGGER_DELAY },
  },
}

export const onboardStaggerChild: Variants = {
  initial: { y: 16, opacity: 0 },
  animate: {
    y: 0,
    opacity: 1,
    transition: { duration: STAGGER_DURATION, ease: EASE_OUT_QUINT },
  },
}
