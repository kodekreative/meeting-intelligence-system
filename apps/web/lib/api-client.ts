/**
 * API Client
 * Type-safe client for backend API requests
 */

import type {
  ApiResponse,
  Theme,
  CreateThemeInput,
  UpdateThemeInput,
  TagMeetingInput,
  TagCompanyInput,
  ThemeMetrics,
  ThemeMeeting,
  ThemeSummary,
  AdvisorSuggestionsResponse,
  AdvisorRecord,
  AskAdvisorInput,
  UpdateAdvisorInput,
  AdvisorHistoryResponse,
} from './types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
const API_BASE = `${API_URL}/api/v1`

export class ApiError extends Error {
  statusCode: number
  code?: string

  constructor(message: string, statusCode: number, code?: string) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.name = 'ApiError'
  }
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const url = `${API_BASE}${endpoint}`

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    const data = (await response.json()) as ApiResponse<T>

    if (!response.ok || !data.success) {
      throw new ApiError(
        data.error?.message || 'An error occurred',
        response.status,
        data.error?.code
      )
    }

    return data
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError('Network error', 500)
  }
}

/**
 * API Client Methods
 */
export const apiClient = {
  // Health check
  health: () => fetch(`${API_URL}/health`).then((res) => res.json()),

  // Meetings - simple methods for compatibility
  getMeetings: (params?: {
    fromDate?: string
    toDate?: string
    companyId?: string
    status?: string
    limit?: number
  }) => {
    const query = params ? new URLSearchParams(params as Record<string, string>) : ''
    return fetchApi(`/meetings${query ? `?${query}` : ''}`)
  },
  getMeeting: (id: string) => fetchApi(`/meetings/${id}`),

  // Meetings - organized methods
  meetings: {
    list: (params?: {
      fromDate?: string
      toDate?: string
      companyId?: string
      status?: string
      limit?: number
    }) => {
      const query = new URLSearchParams(params as Record<string, string>)
      return fetchApi(`/meetings?${query}`)
    },
    get: (id: string) => fetchApi(`/meetings/${id}`),
    today: () => fetchApi('/meetings/filter/today'),
    analyzeThemes: (id: string) =>
      fetchApi(`/meetings/${id}/analyze-themes`, {
        method: 'POST',
      }),
    getThemeSummaries: (id: string) =>
      fetchApi<ThemeSummary[]>(`/meetings/${id}/theme-summaries`),
  },

  // Companies
  companies: {
    list: (params?: { type?: string; relationshipStatus?: string }) => {
      const query = new URLSearchParams(params as Record<string, string>)
      return fetchApi(`/companies?${query}`)
    },
  },

  // Contacts
  contacts: {
    list: (params?: { companyId?: string; email?: string }) => {
      const query = new URLSearchParams(params as Record<string, string>)
      return fetchApi(`/contacts?${query}`)
    },
  },

  // Action Items
  actionItems: {
    list: (params?: {
      assigneeId?: string
      status?: string
      dueBefore?: string
      dueAfter?: string
    }) => {
      const query = new URLSearchParams(params as Record<string, string>)
      return fetchApi(`/action-items?${query}`)
    },
    myTasks: () => fetchApi('/action-items/filter/my-tasks'),
    update: (id: string, data: unknown) =>
      fetchApi(`/action-items/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },

  // Email Preferences (for daily email toggles)
  emailPreferences: {
    list: () => fetchApi('/action-items/email-preferences'),
    getMap: () => fetchApi<Record<string, boolean>>('/action-items/email-preferences/map'),
    upsert: (data: { assigneeName: string; emailEnabled: boolean; notes?: string }) =>
      fetchApi('/action-items/email-preferences', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  // Dashboard
  dashboard: {
    today: () => fetchApi('/dashboard/today'),
  },

  // Themes
  themes: {
    list: (params?: { companyId?: string; isActive?: boolean }) => {
      const query = params ? new URLSearchParams(
        Object.entries(params).reduce((acc, [key, val]) => ({ ...acc, [key]: String(val) }), {})
      ) : ''
      return fetchApi<Theme[]>(`/themes${query ? `?${query}` : ''}`)
    },
    get: (id: string) => fetchApi<Theme>(`/themes/${id}`),
    create: (data: CreateThemeInput) =>
      fetchApi<Theme>('/themes', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: UpdateThemeInput) =>
      fetchApi<Theme>(`/themes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      fetchApi<{ success: boolean; message: string }>(`/themes/${id}`, {
        method: 'DELETE',
      }),
    tag: (data: TagMeetingInput) =>
      fetchApi('/themes/tag', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    untag: (meetingId: string, themeId: string) =>
      fetchApi('/themes/untag', {
        method: 'DELETE',
        body: JSON.stringify({ meetingId, themeId }),
      }),
    tagCompany: (data: TagCompanyInput) =>
      fetchApi('/themes/tag-company', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    untagCompany: (companyId: string, themeId: string) =>
      fetchApi('/themes/untag-company', {
        method: 'DELETE',
        body: JSON.stringify({ companyId, themeId }),
      }),
    getCompanies: (themeId: string) =>
      fetchApi(`/themes/${themeId}/companies`),
    getMeetings: (themeId: string) =>
      fetchApi<ThemeMeeting[]>(`/themes/${themeId}/meetings`),
    getMetrics: (themeId: string) =>
      fetchApi<ThemeMetrics>(`/themes/${themeId}/metrics`),
  },

  // Tasks
  tasks: {
    list: (params?: {
      status?: string
      priority?: string
      assigneeId?: string
      companyId?: string
      source?: string
      search?: string
    }) => {
      const query = params ? new URLSearchParams(
        Object.entries(params)
          .filter(([_, val]) => val !== undefined && val !== '')
          .reduce((acc, [key, val]) => ({ ...acc, [key]: String(val) }), {})
      ) : ''
      return fetchApi(`/tasks${query ? `?${query}` : ''}`)
    },
    get: (id: string) => fetchApi(`/tasks/${id}`),
    create: (data: {
      name: string
      description?: string
      status?: string
      priority?: string
      assigneeId?: string
      assigneeName?: string
      dueDate?: string
      companyId?: string
      source?: string
      sourceActionItemId?: string
      sourceMeetingId?: string
    }) =>
      fetchApi('/tasks', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: {
      name?: string
      description?: string
      status?: string
      priority?: string
      assigneeId?: string | null
      dueDate?: string | null
      companyId?: string | null
      completedDate?: string | null
    }) =>
      fetchApi(`/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      fetchApi(`/tasks/${id}`, {
        method: 'DELETE',
      }),
    statsByStatus: () => fetchApi('/tasks/stats/by-status'),
    getUsers: () => fetchApi<{ id: string; fullName: string; email: string }[]>('/tasks/users'),
    getMeetings: () => fetchApi<{ id: string; title: string; startTime: string }[]>('/tasks/meetings'),
  },

  // Task Stacks (for hierarchical task organization)
  stacks: {
    list: (params?: { boardId?: string }) => {
      const query = params?.boardId ? `?boardId=${params.boardId}` : ''
      return fetchApi(`/stacks${query}`)
    },
    get: (id: string) => fetchApi(`/stacks/${id}`),
    create: (data: {
      name: string
      type?: 'Assignee' | 'Meeting' | 'Custom'
      parentStackId?: string
      order?: number
      color?: string
      isCollapsed?: boolean
      ownerId?: string
      boardId?: string
    }) =>
      fetchApi('/stacks', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: {
      name?: string
      type?: 'Assignee' | 'Meeting' | 'Custom'
      parentStackId?: string
      order?: number
      color?: string
      isCollapsed?: boolean
      ownerId?: string
      boardId?: string
    }) =>
      fetchApi(`/stacks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      fetchApi(`/stacks/${id}`, {
        method: 'DELETE',
      }),
    bulkUpdate: (updates: { id: string; order?: number; parentStackId?: string }[]) =>
      fetchApi('/stacks/bulk-update', {
        method: 'POST',
        body: JSON.stringify({ updates }),
      }),
    assignTask: (taskId: string, stackId: string | null, stackOrder?: number) =>
      fetchApi('/stacks/assign-task', {
        method: 'POST',
        body: JSON.stringify({ taskId, stackId, stackOrder }),
      }),
    bulkAssignTasks: (assignments: { taskId: string; stackId?: string; stackOrder?: number }[]) =>
      fetchApi('/stacks/bulk-assign-tasks', {
        method: 'POST',
        body: JSON.stringify({ assignments }),
      }),
    autoGenerate: (type: 'assignee' | 'meeting') =>
      fetchApi('/stacks/auto-generate', {
        method: 'POST',
        body: JSON.stringify({ type }),
      }),
  },

  // Task Boards (for organizing stacks into boards like "Work", "Personal")
  boards: {
    list: () => fetchApi('/boards'),
    get: (id: string) => fetchApi(`/boards/${id}`),
    create: (data: {
      name: string
      description?: string
      order?: number
      ownerId?: string
      isDefault?: boolean
    }) =>
      fetchApi('/boards', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: {
      name?: string
      description?: string
      order?: number
      ownerId?: string
      isDefault?: boolean
    }) =>
      fetchApi(`/boards/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      fetchApi(`/boards/${id}`, {
        method: 'DELETE',
      }),
    getLists: (boardId: string) => fetchApi(`/boards/${boardId}/lists`),
  },

  // Theme Advisor
  advisor: {
    getSuggestions: (themeId: string) =>
      fetchApi<AdvisorSuggestionsResponse>(`/themes/${themeId}/advisor/suggestions`, {
        method: 'POST',
      }),
    refreshSuggestions: (themeId: string) =>
      fetchApi<AdvisorSuggestionsResponse>(`/themes/${themeId}/advisor/suggestions?refresh=true`, {
        method: 'POST',
      }),
    ask: (themeId: string, input: AskAdvisorInput) =>
      fetchApi<AdvisorRecord>(`/themes/${themeId}/advisor/ask`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    getHistory: (themeId: string, params?: { limit?: number; offset?: number; pinnedOnly?: boolean; search?: string }) => {
      const query = params ? new URLSearchParams(
        Object.entries(params)
          .filter(([_, val]) => val !== undefined && val !== '')
          .reduce((acc, [key, val]) => ({ ...acc, [key]: String(val) }), {})
      ) : ''
      return fetchApi<AdvisorHistoryResponse>(`/themes/${themeId}/advisor/history${query ? `?${query}` : ''}`)
    },
    update: (themeId: string, recordId: string, input: UpdateAdvisorInput) =>
      fetchApi(`/themes/${themeId}/advisor/${recordId}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
  },

  // Meeting Series Intelligence
  meetingSeries: {
    generateThemes: (seriesName: string) =>
      fetchApi<{
        seriesName: string
        suggestions: Array<{
          name: string
          description: string
          confidence: 'high' | 'medium' | 'low'
          basedOn: string
        }>
        generatedAt: string
      }>(`/meeting-series/${encodeURIComponent(seriesName)}/generate-themes`, {
        method: 'POST',
      }),
    research: (seriesName: string, question: string) =>
      fetchApi<{
        question: string
        answer: string
        meetingsReferenced: string[]
        createdAt: string
      }>(`/meeting-series/${encodeURIComponent(seriesName)}/research`, {
        method: 'POST',
        body: JSON.stringify({ question }),
      }),
  },
}
