import { useCallback, useEffect, useRef, useState } from 'react'
import { SHAPES, SLOT_SHAPES, MORPH_MS, REVERT_DELAY, type Slot } from './pixel-shapes'

export interface UsePixelMorphResult {
  shapeIdx: number
  settled: boolean
  reverting: boolean
  advance: () => void
  slots: Slot[]
}

export function usePixelMorph(): UsePixelMorphResult {
  const [shapeIdx, setShapeIdx] = useState(0)
  const [settled, setSettled] = useState(true)
  const [reverting, setReverting] = useState(false)
  const revertRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const settleRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (revertRef.current) clearTimeout(revertRef.current)
      if (settleRef.current) clearTimeout(settleRef.current)
    }
  }, [])

  const startRevert = useCallback(() => {
    if (settleRef.current) clearTimeout(settleRef.current)
    setReverting(true)
    setShapeIdx(0)
    settleRef.current = setTimeout(() => {
      setSettled(true)
      setReverting(false)
    }, MORPH_MS + 50)
  }, [])

  const advance = useCallback(() => {
    if (revertRef.current) clearTimeout(revertRef.current)
    if (settleRef.current) clearTimeout(settleRef.current)

    if (reverting) {
      setReverting(false)
      setSettled(false)
      requestAnimationFrame(() => {
        setShapeIdx(1)
        revertRef.current = setTimeout(startRevert, REVERT_DELAY)
      })
      return
    }

    if (settled) {
      setSettled(false)
      requestAnimationFrame(() => {
        setShapeIdx(1)
        revertRef.current = setTimeout(startRevert, REVERT_DELAY)
      })
      return
    }

    const next = (shapeIdx + 1) % SHAPES.length
    if (next === 0) {
      startRevert()
    } else {
      setShapeIdx(next)
      revertRef.current = setTimeout(startRevert, REVERT_DELAY)
    }
  }, [settled, reverting, shapeIdx, startRevert])

  return {
    shapeIdx,
    settled,
    reverting,
    advance,
    slots: SLOT_SHAPES[shapeIdx],
  }
}
