'use client'

import { useState } from 'react'
import type { Task } from '../page'
import { getMeaningfulDescription } from '../utils/description-filter'

interface TaskKanbanProps {
  tasks: Task[]
  onStatusChange: (id: string, status: Task['status']) => void
  onTaskClick: (task: Task) => void
}

const columns: { key: Task['status']; label: string; color: string; bgColor: string }[] = [
  { key: 'Open', label: 'Open', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  { key: 'In Progress', label: 'In Progress', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  { key: 'Blocked', label: 'Blocked', color: 'text-red-600', bgColor: 'bg-red-100' },
  { key: 'Completed', label: 'Completed', color: 'text-green-600', bgColor: 'bg-green-100' },
]

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'Critical':
      return 'border-l-red-500'
    case 'High':
      return 'border-l-orange-500'
    case 'Medium':
      return 'border-l-yellow-500'
    case 'Low':
      return 'border-l-gray-400'
    default:
      return 'border-l-gray-400'
  }
}

const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case 'Critical':
      return 'bg-red-100 text-red-700'
    case 'High':
      return 'bg-orange-100 text-orange-700'
    case 'Medium':
      return 'bg-yellow-100 text-yellow-700'
    case 'Low':
      return 'bg-gray-100 text-gray-600'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

export function TaskKanban({ tasks, onStatusChange, onTaskClick }: TaskKanbanProps) {
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<Task['status'] | null>(null)

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task)
    e.dataTransfer.effectAllowed = 'move'
    // Add a slight delay to make the drag image visible
    setTimeout(() => {
      const element = e.target as HTMLElement
      element.style.opacity = '0.5'
    }, 0)
  }

  const handleDragEnd = (e: React.DragEvent) => {
    const element = e.target as HTMLElement
    element.style.opacity = '1'
    setDraggedTask(null)
    setDragOverColumn(null)
  }

  const handleDragOver = (e: React.DragEvent, columnStatus: Task['status']) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColumn(columnStatus)
  }

  const handleDragLeave = () => {
    setDragOverColumn(null)
  }

  const handleDrop = (e: React.DragEvent, targetStatus: Task['status']) => {
    e.preventDefault()
    if (draggedTask && draggedTask.status !== targetStatus) {
      onStatusChange(draggedTask.id, targetStatus)
    }
    setDraggedTask(null)
    setDragOverColumn(null)
  }

  const getTasksByStatus = (status: Task['status']) => {
    return tasks.filter(task => task.status === status)
  }

  return (
    <div className="flex gap-4 h-full min-h-[500px]">
      {columns.map(column => {
        const columnTasks = getTasksByStatus(column.key)
        const isDragOver = dragOverColumn === column.key && draggedTask?.status !== column.key

        return (
          <div
            key={column.key}
            className={`flex-1 flex flex-col min-w-[280px] rounded-lg ${column.bgColor} ${
              isDragOver ? 'ring-2 ring-blue-500 ring-offset-2' : ''
            }`}
            onDragOver={(e) => handleDragOver(e, column.key)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.key)}
          >
            {/* Column Header */}
            <div className="px-3 py-2 border-b border-gray-200/50">
              <div className="flex items-center justify-between">
                <h3 className={`text-xs font-semibold ${column.color}`}>
                  {column.label}
                </h3>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${column.bgColor} ${column.color} font-medium`}>
                  {columnTasks.length}
                </span>
              </div>
            </div>

            {/* Column Content */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {columnTasks.length === 0 ? (
                <div className="text-center text-[10px] text-gray-400 py-8">
                  {isDragOver ? 'Drop here' : 'No tasks'}
                </div>
              ) : (
                columnTasks.map(task => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task)}
                    onDragEnd={handleDragEnd}
                    onClick={() => onTaskClick(task)}
                    className={`bg-white rounded-md shadow-sm border border-gray-200 p-3 cursor-pointer hover:shadow-md transition-shadow border-l-4 ${getPriorityColor(task.priority)} ${
                      draggedTask?.id === task.id ? 'opacity-50' : ''
                    }`}
                  >
                    {/* Task Meta - at top */}
                    <div className="space-y-1 mb-2 pb-2 border-b border-gray-100">
                      {/* Assignee */}
                      {task.assigneeName && (
                        <div className="flex items-center gap-1 text-[10px] text-gray-700">
                          <span className="w-4 h-4 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-[8px] font-medium flex-shrink-0">
                            {task.assigneeName.charAt(0).toUpperCase()}
                          </span>
                          <span className="truncate font-medium">{task.assigneeName}</span>
                        </div>
                      )}

                      {/* Meeting */}
                      {task.sourceMeetingTitle && (
                        <div className="flex items-center gap-1 text-[10px] text-purple-600 truncate" title={task.sourceMeetingTitle}>
                          <span>📅</span>
                          <span className="truncate">{task.sourceMeetingTitle}</span>
                        </div>
                      )}

                      {/* Date Created */}
                      {task.createdTime && (
                        <div className="flex items-center gap-1 text-[10px] text-gray-500">
                          <span>📆</span>
                          <span>Created {new Date(task.createdTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        </div>
                      )}
                    </div>

                    {/* Task Name */}
                    <div className={`text-xs font-medium ${task.status === 'Completed' ? 'line-through text-gray-500' : 'text-gray-900'} mb-1`}>
                      {task.name}
                    </div>

                    {/* Task Description Preview */}
                    {getMeaningfulDescription(task.description) && (
                      <div className="text-[10px] text-gray-500 line-clamp-2 mb-2">
                        {getMeaningfulDescription(task.description)}
                      </div>
                    )}

                    {/* Badges row */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {/* Priority Badge */}
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${getPriorityBadge(task.priority)}`}>
                        {task.priority}
                      </span>

                      {/* Source Badge */}
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                        task.source === 'Action Item'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-cyan-100 text-cyan-700'
                      }`}>
                        {task.source === 'Action Item' ? 'Action' : 'Manual'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
