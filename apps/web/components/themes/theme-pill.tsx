'use client'

import * as LucideIcons from 'lucide-react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Theme } from '@/lib/types'

interface ThemePillProps {
  theme: Theme
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  onRemove?: () => void
  onClick?: () => void
  className?: string
}

export function ThemePill({
  theme,
  size = 'md',
  showIcon = true,
  onRemove,
  onClick,
  className,
}: ThemePillProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2',
  }

  const iconSizes = {
    sm: 10,
    md: 12,
    lg: 14,
  }

  // Get icon component from lucide-react
  const IconComponent = theme.icon
    ? (LucideIcons[theme.icon as keyof typeof LucideIcons] as React.ComponentType<{ size?: number; className?: string }>)
    : null

  // Calculate contrast color for text
  const getTextColor = (hexColor?: string) => {
    if (!hexColor || !hexColor.startsWith('#')) return '#000000'
    const rgb = parseInt(hexColor.slice(1), 16)
    const r = (rgb >> 16) & 0xff
    const g = (rgb >> 8) & 0xff
    const b = (rgb >> 0) & 0xff
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
    return luma > 128 ? '#000000' : '#FFFFFF'
  }

  const textColor = getTextColor(theme.colorCode)
  const backgroundColor = theme.colorCode || '#3B82F6'

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium transition-all',
        sizeClasses[size],
        onClick && 'cursor-pointer hover:opacity-80',
        className
      )}
      style={{
        backgroundColor,
        color: textColor,
      }}
      onClick={onClick}
    >
      {showIcon && IconComponent && (
        <IconComponent size={iconSizes[size]} className="flex-shrink-0" />
      )}
      <span className="flex-1 truncate">{theme.name}</span>
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="flex-shrink-0 hover:opacity-70 transition-opacity"
          aria-label={`Remove ${theme.name}`}
        >
          <X size={iconSizes[size]} />
        </button>
      )}
    </span>
  )
}
