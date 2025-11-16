'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useState, useCallback, useEffect, useRef } from 'react'
import DataGrid from 'react-data-grid'
import type { Column } from 'react-data-grid'
import 'react-data-grid/lib/styles.css'

interface ActionItem {
  id: string
  taskDescription: string
  assignee?: string
  dueDate?: string
  status: string
  priority: string
  sourceMeetingId?: string
  sourceMeetingTitle?: string
  createdAt?: string
}

export default function TasksPage() {
  const queryClient = useQueryClient()
  const [selectedView, setSelectedView] = useState<'timeline' | 'assignee' | 'meeting' | 'grid'>('timeline')
  const [gridRows, setGridRows] = useState<ActionItem[]>([])

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [filterAssignee, setFilterAssignee] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'assignee' | 'status'>('dueDate')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const { data, isLoading, error } = useQuery({
    queryKey: ['action-items'],
    queryFn: () => apiClient.actionItems.list(),
  })

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, ...updates }: { id: string; [key: string]: any }) =>
      apiClient.actionItems.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action-items'] })
    },
  })

  // Grid columns configuration - must be before any conditional returns
  const columns: Column<ActionItem>[] = [
    {
      key: 'id',
      name: 'ID',
      width: 60,
      resizable: true
    },
    {
      key: 'taskDescription',
      name: 'Task Description',
      width: 300,
      resizable: true,
      editable: true
    },
    {
      key: 'assignee',
      name: 'Assignee',
      width: 120,
      resizable: true,
      editable: true
    },
    {
      key: 'status',
      name: 'Status',
      width: 100,
      resizable: true,
      editable: true,
      renderEditCell: (props: any) => (
        <select
          className="w-full h-full px-1 text-[10px] border-0 focus:outline-none"
          value={props.row.status}
          onChange={(e) => props.onRowChange({ ...props.row, status: e.target.value })}
          autoFocus
        >
          <option value="Open">Open</option>
          <option value="In Progress">In Progress</option>
          <option value="Complete">Complete</option>
          <option value="Overdue">Overdue</option>
        </select>
      )
    },
    {
      key: 'priority',
      name: 'Priority',
      width: 85,
      resizable: true,
      editable: true,
      renderEditCell: (props: any) => (
        <select
          className="w-full h-full px-1 text-[10px] border-0 focus:outline-none"
          value={props.row.priority}
          onChange={(e) => props.onRowChange({ ...props.row, priority: e.target.value })}
          autoFocus
        >
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Critical">Critical</option>
        </select>
      )
    },
    {
      key: 'dueDate',
      name: 'Due Date',
      width: 100,
      resizable: true,
      editable: true
    },
    {
      key: 'createdAt',
      name: 'Created',
      width: 100,
      resizable: true
    },
    {
      key: 'sourceMeetingTitle',
      name: 'Meeting Title',
      width: 200,
      resizable: true
    },
    {
      key: 'sourceMeetingId',
      name: 'Meeting ID',
      width: 120,
      resizable: true
    }
  ]

  // Track previous rows to detect changes
  const prevRowsRef = useRef<ActionItem[]>([])

  const handleRowsChange = useCallback((rows: ActionItem[]) => {
    setGridRows(rows)
  }, [])

  // Get unique assignees for filter
  const rawActionItems = (data?.data || []) as ActionItem[]
  const uniqueAssignees = Array.from(new Set(rawActionItems.map(item => item.assignee).filter(Boolean))).sort()

  // Apply search, filter, and sort
  const actionItems = rawActionItems
    .filter(item => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase()
        return (
          item.taskDescription?.toLowerCase().includes(search) ||
          item.assignee?.toLowerCase().includes(search) ||
          item.sourceMeetingTitle?.toLowerCase().includes(search)
        )
      }
      return true
    })
    .filter(item => {
      // Status filter
      if (filterStatus !== 'all' && item.status !== filterStatus) return false
      // Priority filter
      if (filterPriority !== 'all' && item.priority !== filterPriority) return false
      // Assignee filter
      if (filterAssignee !== 'all' && item.assignee !== filterAssignee) return false
      return true
    })
    .sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'dueDate':
          const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity
          const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity
          comparison = dateA - dateB
          break
        case 'priority':
          const priorityOrder = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 }
          comparison = (priorityOrder[a.priority as keyof typeof priorityOrder] || 0) - (priorityOrder[b.priority as keyof typeof priorityOrder] || 0)
          break
        case 'assignee':
          comparison = (a.assignee || '').localeCompare(b.assignee || '')
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

  // Sync grid rows with action items data
  useEffect(() => {
    if (actionItems && actionItems.length > 0) {
      setGridRows(actionItems)
    }
  }, [actionItems])

  // Detect changes and update backend
  useEffect(() => {
    if (prevRowsRef.current.length > 0 && gridRows.length > 0) {
      // Find changed row
      for (let i = 0; i < gridRows.length; i++) {
        const currentRow = gridRows[i]
        const prevRow = prevRowsRef.current[i]

        if (currentRow && prevRow && currentRow.id === prevRow.id) {
          // Check each field for changes
          const changedFields: Partial<ActionItem> = {}
          let hasChanges = false

          if (currentRow.taskDescription !== prevRow.taskDescription) {
            changedFields.taskDescription = currentRow.taskDescription
            hasChanges = true
          }
          if (currentRow.assignee !== prevRow.assignee) {
            changedFields.assignee = currentRow.assignee
            hasChanges = true
          }
          if (currentRow.status !== prevRow.status) {
            changedFields.status = currentRow.status
            hasChanges = true
          }
          if (currentRow.priority !== prevRow.priority) {
            changedFields.priority = currentRow.priority
            hasChanges = true
          }
          if (currentRow.dueDate !== prevRow.dueDate) {
            changedFields.dueDate = currentRow.dueDate
            hasChanges = true
          }

          if (hasChanges) {
            updateTaskMutation.mutate({
              id: currentRow.id,
              ...changedFields
            })
            break
          }
        }
      }
    }
    prevRowsRef.current = gridRows
  }, [gridRows, updateTaskMutation])

  if (isLoading) {
    return (
      <div className="h-full bg-gray-50">
        <div className="h-12 bg-white border-b border-gray-200 flex items-center px-6">
          <h1 className="text-sm font-semibold text-gray-900">Action Items</h1>
        </div>
        <div className="p-6">
          <div className="text-xs text-gray-600">Loading action items...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full bg-gray-50">
        <div className="h-12 bg-white border-b border-gray-200 flex items-center px-6">
          <h1 className="text-sm font-semibold text-gray-900">Action Items</h1>
        </div>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 px-4 py-3">
            <div className="text-xs font-medium text-red-900 mb-1">Error</div>
            <div className="text-xs text-red-700">Failed to load action items</div>
          </div>
        </div>
      </div>
    )
  }

  // Categorize tasks
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const weekEnd = new Date(today)
  weekEnd.setDate(weekEnd.getDate() + 7)

  const overdueTasks = actionItems.filter((item) => {
    if (!item.dueDate || item.status === 'Complete') return false
    const dueDate = new Date(item.dueDate)
    return dueDate < today
  })

  const todayTasks = actionItems.filter((item) => {
    if (!item.dueDate || item.status === 'Complete') return false
    const dueDate = new Date(item.dueDate)
    return dueDate >= today && dueDate < tomorrow
  })

  const weekTasks = actionItems.filter((item) => {
    if (!item.dueDate || item.status === 'Complete') return false
    const dueDate = new Date(item.dueDate)
    return dueDate >= tomorrow && dueDate < weekEnd
  })

  const laterTasks = actionItems.filter((item) => {
    if (!item.dueDate || item.status === 'Complete') return false
    const dueDate = new Date(item.dueDate)
    return dueDate >= weekEnd
  })

  const unscheduledTasks = actionItems.filter((item) => {
    return !item.dueDate && item.status !== 'Complete'
  })

  const completedTasks = actionItems.filter((item) => item.status === 'Complete')

  // Group by assignee
  const tasksByAssignee = actionItems.reduce((acc, item) => {
    const assignee = item.assignee || 'Unassigned'
    if (!acc[assignee]) {
      acc[assignee] = []
    }
    acc[assignee].push(item)
    return acc
  }, {} as Record<string, ActionItem[]>)

  // Group by meeting
  const tasksByMeeting = actionItems.reduce((acc, item) => {
    const meeting = item.sourceMeetingTitle || 'Unknown Meeting'
    if (!acc[meeting]) {
      acc[meeting] = []
    }
    acc[meeting].push(item)
    return acc
  }, {} as Record<string, ActionItem[]>)

  const handleStatusChange = (id: string, newStatus: string) => {
    updateTaskMutation.mutate({ id, status: newStatus })
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return 'text-red-700 bg-red-50'
      case 'High':
        return 'text-orange-700 bg-orange-50'
      case 'Medium':
        return 'text-yellow-700 bg-yellow-50'
      case 'Low':
        return 'text-gray-700 bg-gray-50'
      default:
        return 'text-gray-700 bg-gray-50'
    }
  }

  const TaskSection = ({ title, tasks, showCount = true }: { title: string; tasks: ActionItem[]; showCount?: boolean }) => {
    if (tasks.length === 0) return null

    return (
      <div className="bg-white border border-gray-200 mb-4">
        <div className="px-3 py-2 bg-gray-100 border-b border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xs font-semibold text-gray-900">{title}</h2>
            {showCount && <span className="text-xs text-gray-600">{tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}</span>}
          </div>
          {/* Column Headers */}
          <div className="grid grid-cols-[30px_minmax(250px,1fr)_110px_110px_90px_100px_100px_180px] gap-3 text-[10px] font-semibold text-gray-700">
            <div className="text-center">✓</div>
            <div>Task</div>
            <div>Assignee</div>
            <div>Status</div>
            <div>Priority</div>
            <div>Due Date</div>
            <div>Created</div>
            <div>Meeting</div>
          </div>
        </div>
        <div>
          {tasks.map((task) => (
            <div
              key={task.id}
              className="grid grid-cols-[30px_minmax(250px,1fr)_110px_110px_90px_100px_100px_180px] gap-3 items-center text-[11px] px-3 py-2 hover:bg-gray-50 border-b border-gray-100"
            >
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={task.status === 'Complete'}
                onChange={(e) => handleStatusChange(task.id, e.target.checked ? 'Complete' : 'Open')}
                className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />

              {/* Task Description */}
              <div className={`${task.status === 'Complete' ? 'line-through text-gray-500' : 'text-gray-900'} truncate`} title={task.taskDescription}>
                {task.taskDescription}
              </div>

              {/* Assignee */}
              <div className="text-gray-700 truncate" title={task.assignee}>
                {task.assignee || 'Unassigned'}
              </div>

              {/* Status Dropdown */}
              <select
                value={task.status}
                onChange={(e) => handleStatusChange(task.id, e.target.value)}
                className="text-[10px] border border-gray-300 rounded px-1.5 py-1 bg-white"
              >
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Complete">Complete</option>
                <option value="Overdue">Overdue</option>
              </select>

              {/* Priority Badge */}
              <span className={`text-[10px] px-2 py-0.5 rounded text-center ${getPriorityColor(task.priority)}`}>
                {task.priority}
              </span>

              {/* Due Date */}
              <div className="text-gray-600 text-[10px]">
                {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                }) : 'No due date'}
              </div>

              {/* Created Date */}
              <div className="text-gray-600 text-[10px]">
                {task.createdAt ? new Date(task.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                }) : '-'}
              </div>

              {/* Meeting Title */}
              <div className="text-gray-600 truncate text-[10px]" title={task.sourceMeetingTitle}>
                {task.sourceMeetingTitle || 'Unknown'}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="h-12 flex items-center px-6 justify-between">
          <h1 className="text-sm font-semibold text-gray-900">Action Items</h1>
          <div className="text-xs text-gray-600">
            {actionItems.length} of {rawActionItems.length} {rawActionItems.length === 1 ? 'task' : 'tasks'}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <div className="flex gap-2 items-center flex-wrap">
            {/* Search */}
            <input
              type="text"
              placeholder="Search tasks, assignees, or meetings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-[11px] border border-gray-300 rounded px-2 py-1.5 w-64"
            />

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-[11px] border border-gray-300 rounded px-2 py-1.5"
            >
              <option value="all">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Complete">Complete</option>
              <option value="Overdue">Overdue</option>
            </select>

            {/* Priority Filter */}
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="text-[11px] border border-gray-300 rounded px-2 py-1.5"
            >
              <option value="all">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>

            {/* Assignee Filter */}
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="text-[11px] border border-gray-300 rounded px-2 py-1.5"
            >
              <option value="all">All Assignees</option>
              {uniqueAssignees.map(assignee => (
                <option key={assignee} value={assignee}>{assignee}</option>
              ))}
            </select>

            {/* Sort By */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-[11px] border border-gray-300 rounded px-2 py-1.5"
            >
              <option value="dueDate">Sort by: Due Date</option>
              <option value="priority">Sort by: Priority</option>
              <option value="assignee">Sort by: Assignee</option>
              <option value="status">Sort by: Status</option>
            </select>

            {/* Sort Order */}
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="text-[11px] border border-gray-300 rounded px-2 py-1.5 hover:bg-gray-100"
            >
              {sortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
            </button>

            {/* Clear Filters */}
            {(searchTerm || filterStatus !== 'all' || filterPriority !== 'all' || filterAssignee !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setFilterStatus('all')
                  setFilterPriority('all')
                  setFilterAssignee('all')
                }}
                className="text-[11px] text-blue-600 hover:text-blue-800 ml-2"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pb-0 border-b border-gray-200">
          <button
            onClick={() => setSelectedView('timeline')}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
              selectedView === 'timeline'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            By Timeline
          </button>
          <button
            onClick={() => setSelectedView('assignee')}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
              selectedView === 'assignee'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            By Assignee
          </button>
          <button
            onClick={() => setSelectedView('meeting')}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
              selectedView === 'meeting'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            By Meeting
          </button>
          <button
            onClick={() => setSelectedView('grid')}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
              selectedView === 'grid'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            Grid View
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {actionItems.length === 0 ? (
          <div className="bg-white border border-gray-200 px-6 py-12 text-center">
            <div className="text-xs text-gray-600">No action items found</div>
            <div className="text-xs text-gray-500 mt-1">
              Action items from meetings will appear here
            </div>
          </div>
        ) : (
          <>
            {/* Timeline View */}
            {selectedView === 'timeline' && (
              <>
                {/* Daily Review Summary */}
                <div className="bg-blue-50 border border-blue-200 px-4 py-3 mb-6">
                  <div className="text-xs font-semibold text-blue-900 mb-2">Daily Review</div>
                  <div className="space-y-1 text-xs text-blue-700">
                    <div>• {overdueTasks.length} overdue {overdueTasks.length === 1 ? 'task' : 'tasks'} requiring attention</div>
                    <div>• {todayTasks.length} {todayTasks.length === 1 ? 'task' : 'tasks'} due today</div>
                    <div>• {weekTasks.length} {weekTasks.length === 1 ? 'task' : 'tasks'} due this week</div>
                  </div>
                </div>

                {/* Overdue Tasks */}
                <TaskSection title="⚠️ Overdue" tasks={overdueTasks} />

                {/* Due Today */}
                <TaskSection title="📅 Due Today" tasks={todayTasks} />

                {/* Due This Week */}
                <TaskSection title="📆 Due This Week" tasks={weekTasks} />

                {/* Later */}
                <TaskSection title="🔜 Later" tasks={laterTasks} />

                {/* Unscheduled */}
                <TaskSection title="📝 Unscheduled" tasks={unscheduledTasks} />

                {/* Completed */}
                <TaskSection title="✅ Completed" tasks={completedTasks} />
              </>
            )}

            {/* Assignee View */}
            {selectedView === 'assignee' && (
              <>
                {Object.entries(tasksByAssignee)
                  .sort(([a], [b]) => {
                    // Sort "Unassigned" last, otherwise alphabetically
                    if (a === 'Unassigned') return 1
                    if (b === 'Unassigned') return -1
                    return a.localeCompare(b)
                  })
                  .map(([assignee, tasks]) => (
                    <TaskSection
                      key={assignee}
                      title={`👤 ${assignee}`}
                      tasks={tasks}
                    />
                  ))}
              </>
            )}

            {/* Meeting View */}
            {selectedView === 'meeting' && (
              <>
                {Object.entries(tasksByMeeting)
                  .sort(([a], [b]) => {
                    // Sort "Unknown Meeting" last, otherwise alphabetically
                    if (a === 'Unknown Meeting') return 1
                    if (b === 'Unknown Meeting') return -1
                    return a.localeCompare(b)
                  })
                  .map(([meeting, tasks]) => (
                    <TaskSection
                      key={meeting}
                      title={`📋 ${meeting}`}
                      tasks={tasks}
                    />
                  ))}
              </>
            )}

            {/* Grid View */}
            {selectedView === 'grid' && (
              <div className="bg-white border border-gray-200">
                <style jsx global>{`
                  .rdg {
                    font-size: 10px;
                    --rdg-selection-color: #66b3ff;
                    --rdg-row-height: 26px;
                    --rdg-header-row-height: 28px;
                  }
                  .rdg-cell {
                    padding: 0 4px;
                    line-height: 26px;
                  }
                  .rdg-header-row .rdg-cell {
                    font-weight: 600;
                    font-size: 10px;
                    background-color: #f9fafb;
                    border-bottom: 2px solid #e5e7eb;
                    padding: 0 4px;
                  }
                  .rdg-row:hover {
                    background-color: #f9fafb;
                  }
                `}</style>
                <DataGrid
                  columns={columns}
                  rows={gridRows}
                  onRowsChange={handleRowsChange}
                  className="rdg-light"
                  style={{ height: 'calc(100vh - 200px)' }}
                  rowHeight={26}
                  headerRowHeight={28}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
