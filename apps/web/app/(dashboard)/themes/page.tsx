'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import {
  Plus, Trash2, Edit2, X, Check, AlertCircle, ChevronRight,
  Sparkles, RefreshCw, Tag, Search, MessageSquare, Loader2
} from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import type { Theme } from '@/lib/types'

interface ThemeSuggestion {
  name: string
  description: string
  confidence: 'high' | 'medium' | 'low'
  basedOn: string
}

type TabType = 'themes' | 'research'

export default function ThemesPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  // State
  const [selectedSeries, setSelectedSeries] = useState<string>('')
  const [activeTab, setActiveTab] = useState<TabType>('themes')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [researchQuery, setResearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<ThemeSuggestion[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isResearching, setIsResearching] = useState(false)
  const [researchResult, setResearchResult] = useState<{ question: string; answer: string } | null>(null)

  // Auto-clear messages
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [errorMessage])

  // Fetch meetings to get unique series
  const { data: meetingsData, isLoading: meetingsLoading } = useQuery({
    queryKey: ['meetings'],
    queryFn: () => apiClient.meetings.list(),
  })

  const meetings = meetingsData?.data || []
  const meetingSeries = Array.from(
    new Set(meetings.map((m: any) => m.title).filter(Boolean))
  ).sort() as string[]

  // Fetch themes for selected series
  const { data: themesData, isLoading: themesLoading } = useQuery({
    queryKey: ['themes', selectedSeries],
    queryFn: () => apiClient.themes.list({ companyId: selectedSeries }),
    enabled: !!selectedSeries,
  })

  const themes = (themesData?.data || []) as Theme[]

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      apiClient.themes.create({
        name: data.name,
        description: data.description,
        colorCode: '#3B82F6',
        icon: 'Tag',
        companyId: selectedSeries,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['themes'] })
      resetForm()
      setSuccessMessage(`Theme "${variables.name}" created!`)
    },
    onError: () => setErrorMessage('Failed to create theme.'),
  })

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; name: string; description?: string }) =>
      apiClient.themes.update(data.id, { name: data.name, description: data.description }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['themes'] })
      resetForm()
      setSuccessMessage(`Theme "${variables.name}" updated!`)
    },
    onError: () => setErrorMessage('Failed to update theme.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.themes.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['themes'] })
      setSuccessMessage('Theme deleted!')
    },
    onError: () => setErrorMessage('Failed to delete theme.'),
  })

  // Handlers
  const resetForm = () => {
    setName('')
    setDescription('')
    setEditingTheme(null)
    setShowCreateForm(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    if (editingTheme) {
      updateMutation.mutate({ id: editingTheme.id, name: name.trim(), description: description.trim() || undefined })
    } else {
      createMutation.mutate({ name: name.trim(), description: description.trim() || undefined })
    }
  }

  const handleEdit = (theme: Theme) => {
    setEditingTheme(theme)
    setName(theme.name)
    setDescription(theme.description || '')
    setShowCreateForm(true)
  }

  const handleGenerateThemes = async () => {
    if (!selectedSeries) return

    setIsGenerating(true)
    setSuggestions([])
    setErrorMessage(null)

    try {
      const response = await apiClient.meetingSeries.generateThemes(selectedSeries)
      if (response.success && response.data?.suggestions) {
        setSuggestions(response.data.suggestions)
        if (response.data.suggestions.length === 0) {
          setSuccessMessage('No theme suggestions found. Try adding more meetings with summaries.')
        } else {
          setSuccessMessage(`Generated ${response.data.suggestions.length} theme suggestions!`)
        }
      } else {
        setErrorMessage('Failed to generate themes.')
      }
    } catch (error) {
      console.error('Error generating themes:', error)
      setErrorMessage('Failed to generate themes. Check the console for details.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleAcceptSuggestion = async (suggestion: ThemeSuggestion) => {
    try {
      await apiClient.themes.create({
        name: suggestion.name,
        description: suggestion.description,
        colorCode: '#3B82F6',
        icon: 'Tag',
        companyId: selectedSeries,
      })
      queryClient.invalidateQueries({ queryKey: ['themes'] })
      setSuggestions(prev => prev.filter(s => s.name !== suggestion.name))
      setSuccessMessage(`Theme "${suggestion.name}" created!`)
    } catch (error) {
      setErrorMessage('Failed to create theme.')
    }
  }

  const handleResearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!researchQuery.trim() || !selectedSeries) return

    setIsResearching(true)
    setResearchResult(null)
    setErrorMessage(null)

    try {
      const response = await apiClient.meetingSeries.research(selectedSeries, researchQuery.trim())
      if (response.success && response.data) {
        setResearchResult({
          question: response.data.question,
          answer: response.data.answer,
        })
      } else {
        setErrorMessage('Failed to get research results.')
      }
    } catch (error) {
      console.error('Error researching:', error)
      setErrorMessage('Failed to process research question.')
    } finally {
      setIsResearching(false)
    }
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="h-12 flex items-center px-6">
          <h1 className="text-sm font-semibold text-gray-900">Meeting Intelligence</h1>
        </div>
      </div>

      {/* Messages */}
      <div className="px-6 pt-4">
        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-sm text-green-800">
            <Check size={16} className="text-green-600" />
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-800">
            <AlertCircle size={16} className="text-red-600" />
            {errorMessage}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="max-w-4xl mx-auto">
          {/* Meeting Series Selector */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Meeting Series
            </label>
            <select
              value={selectedSeries}
              onChange={(e) => {
                setSelectedSeries(e.target.value)
                resetForm()
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={meetingsLoading}
            >
              <option value="">Select a meeting series...</option>
              {meetingSeries.map((series) => (
                <option key={series} value={series}>{series}</option>
              ))}
            </select>
          </div>

          {/* No Series Selected */}
          {!selectedSeries && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
              <Tag className="mx-auto mb-3 text-blue-500" size={32} />
              <h3 className="text-sm font-semibold text-blue-900 mb-1">Select a Meeting Series</h3>
              <p className="text-xs text-blue-700">
                Choose a recurring meeting to manage themes and get AI-powered insights.
              </p>
            </div>
          )}

          {/* Series Selected - Show Tabs */}
          {selectedSeries && (
            <>
              {/* Tabs */}
              <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setActiveTab('themes')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium rounded-md transition-colors ${
                    activeTab === 'themes'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Tag size={14} />
                  Themes
                </button>
                <button
                  onClick={() => setActiveTab('research')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium rounded-md transition-colors ${
                    activeTab === 'research'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <MessageSquare size={14} />
                  Research & Insights
                </button>
              </div>

              {/* Themes Tab */}
              {activeTab === 'themes' && (
                <div className="space-y-4">
                  {/* Actions Bar */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleGenerateThemes}
                      disabled={isGenerating}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-sm disabled:opacity-50"
                    >
                      {isGenerating ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Sparkles size={14} />
                      )}
                      {isGenerating ? 'Generating...' : 'Generate Themes'}
                    </button>
                    <button
                      onClick={() => setShowCreateForm(true)}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Plus size={14} />
                      Add Theme
                    </button>
                  </div>

                  {/* AI Suggestions */}
                  {suggestions.length > 0 && (
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles size={14} className="text-purple-600" />
                        <h3 className="text-sm font-semibold text-gray-900">AI Suggestions</h3>
                        <span className="text-xs text-gray-500">Click to add</span>
                      </div>
                      <div className="space-y-2">
                        {suggestions.map((suggestion) => (
                          <div
                            key={suggestion.name}
                            className="bg-white rounded-lg p-3 border border-gray-200 hover:border-purple-300 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium text-gray-900">{suggestion.name}</span>
                                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                                    suggestion.confidence === 'high'
                                      ? 'bg-green-100 text-green-700'
                                      : suggestion.confidence === 'medium'
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {suggestion.confidence}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 mb-1">{suggestion.description}</p>
                                <p className="text-xs text-gray-400 italic">{suggestion.basedOn}</p>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleAcceptSuggestion(suggestion)}
                                  className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                                  title="Accept this theme"
                                >
                                  <Check size={16} />
                                </button>
                                <button
                                  onClick={() => setSuggestions(prev => prev.filter(s => s.name !== suggestion.name))}
                                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                                  title="Dismiss"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Create/Edit Form */}
                  {showCreateForm && (
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-gray-900">
                          {editingTheme ? 'Edit Theme' : 'New Theme'}
                        </h3>
                        <button onClick={resetForm} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                          <X size={16} />
                        </button>
                      </div>
                      <form onSubmit={handleSubmit} className="space-y-3">
                        <div>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Theme name (e.g., Budget Planning, Product Roadmap)"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>
                        <div>
                          <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Description (optional) - helps AI classify content"
                            rows={2}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            disabled={createMutation.isPending || updateMutation.isPending}
                            className="px-4 py-2 text-xs font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50"
                          >
                            {editingTheme ? 'Update' : 'Create'}
                          </button>
                          <button
                            type="button"
                            onClick={resetForm}
                            className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-900"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Themes List */}
                  <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
                    {themesLoading ? (
                      <div className="p-8 text-center text-sm text-gray-500">Loading themes...</div>
                    ) : themes.length === 0 ? (
                      <div className="p-8 text-center">
                        <Tag className="mx-auto mb-2 text-gray-300" size={24} />
                        <p className="text-sm text-gray-600 mb-1">No themes yet</p>
                        <p className="text-xs text-gray-400">
                          Click "Generate Themes" to get AI suggestions or "Add Theme" to create one manually.
                        </p>
                      </div>
                    ) : (
                      themes.map((theme) => (
                        <div
                          key={theme.id}
                          className="group flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer"
                          onClick={() => router.push(`/themes/${theme.id}`)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">{theme.name}</span>
                              <ChevronRight size={14} className="text-gray-400 opacity-0 group-hover:opacity-100" />
                            </div>
                            {theme.description && (
                              <p className="text-xs text-gray-500 truncate mt-0.5">{theme.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEdit(theme); }}
                              className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Delete "${theme.name}"?`)) deleteMutation.mutate(theme.id);
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Research Tab */}
              {activeTab === 'research' && (
                <div className="space-y-4">
                  {/* Research Input */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                      Ask about "{selectedSeries}"
                    </h3>
                    <form onSubmit={handleResearchSubmit}>
                      <div className="relative">
                        <textarea
                          value={researchQuery}
                          onChange={(e) => setResearchQuery(e.target.value)}
                          placeholder="Ask for research, meeting improvement suggestions, or strategic advice based on your meeting history..."
                          rows={3}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none pr-24"
                          disabled={isResearching}
                        />
                        <button
                          type="submit"
                          disabled={!researchQuery.trim() || isResearching}
                          className="absolute right-2 bottom-2 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                          {isResearching ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Search size={14} />
                          )}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Research Result */}
                  {isResearching && (
                    <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
                      <Loader2 className="mx-auto mb-2 animate-spin text-blue-600" size={24} />
                      <p className="text-sm text-gray-600">Researching your question...</p>
                      <p className="text-xs text-gray-400 mt-1">This may take a few seconds</p>
                    </div>
                  )}

                  {researchResult && !isResearching && (
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
                        <p className="text-xs text-gray-500 mb-1">Question</p>
                        <p className="text-sm font-medium text-gray-900">{researchResult.question}</p>
                      </div>
                      <div className="p-4">
                        <div className="prose prose-sm max-w-none text-gray-700">
                          <div className="whitespace-pre-wrap">{researchResult.answer}</div>
                        </div>
                      </div>
                      <div className="border-t border-gray-100 px-4 py-2 flex justify-end">
                        <button
                          onClick={() => {
                            setResearchResult(null)
                            setResearchQuery('')
                          }}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          Clear result
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Quick Prompts */}
                  {!researchResult && !isResearching && (
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="text-xs font-medium text-gray-700 mb-3">Suggested Questions</h4>
                      <div className="space-y-2">
                        {[
                          'How can we make these meetings more productive?',
                          'What are the recurring themes from recent discussions?',
                          'Summarize key decisions made in the last month',
                          'What action items are frequently delayed or incomplete?',
                        ].map((prompt) => (
                          <button
                            key={prompt}
                            onClick={() => setResearchQuery(prompt)}
                            className="w-full text-left px-3 py-2 text-xs text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
