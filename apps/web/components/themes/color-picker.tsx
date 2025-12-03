'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  label?: string
  className?: string
}

const PRESET_COLORS = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#EAB308', // Yellow
  '#84CC16', // Lime
  '#22C55E', // Green
  '#10B981', // Emerald
  '#14B8A6', // Teal
  '#06B6D4', // Cyan
  '#0EA5E9', // Sky
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#A855F7', // Purple
  '#D946EF', // Fuchsia
  '#EC4899', // Pink
  '#F43F5E', // Rose
  '#64748B', // Slate
  '#6B7280', // Gray
  '#78716C', // Stone
]

export function ColorPicker({ value, onChange, label, className }: ColorPickerProps) {
  const [customColor, setCustomColor] = useState(value)

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value
    setCustomColor(newColor)
    onChange(newColor)
  }

  return (
    <div className={cn('space-y-2', className)}>
      {label && <label className="text-xs font-medium text-gray-700">{label}</label>}

      {/* Preset Colors */}
      <div className="grid grid-cols-10 gap-2">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => {
              setCustomColor(color)
              onChange(color)
            }}
            className={cn(
              'w-6 h-6 rounded border-2 transition-all hover:scale-110',
              value === color ? 'border-gray-900 ring-2 ring-gray-900 ring-offset-1' : 'border-gray-200'
            )}
            style={{ backgroundColor: color }}
            aria-label={`Select color ${color}`}
          >
            {value === color && (
              <Check size={12} className="text-white mx-auto" strokeWidth={3} />
            )}
          </button>
        ))}
      </div>

      {/* Custom Color Input */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <input
            type="color"
            value={customColor}
            onChange={handleCustomColorChange}
            className="w-10 h-8 rounded border border-gray-200 cursor-pointer"
          />
        </div>
        <input
          type="text"
          value={customColor}
          onChange={(e) => {
            const val = e.target.value
            if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
              setCustomColor(val)
              if (val.length === 7) {
                onChange(val)
              }
            }
          }}
          placeholder="#000000"
          className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-300"
          maxLength={7}
        />
      </div>
    </div>
  )
}
