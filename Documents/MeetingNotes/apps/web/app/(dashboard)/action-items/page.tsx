'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useState } from 'react'

interface ActionItem {
  id: string
  taskDescription: string
  dueDate?: string
  status: string
  priority: string
}

export default function TasksPage() {
  const queryClient = useQueryClient()
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'overdue' | 'today' | 'week'>('all')

  const { data, isLoading, error } = useQuery({
    queryKey: ['action-items'],
    queryFn: () => apiClient.actionItems.list(),
  })

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiClient.actionItems.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action-items'] })
    },
  })

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

  const actionItems = (data?.data || []) as ActionItem[]

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

  const completedTasks = actionItems.filter((item) => item.status === 'Complete')

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
        <div className="px-4 py-2 bg-gray-100 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xs font-semibold text-gray-900">{title}</h2>
          {showCount && <span className="text-xs text-gray-600">{tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}</span>}
        </div>
        <div className="divide-y divide-gray-100">
          {tasks.map((task) => (
            <div key={task.id} className="px-4 py-3 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={task.status === 'Complete'}
                      onChange={(e) => handleStatusChange(task.id, e.target.checked ? 'Complete' : 'Open')}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className={`text-xs ${task.status === 'Complete' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                      {task.taskDescription}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-6">
                    {task.dueDate && (
                      <div className="text-[11px] text-gray-600">
                        Due: {new Date(task.dueDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                    )}
                    {task.priority && (
                      <span className={`text-[10px] px-2 py-0.5 rounded ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    )}
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChange(task.id, e.target.value)}
                      className="text-[11px] border border-gray-300 rounded px-2 py-0.5"
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Complete">Complete</option>
                      <option value="Overdue">Overdue</option>
                    </select>
                  </div>
                </div>
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
      <div className="h-12 bg-white border-b border-gray-200 flex items-center px-6 justify-between">
        <h1 className="text-sm font-semibold text-gray-900">Action Items</h1>
        <div className="text-xs text-gray-600">
          {actionItems.length} total {actionItems.length === 1 ? 'task' : 'tasks'}
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

            {/* Completed */}
            <TaskSection title="✅ Completed" tasks={completedTasks} />
          </>
        )}
      </div>
    </div>
  )
}
