/**
 * Filter out redundant descriptions like "From: Meeting Title"
 * since that info is already shown via sourceMeetingTitle.
 * Also strips highlight markers (==) for plain text display.
 */
export const getMeaningfulDescription = (description?: string): string | undefined => {
  if (!description?.trim()) return undefined
  const lower = description.toLowerCase()
  if (lower.startsWith('from:') || lower.startsWith('from ')) return undefined
  // Strip highlight markers for plain text preview
  return description.replace(/==/g, '')
}

/**
 * Get the highlighted portion of the description (text between == markers)
 * Returns the first highlighted segment for preview
 */
export const getHighlightedPortion = (description?: string): string | undefined => {
  if (!description) return undefined
  const match = description.match(/==([^=]+)==/)
  return match ? match[1] : undefined
}
