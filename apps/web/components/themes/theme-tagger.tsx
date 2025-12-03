'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Check } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import type { Theme } from '@/lib/types'
import { ThemePill } from './theme-pill'

interface ThemeTaggerProps {
  meetingId: string
  currentThemes: Theme[]
  availableThemes: Theme[]
  userId: string
  onTagsChange?: () => void
}

export function ThemeTagger({
  meetingId,
  currentThemes,
  availableThemes,
  userId,
  onTagsChange,
}: ThemeTaggerProps) {
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedThemeIds, setSelectedThemeIds] = useState<Set<string>>(
    new Set(currentThemes.map((t) => t.id))
  )

  const tagMutation = useMutation({
    mutationFn: (themeIds: string[]) =>
      apiClient.themes.tag({
        meetingId,
        themeIds,
        createdBy: userId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] })
      queryClient.invalidateQueries({ queryKey: ['themes'] })
      onTagsChange?.()
      setIsOpen(false)
    },
  })

  const untagMutation = useMutation({
    mutationFn: (themeId: string) => apiClient.themes.untag(meetingId, themeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] })
      queryClient.invalidateQueries({ queryKey: ['themes'] })
      onTagsChange?.()
    },
  })

  const handleRemoveTheme = (themeId: string) => {
    untagMutation.mutate(themeId)
    setSelectedThemeIds((prev) => {
      const next = new Set(prev)
      next.delete(themeId)
      return next
    })
  }

  const handleToggleTheme = (themeId: string) => {
    setSelectedThemeIds((prev) => {
      const next = new Set(prev)
      if (next.has(themeId)) {
        next.delete(themeId)
      } else {
        next.add(themeId)
      }
      return next
    })
  }

  const handleApply = () => {
    const newThemeIds = Array.from(selectedThemeIds).filter(
      (id) => !currentThemes.find((t) => t.id === id)
    )

    if (newThemeIds.length > 0) {
      tagMutation.mutate(newThemeIds)
    } else {
      setIsOpen(false)
    }
  }

  return (
    <div className="relative">
      {/* Current Themes */}
      <div className="flex flex-wrap items-center gap-1.5">
        {currentThemes.map((theme) => (
          <ThemePill
            key={theme.id}
            theme={theme}
            size="sm"
            onRemove={() => handleRemoveTheme(theme.id)}
          />
        ))}

        {/* Add Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
        >
          <Plus size={10} />
          Add Theme
        </button>
      </div>

      {/* Theme Selector Dropdown */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 top-full mt-1 z-20 w-64 bg-white border border-gray-200 rounded shadow-lg">
            <div className="p-3">
              <div className="text-xs font-semibold text-gray-900 mb-2">
                Select Themes
              </div>

              {/* Theme List */}
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {availableThemes.length === 0 ? (
                  <div className="text-xs text-gray-500 text-center py-4">
                    No themes available. Create some themes first.
                  </div>
                ) : (
                  availableThemes.map((theme) => {
                    const isSelected = selectedThemeIds.has(theme.id)
                    const isCurrent = currentThemes.find((t) => t.id === theme.id)

                    return (
                      <button
                        key={theme.id}
                        onClick={() => !isCurrent && handleToggleTheme(theme.id)}
                        disabled={!!isCurrent}
                        className={`w-full flex items-center justify-between p-2 text-left rounded transition-colors ${
                          isCurrent
                            ? 'bg-gray-50 cursor-not-allowed opacity-50'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <ThemePill theme={theme} size="sm" />
                        {isSelected && (
                          <Check size={14} className="text-gray-900 ml-2" />
                        )}
                      </button>
                    )
                  })
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200">
                <button
                  onClick={handleApply}
                  disabled={tagMutation.isPending}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {tagMutation.isPending ? 'Adding...' : 'Apply'}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
