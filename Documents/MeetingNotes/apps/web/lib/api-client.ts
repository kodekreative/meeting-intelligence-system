/**
 * API Client
 * Type-safe client for backend API requests
 */

import type { ApiResponse, Theme, CreateThemeInput, UpdateThemeInput, TagMeetingInput, TagCompanyInput, ThemeMetrics, ThemeMeeting, ThemeSummary } from './types'

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
}
