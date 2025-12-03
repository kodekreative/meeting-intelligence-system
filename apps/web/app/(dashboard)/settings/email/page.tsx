'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

interface EmailPreference {
  id: string
  assigneeName: string
  emailEnabled: boolean
  notes?: string
}

interface AssigneeWithTasks {
  name: string
  taskCount: number
  preference?: EmailPreference
}

export default function EmailSettingsPage() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [showOnlyWithTasks, setShowOnlyWithTasks] = useState(true)

  // Fetch email preferences
  const { data: preferencesData, isLoading: prefsLoading } = useQuery({
    queryKey: ['email-preferences'],
    queryFn: () => apiClient.emailPreferences.list(),
  })

  // Fetch all tasks to get assignee list
  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => apiClient.tasks.list(),
  })

  // Mutation for updating preferences
  const updatePreference = useMutation({
    mutationFn: (data: { assigneeName: string; emailEnabled: boolean; notes?: string }) =>
      apiClient.emailPreferences.upsert(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-preferences'] })
    },
  })

  // Build assignee list with task counts
  const assigneesWithTasks: AssigneeWithTasks[] = (() => {
    if (!tasksData?.data) return []

    const tasks = tasksData.data as Array<{
      assigneeName?: string
      status: string
    }>

    // Count tasks per assignee (only non-done tasks)
    const assigneeTaskCounts = new Map<string, number>()
    for (const task of tasks) {
      if (task.assigneeName && task.status !== 'Done') {
        const count = assigneeTaskCounts.get(task.assigneeName) || 0
        assigneeTaskCounts.set(task.assigneeName, count + 1)
      }
    }

    // Build preferences map
    const prefsMap = new Map<string, EmailPreference>()
    if (preferencesData?.data) {
      for (const pref of preferencesData.data as EmailPreference[]) {
        prefsMap.set(pref.assigneeName, pref)
      }
    }

    // Create list of assignees
    const assignees: AssigneeWithTasks[] = []

    // Add all assignees from tasks
    for (const [name, count] of assigneeTaskCounts) {
      assignees.push({
        name,
        taskCount: count,
        preference: prefsMap.get(name),
      })
    }

    // Add any assignees from preferences that don't have current tasks
    for (const pref of preferencesData?.data || []) {
      const p = pref as EmailPreference
      if (!assigneeTaskCounts.has(p.assigneeName)) {
        assignees.push({
          name: p.assigneeName,
          taskCount: 0,
          preference: p,
        })
      }
    }

    // Sort: enabled first, then by task count, then alphabetically
    return assignees.sort((a, b) => {
      const aEnabled = a.preference?.emailEnabled !== false
      const bEnabled = b.preference?.emailEnabled !== false
      if (aEnabled !== bEnabled) return aEnabled ? -1 : 1
      if (a.taskCount !== b.taskCount) return b.taskCount - a.taskCount
      return a.name.localeCompare(b.name)
    })
  })()

  // Filter assignees based on search and toggle
  const filteredAssignees = assigneesWithTasks.filter((a) => {
    if (showOnlyWithTasks && a.taskCount === 0) return false
    if (searchTerm && !a.name.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const handleToggle = (assigneeName: string, currentEnabled: boolean | undefined) => {
    // If no preference exists, default was enabled, so toggling sets to disabled
    // If preference exists, toggle it
    const newEnabled = currentEnabled === undefined ? false : !currentEnabled
    updatePreference.mutate({ assigneeName, emailEnabled: newEnabled })
  }

  const enabledCount = filteredAssignees.filter((a) => a.preference?.emailEnabled !== false).length
  const totalCount = filteredAssignees.length

  const isLoading = prefsLoading || tasksLoading

  if (isLoading) {
    return (
      <div className="h-full bg-gray-50">
        <div className="h-12 bg-white border-b border-gray-200 flex items-center px-6">
          <h1 className="text-sm font-semibold text-gray-900">Email Settings</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-gray-50">
      {/* Header */}
      <div className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-6">
        <h1 className="text-sm font-semibold text-gray-900">Email Settings</h1>
        <div className="text-xs text-gray-500">
          Daily task emails: <span className="font-medium text-blue-600">6:30 AM</span> Mon-Fri
        </div>
      </div>

      <div className="p-6 max-w-3xl">
        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="text-sm font-medium text-blue-900 mb-2">Daily Task Emails</h2>
          <p className="text-xs text-blue-700">
            Every weekday morning at 6:30 AM, you&apos;ll receive separate emails for each person&apos;s
            outstanding tasks. Use the toggles below to control which people you want to receive
            email updates for.
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between gap-4">
            {/* Search */}
            <div className="flex-1 max-w-xs">
              <input
                type="text"
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Toggle: Show only with tasks */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyWithTasks}
                onChange={(e) => setShowOnlyWithTasks(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-xs text-gray-600">Show only people with tasks</span>
            </label>

            {/* Stats */}
            <div className="text-xs text-gray-500">
              <span className="font-medium text-green-600">{enabledCount}</span>
              <span> / {totalCount} enabled</span>
            </div>
          </div>
        </div>

        {/* Assignee List */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-500">
              <div className="col-span-1">Email</div>
              <div className="col-span-5">Name</div>
              <div className="col-span-2 text-center">Open Tasks</div>
              <div className="col-span-4">Status</div>
            </div>
          </div>

          {filteredAssignees.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              No assignees found
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredAssignees.map((assignee) => {
                const isEnabled = assignee.preference?.emailEnabled !== false
                return (
                  <div
                    key={assignee.name}
                    className={`px-4 py-3 grid grid-cols-12 gap-4 items-center hover:bg-gray-50 ${
                      !isEnabled ? 'bg-gray-50/50' : ''
                    }`}
                  >
                    {/* Toggle */}
                    <div className="col-span-1">
                      <button
                        onClick={() => handleToggle(assignee.name, assignee.preference?.emailEnabled)}
                        disabled={updatePreference.isPending}
                        className={`relative w-10 h-5 rounded-full transition-colors ${
                          isEnabled ? 'bg-green-500' : 'bg-gray-300'
                        } ${updatePreference.isPending ? 'opacity-50' : ''}`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                            isEnabled ? 'translate-x-5' : ''
                          }`}
                        />
                      </button>
                    </div>

                    {/* Name */}
                    <div className="col-span-5">
                      <span className={`text-sm font-medium ${isEnabled ? 'text-gray-900' : 'text-gray-500'}`}>
                        {assignee.name}
                      </span>
                    </div>

                    {/* Task Count */}
                    <div className="col-span-2 text-center">
                      {assignee.taskCount > 0 ? (
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          {assignee.taskCount}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </div>

                    {/* Status */}
                    <div className="col-span-4">
                      <span
                        className={`text-xs ${
                          isEnabled ? 'text-green-600' : 'text-gray-500'
                        }`}
                      >
                        {isEnabled ? 'Receiving daily emails' : 'Not receiving emails'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Help Text */}
        <div className="mt-4 text-xs text-gray-500">
          <p>
            <strong>Note:</strong> People without a preference set will receive emails by default.
            Toggle off to disable emails for specific people.
          </p>
        </div>
      </div>
    </div>
  )
}
