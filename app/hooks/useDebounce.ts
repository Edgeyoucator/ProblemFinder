import { useEffect, useState } from 'react'

/**
 * Debounce Hook
 *
 * Delays updating a value until after a specified delay has passed
 * since the last change. Useful for auto-saving inputs without
 * making too many API/database calls.
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 800ms)
 * @returns The debounced value
 *
 * @example
 * const [text, setText] = useState('')
 * const debouncedText = useDebounce(text, 800)
 *
 * useEffect(() => {
 *   // This only runs 800ms after user stops typing
 *   saveToDatabase(debouncedText)
 * }, [debouncedText])
 */
export function useDebounce<T>(value: T, delay: number = 800): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    // Set up a timeout to update the debounced value after delay
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Clean up the timeout if value changes before delay completes
    // This prevents updating if user is still typing
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}
