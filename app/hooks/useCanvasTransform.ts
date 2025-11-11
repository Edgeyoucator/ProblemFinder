import { useState, useCallback, useRef, useEffect } from 'react'

/**
 * Canvas Transform Hook
 *
 * Manages pan and zoom transformations for a zoomable canvas.
 * Provides mouse wheel zoom, click-drag panning, and smooth animations
 * for focusing on specific positions.
 *
 * @returns Transform state and control functions
 */
export function useCanvasTransform() {
  // Transform state
  const [scale, setScale] = useState(1)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)

  // Refs to track current offset values for event handlers
  const offsetXRef = useRef(0)
  const offsetYRef = useRef(0)
  const scaleRef = useRef(1)

  // Panning state
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 })

  // Animation state
  const [isAnimating, setIsAnimating] = useState(false)
  const animationRef = useRef<number>()

  // Keep refs in sync with state
  useEffect(() => {
    offsetXRef.current = offsetX
    offsetYRef.current = offsetY
    scaleRef.current = scale
  }, [offsetX, offsetY, scale])

  /**
   * Mouse Wheel Zoom Handler
   * Zooms towards cursor position (keeps cursor point fixed)
   * Clamped between 0.8 and 1.6
   */
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()

    // Get current values from refs
    const currentScale = scaleRef.current
    const currentOffsetX = offsetXRef.current
    const currentOffsetY = offsetYRef.current

    // Calculate new scale
    const delta = -e.deltaY * 0.001
    const newScale = Math.max(0.8, Math.min(1.6, currentScale + delta))

    // Adjust offset to zoom towards cursor
    if (newScale !== currentScale) {
      const canvas = e.currentTarget as HTMLElement
      const rect = canvas.getBoundingClientRect()

      // Mouse position relative to canvas
      const mouseX = e.clientX - rect.left - rect.width / 2
      const mouseY = e.clientY - rect.top - rect.height / 2

      // Adjust offset to keep mouse position fixed during zoom
      const scaleChange = newScale / currentScale
      const newOffsetX = currentOffsetX - (mouseX / currentScale) * (scaleChange - 1) * currentScale
      const newOffsetY = currentOffsetY - (mouseY / currentScale) * (scaleChange - 1) * currentScale

      setScale(newScale)
      setOffsetX(newOffsetX)
      setOffsetY(newOffsetY)
    }
  }, [])

  /**
   * Start Panning
   * Only starts drag if clicking on canvas background (not on cards)
   */
  const handlePanStart = useCallback((e: React.MouseEvent) => {
    // Only pan if clicking on the canvas itself, not on cards
    if ((e.target as HTMLElement).closest('.zone-card, .problem-card')) {
      return
    }

    setIsDragging(true)
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      offsetX,
      offsetY,
    }
  }, [offsetX, offsetY])

  /**
   * Pan Move Handler
   * Updates offset based on mouse movement
   */
  const handlePanMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return

    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y

    setOffsetX(dragStart.current.offsetX + dx)
    setOffsetY(dragStart.current.offsetY + dy)
  }, [isDragging])

  /**
   * Stop Panning
   */
  const handlePanEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  /**
   * Attach global mouse event listeners for panning
   */
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handlePanMove)
      window.addEventListener('mouseup', handlePanEnd)

      return () => {
        window.removeEventListener('mousemove', handlePanMove)
        window.removeEventListener('mouseup', handlePanEnd)
      }
    }
  }, [isDragging, handlePanMove, handlePanEnd])

  /**
   * Animate Transform
   * Smoothly transitions to target scale and offset values
   *
   * @param target - Target transform values
   * @param duration - Animation duration in milliseconds (default: 500ms)
   */
  const animateTransform = useCallback((
    target: { scale: number; offsetX: number; offsetY: number },
    duration: number = 500
  ) => {
    // Cancel any ongoing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    setIsAnimating(true)

    // Capture current state values in a stable way using functional state updates
    // This avoids stale closures when animations overlap
    const startTime = Date.now()
    let startScale: number
    let startOffsetX: number
    let startOffsetY: number

    // Capture start values on first frame
    let isFirstFrame = true

    const animate = () => {
      if (isFirstFrame) {
        // Capture current state values on first animation frame
        setScale(currentScale => {
          startScale = currentScale
          return currentScale
        })
        setOffsetX(currentOffsetX => {
          startOffsetX = currentOffsetX
          return currentOffsetX
        })
        setOffsetY(currentOffsetY => {
          startOffsetY = currentOffsetY
          return currentOffsetY
        })
        isFirstFrame = false
        animationRef.current = requestAnimationFrame(animate)
        return
      }

      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Easing function (ease-in-out)
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2

      // Interpolate values
      setScale(startScale + (target.scale - startScale) * eased)
      setOffsetX(startOffsetX + (target.offsetX - startOffsetX) * eased)
      setOffsetY(startOffsetY + (target.offsetY - startOffsetY) * eased)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        setIsAnimating(false)
      }
    }

    animationRef.current = requestAnimationFrame(animate)
  }, [])

  /**
   * Reset to Overview
   * Returns to default view (scale 1, centered)
   */
  const resetView = useCallback(() => {
    animateTransform({ scale: 1, offsetX: 0, offsetY: 0 }, 500)
  }, [animateTransform])

  /**
   * Manual Zoom Controls
   * For +/- buttons
   */
  const zoomIn = useCallback(() => {
    setScale(prev => Math.min(1.6, prev + 0.2))
  }, [])

  const zoomOut = useCallback(() => {
    setScale(prev => Math.max(0.8, prev - 0.2))
  }, [])

  /**
   * Cleanup
   */
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  return {
    // State
    scale,
    offsetX,
    offsetY,
    isDragging,
    isAnimating,

    // Event handlers
    handleWheel,
    handlePanStart,

    // Controls
    animateTransform,
    resetView,
    zoomIn,
    zoomOut,
  }
}
