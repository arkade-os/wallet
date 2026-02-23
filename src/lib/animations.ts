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

export const pageSlideForward: Variants = {
  initial: { x: SLIDE_OFFSET, opacity: 0 },
  animate: {
    x: 0,
    opacity: 1,
    transition: { duration: PAGE_TRANSITION_DURATION, ease: EASE_OUT_QUINT },
  },
  exit: {
    x: `-${SLIDE_OFFSET}`,
    opacity: 0,
    transition: { duration: PAGE_TRANSITION_EXIT_DURATION, ease: EASE_OUT_QUINT },
  },
}

export const pageSlideBack: Variants = {
  initial: { x: `-${SLIDE_OFFSET}`, opacity: 0 },
  animate: {
    x: 0,
    opacity: 1,
    transition: { duration: PAGE_TRANSITION_DURATION, ease: EASE_OUT_QUINT },
  },
  exit: {
    x: SLIDE_OFFSET,
    opacity: 0,
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
  initial: { y: 12, opacity: 0 },
  animate: {
    y: 0,
    opacity: 1,
    transition: { duration: STAGGER_DURATION, ease: EASE_OUT_QUINT },
  },
}

export const loadingExitVariants: Variants = {
  animate: { opacity: 1 },
  exit: {
    opacity: 0,
    transition: { duration: PAGE_TRANSITION_EXIT_DURATION, ease: EASE_OUT_QUINT },
  },
}

export const noAnimation: Variants = {
  initial: { opacity: 1 },
  animate: { opacity: 1 },
  exit: { opacity: 0, transition: { duration: 0 } },
}
