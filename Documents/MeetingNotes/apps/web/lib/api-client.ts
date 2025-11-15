/**
 * API Client
 * Type-safe client for backend API requests
 */

import type { ApiResponse } from 'shared/types'

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

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
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

    return data.data as T
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

  // Meetings
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

  // Dashboard
  dashboard: {
    today: () => fetchApi('/dashboard/today'),
  },
}
