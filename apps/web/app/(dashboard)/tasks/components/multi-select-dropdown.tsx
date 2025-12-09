'use client'

import { useState, useRef, useEffect } from 'react'

interface Option {
  value: string
  label: string
}

interface MultiSelectDropdownProps {
  options: Option[]
  selected: Set<string>
  onChange: (selected: Set<string>) => void
  placeholder: string
  allLabel?: string
  className?: string
}

export function MultiSelectDropdown({
  options,
  selected,
  onChange,
  placeholder,
  allLabel = 'All',
  className = '',
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleOption = (value: string) => {
    const newSelected = new Set(selected)
    if (newSelected.has(value)) {
      newSelected.delete(value)
    } else {
      newSelected.add(value)
    }
    onChange(newSelected)
  }

  const selectAll = () => {
    onChange(new Set(options.map(o => o.value)))
  }

  const clearAll = () => {
    onChange(new Set())
  }

  // Display text
  const getDisplayText = () => {
    if (selected.size === 0) return placeholder
    if (selected.size === options.length) return allLabel
    if (selected.size === 1) {
      const selectedOption = options.find(o => selected.has(o.value))
      return selectedOption?.label || placeholder
    }
    return `${selected.size} selected`
  }

  const isAllSelected = selected.size === options.length
  const hasSelection = selected.size > 0

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`text-[11px] border rounded px-2 py-1.5 bg-white flex items-center gap-1 min-w-[100px] justify-between ${
          hasSelection && !isAllSelected ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
        }`}
      >
        <span className="truncate">{getDisplayText()}</span>
        <svg
          className={`w-3 h-3 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {/* Select All / Clear All */}
          <div className="px-2 py-1.5 border-b border-gray-100 flex gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="text-[10px] text-blue-600 hover:text-blue-800"
            >
              Select All
            </button>
            <span className="text-gray-300">|</span>
            <button
              type="button"
              onClick={clearAll}
              className="text-[10px] text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          </div>

          {/* Options */}
          <div className="py-1">
            {options.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.has(option.value)}
                  onChange={() => toggleOption(option.value)}
                  className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-[11px] text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
