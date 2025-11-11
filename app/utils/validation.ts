/**
 * Validation utilities for Explore step zone responses
 */

const FILLER_PATTERNS = [
  /^idk$/i,
  /^idc$/i,
  /^i don'?t know$/i,
  /^i don'?t care$/i,
  /^\.+$/,
  /^-+$/,
  /^yes$/i,
  /^no$/i,
  /^n\/?a$/i,
  /^none$/i,
  /^\?+$/,
  /^ok$/i,
  /^okay$/i,
  /^whatever$/i,
  /^nothing$/i,
  /^same$/i,
  /^yeah$/i,
  /^yea$/i,
  /^sure$/i,
  /^maybe$/i,
  /^stuff$/i,
  /^things$/i,
]

/**
 * Check if a response is valid
 * @param response - The response text to validate
 * @param minLength - Minimum character length (default: 10)
 * @returns true if response is valid, false otherwise
 */
export function isValidResponse(response: string, minLength: number = 10): boolean {
  const trimmed = response.trim()

  // Check non-empty
  if (trimmed.length === 0) return false

  // Check minimum length
  if (trimmed.length < minLength) return false

  // Check for filler text
  for (const pattern of FILLER_PATTERNS) {
    if (pattern.test(trimmed)) return false
  }

  return true
}

/**
 * Check if a response is unique within a list of responses
 * @param response - The response to check
 * @param allResponses - All responses to compare against
 * @returns true if response is unique, false if duplicate exists
 */
export function isUniqueResponse(response: string, allResponses: string[]): boolean {
  const trimmed = response.trim().toLowerCase()

  // Empty responses are considered unique (they'll fail isValidResponse anyway)
  if (trimmed.length === 0) return true

  const duplicateCount = allResponses
    .map(r => r.trim().toLowerCase())
    .filter(r => r === trimmed).length

  // Should only appear once in the array
  return duplicateCount <= 1
}

/**
 * Count the number of valid, unique responses in a zone
 * @param responses - Array of response strings
 * @returns Number of valid responses
 */
export function getValidResponseCount(responses: string[]): number {
  const validResponses: string[] = []

  for (const response of responses) {
    if (isValidResponse(response) && isUniqueResponse(response, responses)) {
      validResponses.push(response)
    }
  }

  return validResponses.length
}

/**
 * Check if a zone is complete based on required response count
 * @param responses - Array of response strings
 * @param requiredCount - Number of valid responses required
 * @returns true if zone has enough valid responses
 */
export function isZoneComplete(responses: string[], requiredCount: number): boolean {
  return getValidResponseCount(responses) >= requiredCount
}

/**
 * Check if a solution station is complete
 * @param idea - The solution idea text
 * @param minLength - Minimum character length (default: 15)
 * @param hasChecked - Whether the student has checked AI feedback
 * @returns true if station is complete
 */
export function isSolutionStationComplete(
  idea: string,
  minLength: number = 15,
  hasChecked: boolean = false
): boolean {
  // Must have checked feedback
  if (!hasChecked) return false

  // Must meet minimum length
  if (idea.trim().length <= minLength) return false

  // Must pass validation
  if (!isValidResponse(idea, minLength)) return false

  return true
}
