'use client'

import { useState } from 'react'
import type { Task } from '../page'

interface TertiaryGroup {
  key: string
  tasks: Task[]
}

interface SecondaryGroup {
  key: string
  tasks: Task[]
  tertiaryGroups: TertiaryGroup[] | null
}

interface NestedGroup {
  primaryKey: string
  tasks: Task[]
  secondaryGroups: SecondaryGroup[] | null
}

interface TaskNestedGroupedListProps {
  nestedGroups: NestedGroup[]
  primaryGroupBy: 'assignee' | 'meeting' | 'date' | 'status'
  secondaryGroupBy: 'none' | 'assignee' | 'meeting' | 'date' | 'status'
  tertiaryGroupBy: 'none' | 'assignee' | 'meeting' | 'date' | 'status'
  onStatusChange: (id: string, status: Task['status']) => void
  onTaskClick: (task: Task) => void
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'Critical': return 'bg-red-100 text-red-700 border-red-200'
    case 'High': return 'bg-orange-100 text-orange-700 border-orange-200'
    case 'Medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    case 'Low': return 'bg-gray-100 text-gray-600 border-gray-200'
    default: return 'bg-gray-100 text-gray-600 border-gray-200'
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Completed': return 'text-green-600'
    case 'In Progress': return 'text-blue-600'
    case 'Blocked': return 'text-red-600'
    case 'Open': return 'text-gray-500'
    default: return 'text-gray-500'
  }
}

const getGroupIcon = (groupBy: string) => {
  switch (groupBy) {
    case 'assignee': return '👤'
    case 'meeting': return '📅'
    case 'date': return '📆'
    case 'status': return '📊'
    default: return '📁'
  }
}

const getGroupLabel = (groupBy: string) => {
  switch (groupBy) {
    case 'assignee': return 'Assignee'
    case 'meeting': return 'Meeting'
    case 'date': return 'Date'
    case 'status': return 'Status'
    default: return 'Group'
  }
}

function TaskRow({
  task,
  onStatusChange,
  onTaskClick,
  hideAssignee,
  hideMeeting,
  hideDate,
}: {
  task: Task
  onStatusChange: (id: string, status: Task['status']) => void
  onTaskClick: (task: Task) => void
  hideAssignee?: boolean
  hideMeeting?: boolean
  hideDate?: boolean
}) {
  return (
    <div
      className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 border-b border-gray-100 cursor-pointer"
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
      <div className="flex-1 min-w-0">
        <div className={`text-xs font-medium truncate ${task.status === 'Completed' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
          {task.name}
        </div>
      </div>

      {/* Assignee */}
      {!hideAssignee && (
        <div className="w-24 flex-shrink-0">
          <span className="text-[10px] text-gray-600 truncate block">
            {task.assigneeName || '-'}
          </span>
        </div>
      )}

      {/* Meeting */}
      {!hideMeeting && (
        <div className="w-32 flex-shrink-0">
          <span className="text-[10px] text-purple-600 truncate block" title={task.sourceMeetingTitle}>
            {task.sourceMeetingTitle || '-'}
          </span>
        </div>
      )}

      {/* Date Created - Always show in compact form */}
      {!hideDate && (
        <div className="w-20 flex-shrink-0">
          <span className="text-[10px] text-gray-500">
            {task.createdTime
              ? new Date(task.createdTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              : '-'}
          </span>
        </div>
      )}

      {/* Status */}
      <div className="w-20 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <select
          value={task.status}
          onChange={(e) => {
            e.stopPropagation()
            onStatusChange(task.id, e.target.value as Task['status'])
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className={`text-[10px] border-0 bg-transparent ${getStatusColor(task.status)} cursor-pointer w-full`}
        >
          <option value="Open">Open</option>
          <option value="In Progress">In Progress</option>
          <option value="Blocked">Blocked</option>
          <option value="Completed">Completed</option>
        </select>
      </div>

      {/* Priority */}
      <div className="w-16 flex-shrink-0">
        <span className={`text-[9px] px-1.5 py-0.5 rounded border ${getPriorityColor(task.priority)}`}>
          {task.priority}
        </span>
      </div>
    </div>
  )
}

export function TaskNestedGroupedList({
  nestedGroups,
  primaryGroupBy,
  secondaryGroupBy,
  tertiaryGroupBy,
  onStatusChange,
  onTaskClick,
}: TaskNestedGroupedListProps) {
  const [collapsedPrimary, setCollapsedPrimary] = useState<Set<string>>(new Set())
  const [collapsedSecondary, setCollapsedSecondary] = useState<Set<string>>(new Set())
  const [collapsedTertiary, setCollapsedTertiary] = useState<Set<string>>(new Set())

  const togglePrimary = (key: string) => {
    setCollapsedPrimary(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const toggleSecondary = (primaryKey: string, secondaryKey: string) => {
    const compositeKey = `${primaryKey}::${secondaryKey}`
    setCollapsedSecondary(prev => {
      const next = new Set(prev)
      if (next.has(compositeKey)) {
        next.delete(compositeKey)
      } else {
        next.add(compositeKey)
      }
      return next
    })
  }

  const toggleTertiary = (primaryKey: string, secondaryKey: string, tertiaryKey: string) => {
    const compositeKey = `${primaryKey}::${secondaryKey}::${tertiaryKey}`
    setCollapsedTertiary(prev => {
      const next = new Set(prev)
      if (next.has(compositeKey)) {
        next.delete(compositeKey)
      } else {
        next.add(compositeKey)
      }
      return next
    })
  }

  const hideAssignee = primaryGroupBy === 'assignee' || secondaryGroupBy === 'assignee' || tertiaryGroupBy === 'assignee'
  const hideMeeting = primaryGroupBy === 'meeting' || secondaryGroupBy === 'meeting' || tertiaryGroupBy === 'meeting'
  const hideDate = primaryGroupBy === 'date' || secondaryGroupBy === 'date' || tertiaryGroupBy === 'date'

  return (
    <div className="space-y-4">
      {nestedGroups.map((group) => {
        const isPrimaryCollapsed = collapsedPrimary.has(group.primaryKey)
        const totalTasks = group.tasks.length
        const doneTasks = group.tasks.filter(t => t.status === 'Completed').length
        const inProgressTasks = group.tasks.filter(t => t.status === 'In Progress').length

        return (
          <div key={group.primaryKey} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {/* Primary Group Header */}
            <div
              className="px-4 py-3 bg-gradient-to-r from-blue-50 to-white border-b border-gray-200 cursor-pointer hover:bg-blue-100/50 transition-colors"
              onClick={() => togglePrimary(group.primaryKey)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 text-sm">
                    {isPrimaryCollapsed ? '▶' : '▼'}
                  </span>
                  <span className="text-lg">{getGroupIcon(primaryGroupBy)}</span>
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">{group.primaryKey}</h2>
                    <div className="text-[10px] text-gray-500">
                      {getGroupLabel(primaryGroupBy)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex gap-3 text-[10px]">
                    <span className="text-gray-500">{totalTasks} tasks</span>
                    <span className="text-green-600">{doneTasks} done</span>
                    <span className="text-blue-600">{inProgressTasks} active</span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Primary Group Content */}
            {!isPrimaryCollapsed && (
              <div>
                {group.secondaryGroups ? (
                  // Has secondary grouping
                  <div className="divide-y divide-gray-100">
                    {group.secondaryGroups.map((secondary) => {
                      const compositeKey = `${group.primaryKey}::${secondary.key}`
                      const isSecondaryCollapsed = collapsedSecondary.has(compositeKey)
                      const secondaryDone = secondary.tasks.filter(t => t.status === 'Completed').length

                      return (
                        <div key={secondary.key}>
                          {/* Secondary Group Header */}
                          <div
                            className="px-4 py-2 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors flex items-center justify-between"
                            onClick={() => toggleSecondary(group.primaryKey, secondary.key)}
                          >
                            <div className="flex items-center gap-2 pl-6">
                              <span className="text-gray-400 text-xs">
                                {isSecondaryCollapsed ? '▶' : '▼'}
                              </span>
                              <span className="text-sm">{getGroupIcon(secondaryGroupBy)}</span>
                              <span className="text-xs font-medium text-gray-700">{secondary.key}</span>
                              <span className="text-[10px] text-gray-400">
                                ({secondary.tasks.length} tasks, {secondaryDone} done)
                              </span>
                            </div>
                          </div>

                          {/* Secondary Group Content */}
                          {!isSecondaryCollapsed && (
                            <div className="pl-8 bg-white">
                              {secondary.tertiaryGroups ? (
                                // Has tertiary grouping
                                <div className="divide-y divide-gray-50">
                                  {secondary.tertiaryGroups.map((tertiary) => {
                                    const tertiaryCompositeKey = `${group.primaryKey}::${secondary.key}::${tertiary.key}`
                                    const isTertiaryCollapsed = collapsedTertiary.has(tertiaryCompositeKey)
                                    const tertiaryDone = tertiary.tasks.filter(t => t.status === 'Completed').length

                                    return (
                                      <div key={tertiary.key}>
                                        {/* Tertiary Group Header */}
                                        <div
                                          className="px-4 py-1.5 bg-gray-50/50 cursor-pointer hover:bg-gray-100/50 transition-colors flex items-center justify-between"
                                          onClick={() => toggleTertiary(group.primaryKey, secondary.key, tertiary.key)}
                                        >
                                          <div className="flex items-center gap-2 pl-4">
                                            <span className="text-gray-300 text-[10px]">
                                              {isTertiaryCollapsed ? '▶' : '▼'}
                                            </span>
                                            <span className="text-xs">{getGroupIcon(tertiaryGroupBy)}</span>
                                            <span className="text-[11px] font-medium text-gray-600">{tertiary.key}</span>
                                            <span className="text-[9px] text-gray-400">
                                              ({tertiary.tasks.length}, {tertiaryDone} done)
                                            </span>
                                          </div>
                                        </div>

                                        {/* Tertiary Group Tasks */}
                                        {!isTertiaryCollapsed && (
                                          <div className="pl-6">
                                            {tertiary.tasks.map((task) => (
                                              <TaskRow
                                                key={task.id}
                                                task={task}
                                                onStatusChange={onStatusChange}
                                                onTaskClick={onTaskClick}
                                                hideAssignee={hideAssignee}
                                                hideMeeting={hideMeeting}
                                                hideDate={hideDate}
                                              />
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              ) : (
                                // No tertiary grouping - show tasks directly
                                secondary.tasks.map((task) => (
                                  <TaskRow
                                    key={task.id}
                                    task={task}
                                    onStatusChange={onStatusChange}
                                    onTaskClick={onTaskClick}
                                    hideAssignee={hideAssignee}
                                    hideMeeting={hideMeeting}
                                    hideDate={hideDate}
                                  />
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  // No secondary grouping - show tasks directly
                  <div>
                    {group.tasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        onStatusChange={onStatusChange}
                        onTaskClick={onTaskClick}
                        hideAssignee={hideAssignee}
                        hideMeeting={hideMeeting}
                        hideDate={hideDate}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
