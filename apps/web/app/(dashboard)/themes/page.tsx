'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Sparkles, Edit2, X } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import type { Theme } from '@/lib/types'

export default function ThemesPage() {
  const queryClient = useQueryClient()
  const [selectedTitle, setSelectedTitle] = useState<string>('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null)

  // Fetch all meetings to extract unique titles
  const { data: meetingsData, isLoading: meetingsLoading } = useQuery({
    queryKey: ['meetings'],
    queryFn: () => apiClient.meetings.list(),
  })

  const meetings = meetingsData?.data || []
  const uniqueTitles = Array.from(
    new Set(meetings.map((m: any) => m.title).filter(Boolean))
  ).sort()

  // Fetch themes for selected title
  const { data: themesData, isLoading: themesLoading } = useQuery({
    queryKey: ['themes', selectedTitle],
    queryFn: () => apiClient.themes.list({ companyId: selectedTitle }),
    enabled: !!selectedTitle,
  })

  const themes = (themesData?.data || []) as Theme[]

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      apiClient.themes.create({
        name: data.name,
        description: data.description,
        colorCode: '#3B82F6',
        icon: 'Tag',
        companyId: selectedTitle,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['themes'] })
      setName('')
      setDescription('')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; name: string; description?: string }) =>
      apiClient.themes.update(data.id, {
        name: data.name,
        description: data.description,
      }),
    onSuccess: () => {
      // Force refetch by invalidating and refetching
      queryClient.invalidateQueries({ queryKey: ['themes'] })
      queryClient.refetchQueries({ queryKey: ['themes', selectedTitle] })
      setEditingTheme(null)
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
    if (editingTheme) {
      // Update existing theme
      if (name.trim()) {
        updateMutation.mutate({
          id: editingTheme.id,
          name: name.trim(),
          description: description.trim() || undefined,
        })
      }
    } else {
      // Create new theme
      if (name.trim() && selectedTitle) {
        createMutation.mutate({ name: name.trim(), description: description.trim() || undefined })
      }
    }
  }

  const handleEdit = (theme: Theme) => {
    setEditingTheme(theme)
    setName(theme.name)
    setDescription(theme.description || '')
  }

  const handleCancelEdit = () => {
    setEditingTheme(null)
    setName('')
    setDescription('')
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="h-12 flex items-center px-6">
          <h1 className="text-sm font-semibold text-gray-900">Theme Management</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-4">
          {/* Title Selector - Prominent */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 shadow-sm">
            <label className="block text-xs font-semibold text-gray-900 uppercase tracking-wide mb-2">
              Meeting Title
            </label>
            <select
              value={selectedTitle}
              onChange={(e) => {
                setSelectedTitle(e.target.value)
                setName('')
                setDescription('')
              }}
              className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:border-gray-900 transition-colors bg-white"
              disabled={meetingsLoading}
            >
              <option value="">Choose a meeting title to manage themes...</option>
              {uniqueTitles.map((title: string) => (
                <option key={title} value={title}>
                  {title}
                </option>
              ))}
            </select>
          </div>

          {/* No Title Selected */}
          {!selectedTitle && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5">
              <div className="flex items-start gap-2.5">
                <Sparkles className="text-blue-600 mt-0.5 flex-shrink-0" size={16} />
                <div>
                  <h3 className="text-sm font-semibold text-blue-900 mb-2">
                    How Theme Classification Works
                  </h3>
                  <ul className="text-xs text-blue-800 space-y-1 leading-relaxed">
                    <li>Select a meeting title above to begin</li>
                    <li>Create themes with detailed, specific descriptions</li>
                    <li>AI automatically classifies meetings, action items, and issues using your descriptions</li>
                    <li>Organize and filter everything by theme</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Title Selected - Two Column Layout */}
          {selectedTitle && (
            <div className="grid grid-cols-2 gap-4">
              {/* Left Column - Create/Edit Form */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm h-fit">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    {editingTheme ? (
                      <>
                        <Edit2 size={14} className="text-gray-700" />
                        <h2 className="text-xs font-semibold text-gray-900">
                          Edit Theme
                        </h2>
                      </>
                    ) : (
                      <>
                        <Plus size={14} className="text-gray-700" />
                        <h2 className="text-xs font-semibold text-gray-900">
                          Create Theme
                        </h2>
                      </>
                    )}
                  </div>
                  {editingTheme && (
                    <button
                      onClick={handleCancelEdit}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors"
                      title="Cancel editing"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                      Theme Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Product Development"
                      className="w-full px-3 py-2 text-xs border-2 border-gray-200 rounded-lg focus:outline-none focus:border-gray-900 transition-colors"
                      required
                      maxLength={100}
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                      AI Classification Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Detailed discussions about product roadmap, feature planning, technical architecture decisions, and development priorities..."
                      rows={4}
                      className="w-full px-3 py-2 text-xs border-2 border-gray-200 rounded-lg focus:outline-none focus:border-gray-900 transition-colors resize-none"
                      required
                      maxLength={500}
                    />
                    <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                      The more specific your description, the better AI can classify your content.
                    </p>
                  </div>

                  {/* Submit Button */}
                  <div className="flex gap-2">
                    {editingTheme && (
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={!name.trim() || !description.trim() || createMutation.isPending || updateMutation.isPending}
                      className={`${editingTheme ? 'flex-1' : 'w-full'} flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow`}
                    >
                      {editingTheme ? (
                        <>
                          <Edit2 size={14} />
                          {updateMutation.isPending ? 'Updating...' : 'Update Theme'}
                        </>
                      ) : (
                        <>
                          <Plus size={14} />
                          {createMutation.isPending ? 'Creating...' : 'Create Theme'}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Right Column - Themes List */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-semibold text-gray-900">
                    Active Themes
                  </h2>
                  <span className="px-2 py-0.5 text-xs font-semibold text-gray-600 bg-gray-100 rounded-full">
                    {themes.length}
                  </span>
                </div>

                {themesLoading ? (
                  <div className="text-center py-8 text-xs text-gray-400">
                    Loading themes...
                  </div>
                ) : themes.length === 0 ? (
                  <div className="text-center py-8 px-4">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 mb-2">
                      <Plus size={16} className="text-gray-400" />
                    </div>
                    <p className="text-xs font-medium text-gray-600 mb-0.5">No themes yet</p>
                    <p className="text-xs text-gray-400">Create your first theme to get started</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
                    {themes.map((theme) => (
                      <div
                        key={theme.id}
                        className={`group relative p-3 bg-gray-50 border rounded-lg hover:border-gray-300 hover:shadow-sm transition-all ${
                          editingTheme?.id === theme.id ? 'border-gray-900 bg-blue-50' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-xs font-semibold text-gray-900 mb-1">
                              {theme.name}
                            </h3>
                            {theme.description && (
                              <p className="text-xs text-gray-600 leading-relaxed">
                                {theme.description}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEdit(theme)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all"
                              title="Edit theme"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Delete "${theme.name}"?\n\nThis action cannot be undone.`)) {
                                  deleteMutation.mutate(theme.id)
                                }
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-white rounded-lg transition-all"
                              disabled={deleteMutation.isPending}
                              title="Delete theme"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
