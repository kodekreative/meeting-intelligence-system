'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Task } from '../page'

interface BoardCardProps {
  task: Task
  onClick: () => void
  onStatusChange: (id: string, status: Task['status']) => void
  isDragging?: boolean
  showAssignee?: boolean
  showMeeting?: boolean
  showStatus?: boolean
  showPriority?: boolean
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'Critical': return 'bg-red-500'
    case 'High': return 'bg-orange-500'
    case 'Medium': return 'bg-yellow-500'
    case 'Low': return 'bg-gray-400'
    default: return 'bg-gray-400'
  }
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'Done': return 'bg-green-100 text-green-700'
    case 'In Progress': return 'bg-blue-100 text-blue-700'
    case 'Blocked': return 'bg-red-100 text-red-700'
    case 'Backlog': return 'bg-gray-100 text-gray-600'
    default: return 'bg-gray-100 text-gray-600'
  }
}

export function BoardCard({
  task,
  onClick,
  onStatusChange,
  isDragging,
  showAssignee = true,
  showMeeting = true,
  showStatus = true,
  showPriority = true,
}: BoardCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const dragging = isDragging || isSortableDragging

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-grab ${
        dragging ? 'opacity-90 shadow-lg ring-2 ring-blue-400 rotate-2' : ''
      }`}
      {...attributes}
      {...listeners}
    >
      {/* Priority indicator bar */}
      {showPriority && (
        <div className={`h-1 rounded-t-lg ${getPriorityColor(task.priority)}`} />
      )}

      <div className="p-3">
        {/* Meta info - at top */}
        <div className="space-y-1 mb-2 pb-2 border-b border-gray-100">
          {showAssignee && task.assigneeName && (
            <div className="flex items-center gap-1 text-[10px] text-gray-700">
              <span className="w-4 h-4 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-[8px] font-medium flex-shrink-0">
                {task.assigneeName.charAt(0).toUpperCase()}
              </span>
              <span className="truncate font-medium">{task.assigneeName}</span>
            </div>
          )}
          {showMeeting && task.sourceMeetingTitle && (
            <div className="flex items-center gap-1 text-[10px] text-purple-600 truncate" title={task.sourceMeetingTitle}>
              <span>📅</span>
              <span className="truncate">{task.sourceMeetingTitle}</span>
            </div>
          )}
          {task.createdTime && (
            <div className="flex items-center gap-1 text-[10px] text-gray-500">
              <span>📆</span>
              <span>Created {new Date(task.createdTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            </div>
          )}
        </div>

        {/* Task name */}
        <div
          className={`text-xs font-medium mb-2 cursor-pointer hover:text-blue-600 ${
            task.status === 'Done' ? 'line-through text-gray-400' : 'text-gray-900'
          }`}
          onClick={(e) => {
            e.stopPropagation()
            onClick()
          }}
        >
          {task.name}
        </div>

        {/* Labels/badges row */}
        <div className="flex flex-wrap gap-1 mb-2">
          {showStatus && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded ${getStatusBadge(task.status)}`}>
              {task.status}
            </span>
          )}
          {showPriority && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
              {task.priority}
            </span>
          )}
          {task.source === 'Action Item' && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
              Action
            </span>
          )}
        </div>

        {/* Quick checkbox */}
        <div className="mt-2 pt-2 border-t border-gray-100">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={task.status === 'Done'}
              onChange={(e) => {
                e.stopPropagation()
                onStatusChange(task.id, e.target.checked ? 'Done' : 'Backlog')
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-3 h-3 text-green-600 border-gray-300 rounded"
            />
            <span className="text-[10px] text-gray-500">
              {task.status === 'Done' ? 'Completed' : 'Mark complete'}
            </span>
          </label>
        </div>
      </div>
    </div>
  )
}
