'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  Calendar,
  Loader2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'

interface TaskItem {
  id: string
  type: 'task' | 'action_item'
  name: string
  description?: string
  status: string
  priority: string
  dueDate?: string
  source: string
  sourceMeetingId?: string
  sourceMeetingTitle?: string
}

interface TasksData {
  assigneeName: string
  overdue: TaskItem[]
  dueToday: TaskItem[]
  upcoming: TaskItem[]
  noDueDate: TaskItem[]
  total: number
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  })
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    Critical: 'bg-red-100 text-red-800',
    High: 'bg-orange-100 text-orange-800',
    Medium: 'bg-yellow-100 text-yellow-800',
    Low: 'bg-gray-100 text-gray-600',
  }

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[priority] || colors.Medium}`}>
      {priority}
    </span>
  )
}

function TaskCard({
  task,
  onStatusChange,
  updating,
}: {
  task: TaskItem
  onStatusChange: (id: string, status: string) => void
  updating: string | null
}) {
  const isUpdating = updating === task.id
  const isComplete = task.status === 'Done' || task.status === 'Complete'

  return (
    <div
      className={`bg-white rounded-lg border p-4 shadow-sm transition-all ${
        isComplete ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={() => onStatusChange(task.id, isComplete ? 'Open' : 'Done')}
          disabled={isUpdating}
          className="mt-0.5 flex-shrink-0 text-gray-400 hover:text-green-600 transition-colors"
          aria-label={isComplete ? 'Mark as incomplete' : 'Mark as complete'}
        >
          {isUpdating ? (
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
          ) : isComplete ? (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : (
            <Circle className="w-5 h-5" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium text-gray-900 ${isComplete ? 'line-through' : ''}`}>
            {task.name}
          </p>

          {task.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-2">
            <PriorityBadge priority={task.priority} />

            {task.dueDate && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <Calendar className="w-3 h-3" />
                {formatDate(task.dueDate)}
              </span>
            )}

            {task.sourceMeetingTitle && (
              <span className="text-xs text-gray-400 truncate max-w-[150px]">
                From: {task.sourceMeetingTitle}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function TaskSection({
  title,
  icon: Icon,
  tasks,
  iconColor,
  defaultOpen = true,
  onStatusChange,
  updating,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  tasks: TaskItem[]
  iconColor: string
  defaultOpen?: boolean
  onStatusChange: (id: string, status: string) => void
  updating: string | null
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  if (tasks.length === 0) return null

  return (
    <div className="mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full text-left mb-3"
      >
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
        <Icon className={`w-5 h-5 ${iconColor}`} />
        <h2 className="text-sm font-semibold text-gray-700">
          {title} ({tasks.length})
        </h2>
      </button>

      {isOpen && (
        <div className="space-y-3 pl-6">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onStatusChange={onStatusChange}
              updating={updating}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function TeamMemberTasksPage() {
  const params = useParams()
  const token = params.token as string

  const [data, setData] = useState<TasksData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  const fetchTasks = async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/team-tasks/${token}`)
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to load tasks')
      }

      setData(result.data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [token])

  const handleStatusChange = async (id: string, status: string) => {
    setUpdating(id)
    try {
      const response = await fetch(`${API_URL}/api/v1/team-tasks/${token}/items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to update task')
      }

      // Refresh the task list
      await fetchTasks()
    } catch (err) {
      console.error('Failed to update task:', err)
      alert(err instanceof Error ? err.message : 'Failed to update task')
    } finally {
      setUpdating(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-sm text-gray-600">Loading your tasks...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            If you believe this is an error, please contact your team administrator for a new access
            link.
          </p>
        </div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <h1 className="text-lg font-semibold text-gray-900">{data.assigneeName}&apos;s Tasks</h1>
          <p className="text-sm text-gray-500">
            {data.total} open task{data.total !== 1 ? 's' : ''}
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        {data.total === 0 ? (
          <div className="text-center py-12">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h2>
            <p className="text-gray-600">You have no open tasks at the moment.</p>
          </div>
        ) : (
          <>
            <TaskSection
              title="Overdue"
              icon={AlertTriangle}
              tasks={data.overdue}
              iconColor="text-red-500"
              onStatusChange={handleStatusChange}
              updating={updating}
            />

            <TaskSection
              title="Due Today"
              icon={Clock}
              tasks={data.dueToday}
              iconColor="text-orange-500"
              onStatusChange={handleStatusChange}
              updating={updating}
            />

            <TaskSection
              title="Upcoming"
              icon={Calendar}
              tasks={data.upcoming}
              iconColor="text-blue-500"
              onStatusChange={handleStatusChange}
              updating={updating}
            />

            <TaskSection
              title="No Due Date"
              icon={Circle}
              tasks={data.noDueDate}
              iconColor="text-gray-400"
              defaultOpen={false}
              onStatusChange={handleStatusChange}
              updating={updating}
            />
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-auto">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <p className="text-xs text-gray-400 text-center">
            Meeting Intelligence System - This page shows only your assigned tasks
          </p>
        </div>
      </footer>
    </div>
  )
}
