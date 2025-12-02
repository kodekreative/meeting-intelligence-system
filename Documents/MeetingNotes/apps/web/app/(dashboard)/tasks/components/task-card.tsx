'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Task } from '../page'

interface TaskCardProps {
  task: Task
  onStatusChange: (id: string, status: Task['status']) => void
  onClick: () => void
  compact?: boolean
  isDragging?: boolean
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'Critical':
      return 'bg-red-100 text-red-700 border-red-200'
    case 'High':
      return 'bg-orange-100 text-orange-700 border-orange-200'
    case 'Medium':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    case 'Low':
      return 'bg-gray-100 text-gray-600 border-gray-200'
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200'
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Done':
      return 'text-green-600'
    case 'In Progress':
      return 'text-blue-600'
    case 'Blocked':
      return 'text-red-600'
    case 'Backlog':
    default:
      return 'text-gray-500'
  }
}

export function TaskCard({ task, onStatusChange, onClick, compact, isDragging }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: `task-${task.id}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  }

  const dragging = isDragging || isSortableDragging

  if (compact) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`bg-white border border-gray-200 rounded px-2 py-1.5 cursor-grab hover:border-gray-300 ${
          dragging ? 'shadow-lg ring-2 ring-blue-400' : ''
        }`}
        {...attributes}
        {...listeners}
      >
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={task.status === 'Done'}
            onChange={(e) => {
              e.stopPropagation()
              onStatusChange(task.id, e.target.checked ? 'Done' : 'Backlog')
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-3 h-3 text-blue-600 border-gray-300 rounded"
          />
          <span
            className={`text-[11px] flex-1 truncate cursor-pointer ${
              task.status === 'Done' ? 'line-through text-gray-400' : 'text-gray-900'
            }`}
            onClick={(e) => {
              e.stopPropagation()
              onClick()
            }}
            title={task.name}
          >
            {task.name}
          </span>
          <span className={`text-[9px] px-1 py-0.5 rounded border ${getPriorityColor(task.priority)}`}>
            {task.priority[0]}
          </span>
        </div>
        {task.assigneeName && (
          <div className="text-[9px] text-gray-500 mt-0.5 ml-5 truncate">
            {task.assigneeName}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border border-gray-200 rounded-lg p-3 cursor-grab hover:border-gray-300 hover:shadow-sm ${
        dragging ? 'shadow-lg ring-2 ring-blue-400' : ''
      }`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={task.status === 'Done'}
          onChange={(e) => {
            e.stopPropagation()
            onStatusChange(task.id, e.target.checked ? 'Done' : 'Backlog')
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <div
            className={`text-xs font-medium cursor-pointer hover:text-blue-600 ${
              task.status === 'Done' ? 'line-through text-gray-400' : 'text-gray-900'
            }`}
            onClick={(e) => {
              e.stopPropagation()
              onClick()
            }}
          >
            {task.name}
          </div>
          {task.description && (
            <div className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">
              {task.description}
            </div>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getPriorityColor(task.priority)}`}>
              {task.priority}
            </span>
            <select
              value={task.status}
              onChange={(e) => {
                e.stopPropagation()
                onStatusChange(task.id, e.target.value as Task['status'])
              }}
              onClick={(e) => e.stopPropagation()}
              className={`text-[10px] border-0 bg-transparent ${getStatusColor(task.status)} cursor-pointer`}
            >
              <option value="Backlog">Backlog</option>
              <option value="In Progress">In Progress</option>
              <option value="Blocked">Blocked</option>
              <option value="Done">Done</option>
            </select>
            {task.assigneeName && (
              <span className="text-[10px] text-gray-500">
                👤 {task.assigneeName}
              </span>
            )}
            {task.sourceMeetingTitle && (
              <span className="text-[10px] text-purple-600 truncate max-w-[120px]" title={task.sourceMeetingTitle}>
                📅 {task.sourceMeetingTitle}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
