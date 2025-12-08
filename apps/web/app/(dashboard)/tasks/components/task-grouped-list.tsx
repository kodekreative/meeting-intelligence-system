'use client'

import type { Task } from '../page'

interface TaskGroupedListProps {
  groupedTasks: [string, Task[]][]
  groupBy: 'assignee' | 'meeting' | 'date' | 'status'
  onStatusChange: (id: string, status: Task['status']) => void
  onTaskClick: (task: Task) => void
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'Critical':
      return 'text-red-700 bg-red-50 border-red-200'
    case 'High':
      return 'text-orange-700 bg-orange-50 border-orange-200'
    case 'Medium':
      return 'text-yellow-700 bg-yellow-50 border-yellow-200'
    case 'Low':
      return 'text-gray-700 bg-gray-50 border-gray-200'
    default:
      return 'text-gray-700 bg-gray-50 border-gray-200'
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Completed':
      return 'text-green-700 bg-green-50 border-green-200'
    case 'In Progress':
      return 'text-blue-700 bg-blue-50 border-blue-200'
    case 'Blocked':
      return 'text-red-700 bg-red-50 border-red-200'
    case 'Open':
    default:
      return 'text-gray-700 bg-gray-50 border-gray-200'
  }
}

const getSourceBadge = (source: string) => {
  if (source === 'Action Item') {
    return 'text-purple-700 bg-purple-50 border-purple-200'
  }
  return 'text-cyan-700 bg-cyan-50 border-cyan-200'
}

const getGroupIcon = (groupBy: string) => {
  switch (groupBy) {
    case 'assignee':
      return '👤'
    case 'meeting':
      return '📅'
    case 'date':
      return '📆'
    case 'status':
      return '📊'
    default:
      return '📁'
  }
}

export function TaskGroupedList({ groupedTasks, groupBy, onStatusChange, onTaskClick }: TaskGroupedListProps) {
  return (
    <div className="space-y-4">
      {groupedTasks.map(([groupName, tasks]) => (
        <div key={groupName} className="bg-white border border-gray-200">
          {/* Group Header */}
          <div className="px-4 py-2 bg-gray-100 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>{getGroupIcon(groupBy)}</span>
              <span className="text-xs font-semibold text-gray-900">{groupName}</span>
              <span className="text-[10px] text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded">
                {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
              </span>
            </div>
            <div className="flex gap-3 text-[10px] text-gray-500">
              <span>{tasks.filter(t => t.status === 'Completed').length} done</span>
              <span>{tasks.filter(t => t.status === 'In Progress').length} in progress</span>
            </div>
          </div>

          {/* Column Headers */}
          <div className="px-4 py-1.5 bg-gray-50 border-b border-gray-100">
            <div className="grid grid-cols-[30px_minmax(200px,1fr)_80px_80px_80px_80px_80px_70px] gap-2 text-[10px] font-medium text-gray-600">
              <div className="text-center">✓</div>
              <div>Task</div>
              <div>Assignee</div>
              <div>Status</div>
              <div>Priority</div>
              <div>Due Date</div>
              <div>Source</div>
              <div>Actions</div>
            </div>
          </div>

          {/* Task Rows */}
          <div>
            {tasks.map((task) => (
              <div
                key={task.id}
                className="grid grid-cols-[30px_minmax(200px,1fr)_80px_80px_80px_80px_80px_70px] gap-2 items-center text-[11px] px-4 py-2 hover:bg-gray-50 border-b border-gray-100 cursor-pointer"
                onClick={() => onTaskClick(task)}
              >
                {/* Checkbox */}
                <div onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={task.status === 'Completed'}
                    onChange={(e) => {
                      e.stopPropagation()
                      onStatusChange(task.id, e.target.checked ? 'Completed' : 'Open')
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                </div>

                {/* Task Name */}
                <div className="min-w-0">
                  <div className={`font-medium ${task.status === 'Completed' ? 'line-through text-gray-500' : 'text-gray-900'} truncate`} title={task.name}>
                    {task.name}
                  </div>
                  {/* Show meeting title if not grouping by meeting */}
                  {groupBy !== 'meeting' && task.sourceMeetingTitle && (
                    <div className="text-[9px] text-purple-600 truncate mt-0.5" title={task.sourceMeetingTitle}>
                      📅 {task.sourceMeetingTitle}
                    </div>
                  )}
                </div>

                {/* Assignee */}
                <div className="text-[10px] text-gray-600 truncate" title={task.assigneeName || 'Unassigned'}>
                  {task.assigneeName || '-'}
                </div>

                {/* Status */}
                <div onClick={(e) => e.stopPropagation()}>
                  <select
                    value={task.status}
                    onChange={(e) => {
                      e.stopPropagation()
                      onStatusChange(task.id, e.target.value as Task['status'])
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    className={`text-[10px] border rounded px-1 py-0.5 w-full ${getStatusColor(task.status)} cursor-pointer`}
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Blocked">Blocked</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                {/* Priority Badge */}
                <span className={`text-[10px] px-1.5 py-0.5 rounded text-center border ${getPriorityColor(task.priority)}`}>
                  {task.priority}
                </span>

                {/* Due Date */}
                <div className="text-gray-600 text-[10px]">
                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  }) : '-'}
                </div>

                {/* Source Badge */}
                <span className={`text-[10px] px-1.5 py-0.5 rounded text-center border ${getSourceBadge(task.source)}`}>
                  {task.source === 'Action Item' ? 'Action' : 'Manual'}
                </span>

                {/* Actions */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onTaskClick(task)
                  }}
                  className="text-[10px] text-blue-600 hover:text-blue-800"
                >
                  View
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
