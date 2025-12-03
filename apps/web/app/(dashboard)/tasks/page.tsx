'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useState, useMemo, useEffect, useCallback } from 'react'
import { TaskList } from './components/task-list'
import { TaskKanban } from './components/task-kanban'
import { TaskGroupedList } from './components/task-grouped-list'
import { TaskNestedGroupedList } from './components/task-nested-grouped-list'
import { TaskBoardView } from './components/task-board-view'
import { CreateTaskModal, User, Meeting } from './components/create-task-modal'
import { TaskDetailModal } from './components/task-detail-modal'
import { MultiSelectDropdown } from './components/multi-select-dropdown'

export interface Task {
  id: string
  name: string
  description?: string
  status: 'Open' | 'In Progress' | 'Blocked' | 'Completed'
  priority: 'Low' | 'Medium' | 'High' | 'Critical'
  assigneeId?: string
  assigneeName?: string
  dueDate?: string
  companyId?: string
  source: 'Action Item' | 'Manual'
  sourceActionItemId?: string
  sourceMeetingId?: string
  sourceMeetingTitle?: string
  completedDate?: string
  createdTime?: string
  stackId?: string
  stackOrder?: number
}

type GroupByOption = 'none' | 'assignee' | 'meeting' | 'date' | 'status'

const STORAGE_KEY = 'tasks-view-preferences'

// Status options
const STATUS_OPTIONS = [
  { value: 'Open', label: 'Open' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Blocked', label: 'Blocked' },
  { value: 'Completed', label: 'Completed' },
]

// Priority options
const PRIORITY_OPTIONS = [
  { value: 'Critical', label: 'Critical' },
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' },
]

// Source options
const SOURCE_OPTIONS = [
  { value: 'Action Item', label: 'Action Items' },
  { value: 'Manual', label: 'Manual' },
]

// Default filter values - Open = not Completed
const DEFAULT_STATUS_FILTER = new Set(['Open', 'In Progress', 'Blocked'])
const DEFAULT_PRIORITY_FILTER = new Set(['Low', 'Medium', 'High', 'Critical'])
const DEFAULT_SOURCE_FILTER = new Set(['Action Item', 'Manual'])

interface TaskPreferences {
  selectedView: 'list' | 'kanban' | 'board'
  primaryGroupBy: GroupByOption
  secondaryGroupBy: GroupByOption
  tertiaryGroupBy: GroupByOption
  filterStatus: string[]
  filterPriority: string[]
  filterSource: string[]
}

const loadPreferences = (): TaskPreferences | null => {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.warn('Failed to load task preferences:', e)
  }
  return null
}

const savePreferences = (prefs: TaskPreferences) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch (e) {
    console.warn('Failed to save task preferences:', e)
  }
}

export default function TasksPage() {
  const queryClient = useQueryClient()
  const [isInitialized, setIsInitialized] = useState(false)
  const [selectedView, setSelectedView] = useState<'list' | 'kanban' | 'board'>('list')
  // Default to Assignee -> Meeting -> Date Created
  const [primaryGroupBy, setPrimaryGroupBy] = useState<GroupByOption>('assignee')
  const [secondaryGroupBy, setSecondaryGroupBy] = useState<GroupByOption>('meeting')
  const [tertiaryGroupBy, setTertiaryGroupBy] = useState<GroupByOption>('date')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  // Search and filter state - using Sets for multi-select
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<Set<string>>(DEFAULT_STATUS_FILTER)
  const [filterPriority, setFilterPriority] = useState<Set<string>>(DEFAULT_PRIORITY_FILTER)
  const [filterSource, setFilterSource] = useState<Set<string>>(DEFAULT_SOURCE_FILTER)
  const [filterAssignees, setFilterAssignees] = useState<Set<string>>(new Set())

  // Load preferences from localStorage on mount
  useEffect(() => {
    const prefs = loadPreferences()
    if (prefs) {
      setSelectedView(prefs.selectedView)
      setPrimaryGroupBy(prefs.primaryGroupBy)
      setSecondaryGroupBy(prefs.secondaryGroupBy)
      setTertiaryGroupBy(prefs.tertiaryGroupBy || 'date')
      if (prefs.filterStatus.length > 0) {
        setFilterStatus(new Set(prefs.filterStatus))
      }
      if (prefs.filterPriority.length > 0) {
        setFilterPriority(new Set(prefs.filterPriority))
      }
      if (prefs.filterSource.length > 0) {
        setFilterSource(new Set(prefs.filterSource))
      }
    }
    setIsInitialized(true)
  }, [])

  // Save preferences to localStorage when they change
  const saveCurrentPreferences = useCallback(() => {
    if (!isInitialized) return
    savePreferences({
      selectedView,
      primaryGroupBy,
      secondaryGroupBy,
      tertiaryGroupBy,
      filterStatus: Array.from(filterStatus),
      filterPriority: Array.from(filterPriority),
      filterSource: Array.from(filterSource),
    })
  }, [isInitialized, selectedView, primaryGroupBy, secondaryGroupBy, tertiaryGroupBy, filterStatus, filterPriority, filterSource])

  useEffect(() => {
    saveCurrentPreferences()
  }, [saveCurrentPreferences])

  const { data, isLoading, error } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => apiClient.tasks.list(),
  })

  // Fetch users for assignee dropdown
  const { data: usersData, error: usersError } = useQuery({
    queryKey: ['tasks-users'],
    queryFn: async () => {
      const result = await apiClient.tasks.getUsers()
      console.log('Users API result:', result)
      return result
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Log users error if any
  if (usersError) {
    console.error('Users fetch error:', usersError)
  }

  // Fetch meetings for linking dropdown
  const { data: meetingsData } = useQuery({
    queryKey: ['tasks-meetings'],
    queryFn: () => apiClient.tasks.getMeetings(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })

  const users = useMemo(() => (usersData?.data || []) as User[], [usersData])
  const meetings = useMemo(() => (meetingsData?.data || []) as Meeting[], [meetingsData])

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, ...updates }: { id: string; [key: string]: any }) =>
      apiClient.tasks.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const createTaskMutation = useMutation({
    mutationFn: (data: Parameters<typeof apiClient.tasks.create>[0]) =>
      apiClient.tasks.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setIsCreateModalOpen(false)
    },
  })

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => apiClient.tasks.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setSelectedTask(null)
    },
  })

  // Get raw tasks from API
  const rawTasks = useMemo(() => (data?.data || []) as Task[], [data])

  // Get unique assignees for filter dropdown
  const uniqueAssignees = useMemo(() => {
    const assignees = new Set<string>()
    rawTasks.forEach(task => {
      if (task.assigneeName) assignees.add(task.assigneeName)
    })
    return Array.from(assignees).sort()
  }, [rawTasks])

  // Assignee options for multi-select
  const assigneeOptions = useMemo(() => {
    return uniqueAssignees.map(name => ({ value: name, label: name }))
  }, [uniqueAssignees])

  // Apply filters
  const tasks = useMemo(() => {
    return rawTasks
      .filter(task => {
        // Search filter
        if (searchTerm) {
          const search = searchTerm.toLowerCase()
          return (
            task.name?.toLowerCase().includes(search) ||
            task.description?.toLowerCase().includes(search) ||
            task.assigneeName?.toLowerCase().includes(search) ||
            task.sourceMeetingTitle?.toLowerCase().includes(search)
          )
        }
        return true
      })
      .filter(task => {
        // Status filter - if no statuses selected, show all
        if (filterStatus.size > 0 && !filterStatus.has(task.status)) return false
        // Priority filter - if no priorities selected, show all
        if (filterPriority.size > 0 && !filterPriority.has(task.priority)) return false
        // Source filter - if no sources selected, show all
        if (filterSource.size > 0 && !filterSource.has(task.source)) return false
        // Assignee filter - if no assignees selected, show all
        if (filterAssignees.size > 0) {
          if (!task.assigneeName || !filterAssignees.has(task.assigneeName)) return false
        }
        return true
      })
  }, [rawTasks, searchTerm, filterStatus, filterPriority, filterSource, filterAssignees])

  // Helper function to get group key for a task
  const getGroupKey = (task: Task, groupBy: GroupByOption): string => {
    switch (groupBy) {
      case 'assignee':
        return task.assigneeName || 'Unassigned'
      case 'meeting':
        return task.sourceMeetingTitle || 'No Meeting'
      case 'date':
        if (task.createdTime) {
          const date = new Date(task.createdTime)
          return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })
        }
        return 'Unknown Date'
      case 'status':
        return task.status
      default:
        return 'All'
    }
  }

  // Sort helper for groups
  const sortGroups = (entries: [string, unknown][], groupBy: GroupByOption) => {
    return entries.sort(([a], [b]) => {
      if (groupBy === 'status') {
        const order = ['Open', 'In Progress', 'Blocked', 'Completed']
        return order.indexOf(a) - order.indexOf(b)
      }
      if (groupBy === 'date') {
        if (a === 'Unknown Date') return 1
        if (b === 'Unknown Date') return -1
        return new Date(b).getTime() - new Date(a).getTime()
      }
      if (a === 'Unassigned' || a === 'No Meeting') return 1
      if (b === 'Unassigned' || b === 'No Meeting') return -1
      return a.localeCompare(b)
    })
  }

  // Nested grouped tasks for List view (supports 3 levels)
  const nestedGroupedTasks = useMemo(() => {
    if (primaryGroupBy === 'none') return null

    // Primary grouping
    const primaryGroups: Record<string, Task[]> = {}
    tasks.forEach(task => {
      const key = getGroupKey(task, primaryGroupBy)
      if (!primaryGroups[key]) primaryGroups[key] = []
      primaryGroups[key].push(task)
    })

    // If no secondary grouping, return simple structure
    if (secondaryGroupBy === 'none') {
      const sorted = sortGroups(Object.entries(primaryGroups), primaryGroupBy)
      return sorted.map(([key, tasks]) => ({
        primaryKey: key,
        tasks: tasks as Task[],
        secondaryGroups: null
      }))
    }

    // Secondary grouping within each primary group
    const result = Object.entries(primaryGroups).map(([primaryKey, primaryTasks]) => {
      const secondaryGroups: Record<string, Task[]> = {}
      primaryTasks.forEach(task => {
        const key = getGroupKey(task, secondaryGroupBy)
        if (!secondaryGroups[key]) secondaryGroups[key] = []
        secondaryGroups[key].push(task)
      })

      const sortedSecondary = sortGroups(Object.entries(secondaryGroups), secondaryGroupBy)

      // If no tertiary grouping, return secondary structure without tertiary
      if (tertiaryGroupBy === 'none') {
        return {
          primaryKey,
          tasks: primaryTasks,
          secondaryGroups: sortedSecondary.map(([key, tasks]) => ({
            key,
            tasks: tasks as Task[],
            tertiaryGroups: null
          }))
        }
      }

      // Tertiary grouping within each secondary group
      return {
        primaryKey,
        tasks: primaryTasks,
        secondaryGroups: sortedSecondary.map(([secondaryKey, secondaryTasks]) => {
          const tertiaryGroups: Record<string, Task[]> = {}
          ;(secondaryTasks as Task[]).forEach(task => {
            const key = getGroupKey(task, tertiaryGroupBy)
            if (!tertiaryGroups[key]) tertiaryGroups[key] = []
            tertiaryGroups[key].push(task)
          })

          const sortedTertiary = sortGroups(Object.entries(tertiaryGroups), tertiaryGroupBy)

          return {
            key: secondaryKey,
            tasks: secondaryTasks as Task[],
            tertiaryGroups: sortedTertiary.map(([key, tasks]) => ({
              key,
              tasks: tasks as Task[]
            }))
          }
        })
      }
    })

    // Sort primary groups
    result.sort((a, b) => {
      if (primaryGroupBy === 'status') {
        const order = ['Open', 'In Progress', 'Blocked', 'Completed']
        return order.indexOf(a.primaryKey) - order.indexOf(b.primaryKey)
      }
      if (primaryGroupBy === 'date') {
        if (a.primaryKey === 'Unknown Date') return 1
        if (b.primaryKey === 'Unknown Date') return -1
        return new Date(b.primaryKey).getTime() - new Date(a.primaryKey).getTime()
      }
      if (a.primaryKey === 'Unassigned' || a.primaryKey === 'No Meeting') return 1
      if (b.primaryKey === 'Unassigned' || b.primaryKey === 'No Meeting') return -1
      return a.primaryKey.localeCompare(b.primaryKey)
    })

    return result
  }, [tasks, primaryGroupBy, secondaryGroupBy, tertiaryGroupBy])

  const handleStatusChange = (id: string, newStatus: Task['status']) => {
    updateTaskMutation.mutate({ id, status: newStatus })
  }

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
  }

  const handleCreateTask = (data: Parameters<typeof apiClient.tasks.create>[0]) => {
    createTaskMutation.mutate(data)
  }

  const handleUpdateTask = (id: string, data: Parameters<typeof apiClient.tasks.update>[1]) => {
    updateTaskMutation.mutate({ id, ...data })
  }

  const handleDeleteTask = (id: string) => {
    deleteTaskMutation.mutate(id)
  }

  // Check if filters are at default
  const isDefaultFilters = useMemo(() => {
    const statusDefault = filterStatus.size === 3 &&
      filterStatus.has('Open') &&
      filterStatus.has('In Progress') &&
      filterStatus.has('Blocked') &&
      !filterStatus.has('Completed')
    const priorityDefault = filterPriority.size === 4
    const sourceDefault = filterSource.size === 2
    const assigneeDefault = filterAssignees.size === 0
    const groupDefault = primaryGroupBy === 'assignee' && secondaryGroupBy === 'meeting' && tertiaryGroupBy === 'date'

    return statusDefault && priorityDefault && sourceDefault && assigneeDefault && groupDefault && !searchTerm
  }, [filterStatus, filterPriority, filterSource, filterAssignees, primaryGroupBy, secondaryGroupBy, tertiaryGroupBy, searchTerm])

  const handleReset = () => {
    setSearchTerm('')
    setFilterStatus(new Set(DEFAULT_STATUS_FILTER))
    setFilterPriority(new Set(DEFAULT_PRIORITY_FILTER))
    setFilterSource(new Set(DEFAULT_SOURCE_FILTER))
    setFilterAssignees(new Set())
    setPrimaryGroupBy('assignee')
    setSecondaryGroupBy('meeting')
    setTertiaryGroupBy('date')
  }

  if (isLoading) {
    return (
      <div className="h-full bg-gray-50">
        <div className="h-12 bg-white border-b border-gray-200 flex items-center px-6">
          <h1 className="text-sm font-semibold text-gray-900">Tasks</h1>
        </div>
        <div className="p-6">
          <div className="text-xs text-gray-600">Loading tasks...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full bg-gray-50">
        <div className="h-12 bg-white border-b border-gray-200 flex items-center px-6">
          <h1 className="text-sm font-semibold text-gray-900">Tasks</h1>
        </div>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 px-4 py-3">
            <div className="text-xs font-medium text-red-900 mb-1">Error</div>
            <div className="text-xs text-red-700">Failed to load tasks</div>
          </div>
        </div>
      </div>
    )
  }

  // Count tasks by status for summary
  const statusCounts = {
    Open: tasks.filter(t => t.status === 'Open').length,
    'In Progress': tasks.filter(t => t.status === 'In Progress').length,
    Blocked: tasks.filter(t => t.status === 'Blocked').length,
    Done: tasks.filter(t => t.status === 'Completed').length,
  }

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="h-12 flex items-center px-6 justify-between">
          <h1 className="text-sm font-semibold text-gray-900">Tasks</h1>
          <div className="flex items-center gap-4">
            <div className="text-xs text-gray-600">
              {tasks.length} of {rawTasks.length} {rawTasks.length === 1 ? 'task' : 'tasks'}
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 transition-colors"
            >
              + Add Task
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <div className="flex gap-2 items-center flex-wrap">
            {/* Search */}
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-[11px] border border-gray-300 rounded px-2 py-1.5 w-48"
            />

            {/* Primary Group By */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-gray-500">Group:</span>
              <select
                value={primaryGroupBy}
                onChange={(e) => {
                  const newPrimary = e.target.value as GroupByOption
                  setPrimaryGroupBy(newPrimary)
                  // Reset secondary if it matches primary
                  if (secondaryGroupBy === newPrimary) {
                    setSecondaryGroupBy('none')
                  }
                }}
                className="text-[11px] border border-gray-300 rounded px-2 py-1.5 bg-blue-50 border-blue-300"
              >
                <option value="none">None</option>
                <option value="assignee">Assignee</option>
                <option value="meeting">Meeting</option>
                <option value="date">Date Created</option>
                <option value="status">Status</option>
              </select>
            </div>

            {/* Secondary Group By (Then by) */}
            {primaryGroupBy !== 'none' && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-gray-500">Then:</span>
                <select
                  value={secondaryGroupBy}
                  onChange={(e) => {
                    const newSecondary = e.target.value as GroupByOption
                    setSecondaryGroupBy(newSecondary)
                    // Reset tertiary if it matches secondary
                    if (tertiaryGroupBy === newSecondary) {
                      setTertiaryGroupBy('none')
                    }
                  }}
                  className="text-[11px] border border-gray-300 rounded px-2 py-1.5 bg-purple-50 border-purple-300"
                >
                  <option value="none">None</option>
                  {primaryGroupBy !== 'assignee' && <option value="assignee">Assignee</option>}
                  {primaryGroupBy !== 'meeting' && <option value="meeting">Meeting</option>}
                  {primaryGroupBy !== 'date' && <option value="date">Date Created</option>}
                  {primaryGroupBy !== 'status' && <option value="status">Status</option>}
                </select>
              </div>
            )}

            {/* Tertiary Group By (Then by) */}
            {primaryGroupBy !== 'none' && secondaryGroupBy !== 'none' && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-gray-500">Then:</span>
                <select
                  value={tertiaryGroupBy}
                  onChange={(e) => setTertiaryGroupBy(e.target.value as GroupByOption)}
                  className="text-[11px] border border-gray-300 rounded px-2 py-1.5 bg-green-50 border-green-300"
                >
                  <option value="none">None</option>
                  {primaryGroupBy !== 'assignee' && secondaryGroupBy !== 'assignee' && <option value="assignee">Assignee</option>}
                  {primaryGroupBy !== 'meeting' && secondaryGroupBy !== 'meeting' && <option value="meeting">Meeting</option>}
                  {primaryGroupBy !== 'date' && secondaryGroupBy !== 'date' && <option value="date">Date Created</option>}
                  {primaryGroupBy !== 'status' && secondaryGroupBy !== 'status' && <option value="status">Status</option>}
                </select>
              </div>
            )}

            {/* Assignee Filter - Multi-select */}
            <MultiSelectDropdown
              options={assigneeOptions}
              selected={filterAssignees}
              onChange={setFilterAssignees}
              placeholder="All Assignees"
              allLabel="All Assignees"
            />

            {/* Status Filter - Multi-select */}
            <MultiSelectDropdown
              options={STATUS_OPTIONS}
              selected={filterStatus}
              onChange={setFilterStatus}
              placeholder="No Status"
              allLabel="All Statuses"
            />

            {/* Priority Filter - Multi-select */}
            <MultiSelectDropdown
              options={PRIORITY_OPTIONS}
              selected={filterPriority}
              onChange={setFilterPriority}
              placeholder="No Priority"
              allLabel="All Priorities"
            />

            {/* Source Filter - Multi-select */}
            <MultiSelectDropdown
              options={SOURCE_OPTIONS}
              selected={filterSource}
              onChange={setFilterSource}
              placeholder="No Source"
              allLabel="All Sources"
            />

            {/* Clear Filters */}
            {!isDefaultFilters && (
              <button
                onClick={handleReset}
                className="text-[11px] text-blue-600 hover:text-blue-800 ml-2"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex gap-1 px-6 pb-0 border-b border-gray-200">
          <button
            onClick={() => setSelectedView('list')}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
              selectedView === 'list'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            List View
          </button>
          <button
            onClick={() => setSelectedView('kanban')}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
              selectedView === 'kanban'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            Kanban
          </button>
          <button
            onClick={() => setSelectedView('board')}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
              selectedView === 'board'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            Board
          </button>
        </div>
      </div>

      {/* Status Summary */}
      <div className="bg-white border-b border-gray-200 px-6 py-2 flex-shrink-0">
        <div className="flex gap-4">
          <div className="text-xs">
            <span className="text-gray-500">Open:</span>{' '}
            <span className="font-medium text-gray-700">{statusCounts.Open}</span>
          </div>
          <div className="text-xs">
            <span className="text-gray-500">In Progress:</span>{' '}
            <span className="font-medium text-blue-600">{statusCounts['In Progress']}</span>
          </div>
          <div className="text-xs">
            <span className="text-gray-500">Blocked:</span>{' '}
            <span className="font-medium text-red-600">{statusCounts.Blocked}</span>
          </div>
          <div className="text-xs">
            <span className="text-gray-500">Done:</span>{' '}
            <span className="font-medium text-green-600">{statusCounts.Done}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {tasks.length === 0 ? (
          <div className="bg-white border border-gray-200 px-6 py-12 text-center">
            <div className="text-xs text-gray-600">No tasks found</div>
            <div className="text-xs text-gray-500 mt-1">
              {rawTasks.length === 0
                ? 'Create your first task to get started'
                : 'Try adjusting your filters'}
            </div>
            {rawTasks.length === 0 && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-4 text-xs bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                + Create Task
              </button>
            )}
          </div>
        ) : (
          <>
            {selectedView === 'list' && (
              primaryGroupBy !== 'none' && nestedGroupedTasks ? (
                <TaskNestedGroupedList
                  nestedGroups={nestedGroupedTasks}
                  primaryGroupBy={primaryGroupBy}
                  secondaryGroupBy={secondaryGroupBy}
                  tertiaryGroupBy={tertiaryGroupBy}
                  onStatusChange={handleStatusChange}
                  onTaskClick={handleTaskClick}
                />
              ) : (
                <TaskList
                  tasks={tasks}
                  onStatusChange={handleStatusChange}
                  onTaskClick={handleTaskClick}
                />
              )
            )}
            {selectedView === 'kanban' && (
              <TaskKanban
                tasks={tasks}
                onStatusChange={handleStatusChange}
                onTaskClick={handleTaskClick}
              />
            )}
            {selectedView === 'board' && (
              <TaskBoardView
                tasks={tasks}
                onStatusChange={handleStatusChange}
                onTaskClick={handleTaskClick}
              />
            )}
          </>
        )}
      </div>

      {/* Create Task Modal */}
      {isCreateModalOpen && (
        <CreateTaskModal
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={handleCreateTask}
          isLoading={createTaskMutation.isPending}
          users={users}
          meetings={meetings}
        />
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleUpdateTask}
          onDelete={handleDeleteTask}
          isUpdating={updateTaskMutation.isPending}
          isDeleting={deleteTaskMutation.isPending}
        />
      )}
    </div>
  )
}
