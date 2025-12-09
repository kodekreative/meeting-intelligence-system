'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, X } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import type { Theme } from '@/lib/types'

interface ThemeManagerProps {
  themes: Theme[]
  companyId: string
  onClose?: () => void
}

export function ThemeManager({ themes, companyId, onClose }: ThemeManagerProps) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      apiClient.themes.create({
        name: data.name,
        description: data.description,
        colorCode: '#3B82F6',
        icon: 'Tag',
        companyId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['themes'] })
      setName('')
      setDescription('')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.themes.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['themes'] })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      createMutation.mutate({ name: name.trim(), description: description.trim() || undefined })
    }
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-900">Manage Themes</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Create Form */}
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded">
          <h3 className="text-xs font-semibold text-gray-900 mb-3">Create New Theme</h3>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Theme Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Product Development, Fundraising, Sales Strategy"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-300"
                required
                maxLength={100}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Description for AI Classification <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this theme in detail so AI can classify meetings correctly. E.g., 'Discussions about raising capital, investor relations, term sheets, and funding rounds'"
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-300 resize-none"
                required
                maxLength={500}
              />
              <p className="mt-1 text-xs text-gray-500">
                Be specific - AI uses this to automatically classify your meetings
              </p>
            </div>

            {/* Actions */}
            <button
              type="submit"
              disabled={!name.trim() || !description.trim() || createMutation.isPending}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Plus size={16} />
              {createMutation.isPending ? 'Creating...' : 'Create Theme'}
            </button>
          </form>
        </div>

        {/* Themes List */}
        <div>
          <h3 className="text-xs font-semibold text-gray-900 mb-2">Existing Themes ({themes.length})</h3>

          {themes.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-500">
              No themes yet. Create your first theme above.
            </div>
          ) : (
            <div className="space-y-2">
              {themes.map((theme) => (
                <div
                  key={theme.id}
                  className="flex items-start justify-between p-3 bg-white border border-gray-200 rounded hover:border-gray-300 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900">{theme.name}</h4>
                    {theme.description && (
                      <p className="text-xs text-gray-600 mt-1">{theme.description}</p>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      if (confirm(`Delete "${theme.name}"?`)) {
                        deleteMutation.mutate(theme.id)
                      }
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-gray-100 transition-colors ml-2"
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
