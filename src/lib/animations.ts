import { TargetAndTransition, Variants } from 'framer-motion'

// Easing: Emil Kowalski's curves
export const EASE_OUT_QUINT = [0.23, 1, 0.32, 1]
export const EASE_OUT_QUINT_TUPLE = EASE_OUT_QUINT as [number, number, number, number]
// ease-in-out-quint: for on-screen elements moving between positions
export const EASE_IN_OUT_QUINT = [0.86, 0, 0.07, 1]
export const EASE_IN_OUT_QUINT_TUPLE = EASE_IN_OUT_QUINT as [number, number, number, number]

// Page transition timing
export const PAGE_TRANSITION_DURATION = 0.3
export const PAGE_TRANSITION_EXIT_DURATION = 0.24 // 20% faster exit

// Stagger timing for wallet load-in
export const STAGGER_DELAY = 0.06
export const STAGGER_DURATION = 0.3

// Slide distance (% of container)
const SLIDE_OFFSET = '20%'

// Cover: a task rising over Home. A spring with no bounce, about 380ms to settle.
export const COVER_SPRING = { type: 'spring' as const, visualDuration: 0.36, bounce: 0 }

/**
 * Page transition variants. The motion is chosen by the relationship between
 * the two screens, passed through Framer Motion's `custom` prop as
 * `forward`, `back` or `none`, with `:cover` appended when the page entering
 * or leaving is a cover:
 *
 * - Drill (`forward` / `back`): the new screen slides in sideways by 20% and
 *   fades in; the old one leaves the other way.
 * - Cover (`forward:cover` / `back:cover`): the task rises from the bottom
 *   over a still Home, and drops away to reveal it.
 *
 * AnimatePresence's `custom` overrides the child's `custom` for exiting
 * elements, so exits always use the CURRENT motion, not the one from mount.
 */
export const pageTransitionVariants: Variants = {
  initial: (motion: string) => {
    if (motion === 'forward:cover') return { y: '100%', opacity: 1, zIndex: 2 }
    if (motion === 'back:cover') return { opacity: 0.6, scale: 0.97, zIndex: 0 }
    if (motion === 'forward') return { x: SLIDE_OFFSET, opacity: 0 }
    if (motion === 'back') return { x: `-${SLIDE_OFFSET}`, opacity: 0 }
    return { opacity: 1 }
  },
  animate: (motion: string) => {
    if (motion === 'forward:cover') return { y: '0%', opacity: 1, zIndex: 2, transition: COVER_SPRING }
    if (motion === 'back:cover')
      return {
        x: '0%',
        y: '0%',
        opacity: 1,
        scale: 1,
        zIndex: 0,
        transition: { duration: PAGE_TRANSITION_DURATION, ease: EASE_OUT_QUINT_TUPLE },
      }
    return {
      x: '0%',
      y: '0%',
      opacity: 1,
      scale: 1,
      transition:
        motion === 'none' ? { duration: 0 } : { duration: PAGE_TRANSITION_DURATION, ease: EASE_OUT_QUINT_TUPLE },
    }
  },
  exit: (motion: string) => {
    if (motion === 'forward:cover')
      // Home recedes a little underneath while the cover lands on it
      return {
        opacity: 0.6,
        scale: 0.97,
        zIndex: 0,
        pointerEvents: 'none' as const,
        transition: { duration: 0.4, ease: EASE_OUT_QUINT_TUPLE },
      }
    if (motion === 'back:cover')
      return {
        y: '100%',
        zIndex: 2,
        pointerEvents: 'none' as const,
        transition: { duration: PAGE_TRANSITION_DURATION, ease: EASE_OUT_QUINT_TUPLE },
      }
    if (motion === 'forward')
      return {
        x: `-${SLIDE_OFFSET}`,
        opacity: 0,
        pointerEvents: 'none' as const,
        transition: { duration: PAGE_TRANSITION_EXIT_DURATION, ease: EASE_OUT_QUINT_TUPLE },
      }
    if (motion === 'back')
      return {
        x: SLIDE_OFFSET,
        opacity: 0,
        pointerEvents: 'none' as const,
        transition: { duration: PAGE_TRANSITION_EXIT_DURATION, ease: EASE_OUT_QUINT_TUPLE },
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
  background: 'var(--background-color)',
}

// Overlay slide-up animation — used for keyboard, scanner, etc.
export const overlaySlideUp: Variants = {
  initial: { y: '100%' },
  animate: {
    y: '0%',
    transition: { duration: PAGE_TRANSITION_DURATION, ease: EASE_OUT_QUINT_TUPLE },
  },
  exit: {
    y: '100%',
    transition: { duration: PAGE_TRANSITION_EXIT_DURATION, ease: EASE_OUT_QUINT_TUPLE },
  },
}

export const walletLoadInContainer: Variants = {
  initial: {},
  animate: {
    // Five sections settle within half a second: a short rise, tightly staggered.
    transition: { delayChildren: 0.03, staggerChildren: 0.045 },
  },
}

export const walletLoadInChild: Variants = {
  initial: { transform: 'translate3d(0, 10px, 0)', opacity: 0 },
  animate: {
    transform: 'translate3d(0, 0, 0)',
    opacity: 1,
    transition: { duration: 0.28, ease: EASE_OUT_QUINT_TUPLE },
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
    transition: { duration: STAGGER_DURATION, ease: EASE_OUT_QUINT_TUPLE },
  },
}

const EASE_IN = [0.55, 0, 1, 0.45] as [number, number, number, number]

export const SQUASH: TargetAndTransition = {
  y: 20,
  scaleY: 0.75,
  scaleX: 1.15,
  transition: { duration: 0.06, ease: EASE_IN },
}

export const SPRING_BACK: TargetAndTransition = {
  y: 0,
  scaleY: 1,
  scaleX: 1,
  transition: { type: 'spring', stiffness: 600, damping: 18, mass: 0.6 },
}
