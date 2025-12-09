'use client'

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import type { Task } from '../page'
import type { Stack } from './task-stack-view'
import { TaskCard } from './task-card'

interface StackCardProps {
  stack: Stack
  tasks: Task[]
  onStatusChange: (id: string, status: Task['status']) => void
  onTaskClick: (task: Task) => void
  onRename: (name: string) => void
  onToggleCollapse: () => void
  onDelete: () => void
}

const getTypeColor = (type: string) => {
  switch (type) {
    case 'Assignee':
      return 'bg-blue-50 border-blue-200'
    case 'Meeting':
      return 'bg-purple-50 border-purple-200'
    case 'Custom':
    default:
      return 'bg-gray-50 border-gray-200'
  }
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'Assignee':
      return '👤'
    case 'Meeting':
      return '📅'
    case 'Custom':
    default:
      return '📁'
  }
}

const getTypeBadgeColor = (type: string) => {
  switch (type) {
    case 'Assignee':
      return 'bg-blue-100 text-blue-700'
    case 'Meeting':
      return 'bg-purple-100 text-purple-700'
    case 'Custom':
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

export function StackCard({
  stack,
  tasks,
  onStatusChange,
  onTaskClick,
  onRename,
  onToggleCollapse,
  onDelete,
}: StackCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(stack.name)

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `stack-${stack.id}` })

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `stack-${stack.id}`,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const handleSaveName = () => {
    if (editName.trim() && editName !== stack.name) {
      onRename(editName.trim())
    }
    setIsEditing(false)
  }

  const doneCount = tasks.filter(t => t.status === 'Done').length
  const inProgressCount = tasks.filter(t => t.status === 'In Progress').length

  return (
    <div
      ref={(node) => {
        setSortableRef(node)
        setDroppableRef(node)
      }}
      style={style}
      className={`rounded-lg border-2 ${getTypeColor(stack.type)} ${
        isOver ? 'ring-2 ring-blue-400 border-blue-400' : ''
      } ${isDragging ? 'shadow-lg' : ''}`}
    >
      {/* Stack Header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b border-inherit cursor-grab"
        {...attributes}
        {...listeners}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span>{getTypeIcon(stack.type)}</span>
          {isEditing ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveName()
                if (e.key === 'Escape') {
                  setEditName(stack.name)
                  setIsEditing(false)
                }
              }}
              autoFocus
              className="text-xs font-semibold bg-white border border-gray-300 rounded px-1 py-0.5 flex-1"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              className="text-xs font-semibold text-gray-900 truncate cursor-text"
              onClick={(e) => {
                e.stopPropagation()
                setIsEditing(true)
              }}
              title="Click to rename"
            >
              {stack.name}
            </span>
          )}
          <span className={`text-[9px] px-1.5 py-0.5 rounded ${getTypeBadgeColor(stack.type)}`}>
            {stack.type}
          </span>
        </div>

        <div className="flex items-center gap-1 ml-2">
          <span className="text-[10px] text-gray-500">
            {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleCollapse()
            }}
            className="text-gray-400 hover:text-gray-600 p-0.5"
            title={stack.isCollapsed ? 'Expand' : 'Collapse'}
          >
            {stack.isCollapsed ? '▶' : '▼'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (confirm('Delete this stack? Tasks will be unstacked.')) {
                onDelete()
              }
            }}
            className="text-gray-400 hover:text-red-600 p-0.5"
            title="Delete stack"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Stack Stats */}
      {!stack.isCollapsed && tasks.length > 0 && (
        <div className="px-3 py-1 bg-white/50 border-b border-inherit">
          <div className="flex gap-3 text-[10px]">
            <span className="text-green-600">{doneCount} done</span>
            <span className="text-blue-600">{inProgressCount} in progress</span>
            <span className="text-gray-500">{tasks.length - doneCount - inProgressCount} other</span>
          </div>
        </div>
      )}

      {/* Tasks in stack */}
      {!stack.isCollapsed && (
        <div className="p-2 space-y-2 min-h-[60px]">
          <SortableContext
            items={tasks.map(t => `task-${t.id}`)}
            strategy={verticalListSortingStrategy}
          >
            {tasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onStatusChange={onStatusChange}
                onClick={() => onTaskClick(task)}
                compact
              />
            ))}
          </SortableContext>
          {tasks.length === 0 && (
            <div className="text-[10px] text-gray-400 text-center py-4">
              Drop tasks here
            </div>
          )}
        </div>
      )}

      {/* Collapsed preview */}
      {stack.isCollapsed && tasks.length > 0 && (
        <div className="px-3 py-2">
          <div className="text-[10px] text-gray-500">
            {tasks.slice(0, 3).map(t => t.name).join(', ')}
            {tasks.length > 3 && ` +${tasks.length - 3} more`}
          </div>
        </div>
      )}
    </div>
  )
}
