import React from 'react'

/**
 * Renders text with ==highlighted== sections shown in yellow
 * Used for displaying transcript context with the matching line highlighted
 */
export function renderHighlightedText(text: string): React.ReactNode {
  if (!text) return null

  // Split by == markers to find highlighted sections
  const parts = text.split(/==/)

  if (parts.length === 1) {
    // No highlights, return plain text with line breaks
    return text.split('\n').map((line, i) => (
      <React.Fragment key={i}>
        {line}
        {i < text.split('\n').length - 1 && <br />}
      </React.Fragment>
    ))
  }

  // Alternate between normal and highlighted text
  return parts.map((part, index) => {
    const isHighlighted = index % 2 === 1 // Odd indices are inside == markers

    if (isHighlighted) {
      // Highlighted section - render with yellow background
      return (
        <span
          key={index}
          className="bg-yellow-200 px-0.5 rounded"
        >
          {part.split('\n').map((line, i) => (
            <React.Fragment key={i}>
              {line}
              {i < part.split('\n').length - 1 && <br />}
            </React.Fragment>
          ))}
        </span>
      )
    }

    // Normal text - render with line breaks
    return (
      <React.Fragment key={index}>
        {part.split('\n').map((line, i) => (
          <React.Fragment key={i}>
            {line}
            {i < part.split('\n').length - 1 && <br />}
          </React.Fragment>
        ))}
      </React.Fragment>
    )
  })
}

/**
 * Check if description contains transcript context (has == markers)
 */
export function hasHighlightedContent(text?: string): boolean {
  return text?.includes('==') ?? false
}

/**
 * Strip highlight markers for plain text display (e.g., in edit mode)
 */
export function stripHighlightMarkers(text: string): string {
  return text.replace(/==/g, '')
}
