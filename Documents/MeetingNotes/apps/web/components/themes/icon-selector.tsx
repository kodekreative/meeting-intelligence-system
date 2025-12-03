'use client'

import { useState } from 'react'
import * as LucideIcons from 'lucide-react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface IconSelectorProps {
  value?: string
  onChange: (icon: string | undefined) => void
  label?: string
  className?: string
}

// Popular icons for themes
const POPULAR_ICONS = [
  'Briefcase',
  'Building',
  'Users',
  'Target',
  'TrendingUp',
  'DollarSign',
  'LineChart',
  'PieChart',
  'Lightbulb',
  'Rocket',
  'Star',
  'Heart',
  'Zap',
  'Clock',
  'Calendar',
  'CheckCircle',
  'AlertCircle',
  'Package',
  'ShoppingCart',
  'Truck',
  'Code',
  'Database',
  'Server',
  'Globe',
]

export function IconSelector({ value, onChange, label, className }: IconSelectorProps) {
  const [search, setSearch] = useState('')
  const [showAll, setShowAll] = useState(false)

  const filteredIcons = search
    ? POPULAR_ICONS.filter((icon) => icon.toLowerCase().includes(search.toLowerCase()))
    : POPULAR_ICONS

  const displayedIcons = showAll ? filteredIcons : filteredIcons.slice(0, 12)

  const SelectedIcon = value
    ? (LucideIcons[value as keyof typeof LucideIcons] as React.ComponentType<{ size?: number; className?: string }>)
    : null

  return (
    <div className={cn('space-y-2', className)}>
      {label && <label className="text-xs font-medium text-gray-700">{label}</label>}

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search icons..."
          className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-300"
        />
      </div>

      {/* Icon Grid */}
      <div className="border border-gray-200 rounded p-2">
        <div className="grid grid-cols-6 gap-1 max-h-48 overflow-y-auto">
          {/* Clear selection */}
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className={cn(
              'w-10 h-10 flex items-center justify-center rounded border-2 transition-all hover:bg-gray-50',
              !value ? 'border-gray-900 bg-gray-50' : 'border-gray-200'
            )}
            aria-label="No icon"
          >
            <X size={16} className="text-gray-400" />
          </button>

          {/* Icon options */}
          {displayedIcons.map((iconName) => {
            const IconComponent = LucideIcons[iconName as keyof typeof LucideIcons] as React.ComponentType<{
              size?: number
              className?: string
            }>

            return (
              <button
                key={iconName}
                type="button"
                onClick={() => onChange(iconName)}
                className={cn(
                  'w-10 h-10 flex items-center justify-center rounded border-2 transition-all hover:bg-gray-50',
                  value === iconName ? 'border-gray-900 bg-gray-50' : 'border-gray-200'
                )}
                aria-label={iconName}
                title={iconName}
              >
                <IconComponent size={18} className="text-gray-700" />
              </button>
            )
          })}
        </div>

        {/* Show More/Less */}
        {filteredIcons.length > 12 && (
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="w-full mt-2 py-1 text-xs text-gray-600 hover:text-gray-900 transition-colors"
          >
            {showAll ? 'Show Less' : `Show ${filteredIcons.length - 12} More`}
          </button>
        )}
      </div>

      {/* Selected Icon Preview */}
      {value && SelectedIcon && (
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span>Selected:</span>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded border border-gray-200">
            <SelectedIcon size={14} />
            <span>{value}</span>
          </div>
        </div>
      )}
    </div>
  )
}
