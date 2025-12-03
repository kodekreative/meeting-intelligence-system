'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { apiClient } from '@/lib/api-client'
import type { Task } from '../page'
import { BoardColumn } from './board-column'
import { BoardCard } from './board-card'

type GroupByOption = 'assignee' | 'meeting' | 'status' | 'priority' | 'custom'

interface CustomList {
  id: string
  name: string
  type: string
  order?: number
  boardId?: string
}

interface Board {
  id: string
  name: string
  description?: string
  order?: number
  isDefault?: boolean
}

interface TaskBoardViewProps {
  tasks: Task[]
  onStatusChange: (id: string, status: Task['status']) => void
  onTaskClick: (task: Task) => void
}

export function TaskBoardView({ tasks, onStatusChange, onTaskClick }: TaskBoardViewProps) {
  const queryClient = useQueryClient()
  const [groupBy, setGroupBy] = useState<GroupByOption>('status')
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [newListName, setNewListName] = useState('')
  const [isAddingList, setIsAddingList] = useState(false)
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null)
  const [isCreatingBoard, setIsCreatingBoard] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')

  // Fetch boards
  const { data: boardsData } = useQuery({
    queryKey: ['boards'],
    queryFn: () => apiClient.boards.list(),
    enabled: groupBy === 'custom',
  })

  const boards = (boardsData?.data || []) as Board[]

  // Set default board when boards load
  useEffect(() => {
    if (boards.length > 0 && !selectedBoardId) {
      const defaultBoard = boards.find(b => b.isDefault) || boards[0]
      setSelectedBoardId(defaultBoard.id)
    }
  }, [boards, selectedBoardId])

  // Fetch custom lists (stacks) for selected board when in custom mode
  const { data: stacksData } = useQuery({
    queryKey: ['stacks', selectedBoardId],
    queryFn: () => apiClient.stacks.list(selectedBoardId ? { boardId: selectedBoardId } : undefined),
    enabled: groupBy === 'custom',
  })

  const customLists = (stacksData?.data || []) as CustomList[]

  // Mutations for boards
  const createBoardMutation = useMutation({
    mutationFn: (name: string) => apiClient.boards.create({ name }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['boards'] })
      const newBoard = data.data as Board
      setSelectedBoardId(newBoard.id)
      setNewBoardName('')
      setIsCreatingBoard(false)
    },
  })

  const deleteBoardMutation = useMutation({
    mutationFn: (id: string) => apiClient.boards.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] })
      queryClient.invalidateQueries({ queryKey: ['stacks'] })
      // Select the first remaining board or null
      const remaining = boards.filter(b => b.id !== selectedBoardId)
      setSelectedBoardId(remaining[0]?.id || null)
    },
  })

  // Mutations for custom lists
  const createListMutation = useMutation({
    mutationFn: (name: string) => apiClient.stacks.create({ name, type: 'Custom', boardId: selectedBoardId || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stacks'] })
      setNewListName('')
      setIsAddingList(false)
    },
  })

  const updateListMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => apiClient.stacks.update(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stacks'] })
    },
  })

  const deleteListMutation = useMutation({
    mutationFn: (id: string) => apiClient.stacks.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stacks'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const assignTaskMutation = useMutation({
    mutationFn: ({ taskId, stackId }: { taskId: string; stackId: string | null }) =>
      apiClient.stacks.assignTask(taskId, stackId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  // Organize tasks into columns based on groupBy
  const columns = useMemo(() => {
    const columnMap: Record<string, { id: string; title: string; tasks: Task[]; isCustom?: boolean }> = {}

    if (groupBy === 'custom') {
      // Custom lists mode - use stacks
      columnMap['uncategorized'] = { id: 'uncategorized', title: 'Uncategorized', tasks: [], isCustom: false }

      // Create columns for each custom list
      customLists.forEach(list => {
        columnMap[list.id] = { id: list.id, title: list.name, tasks: [], isCustom: true }
      })

      // Distribute tasks
      tasks.forEach(task => {
        if (task.stackId && columnMap[task.stackId]) {
          columnMap[task.stackId].tasks.push(task)
        } else {
          columnMap['uncategorized'].tasks.push(task)
        }
      })

      // Sort custom lists by order, put uncategorized last
      const result = Object.values(columnMap)
      result.sort((a, b) => {
        if (a.id === 'uncategorized') return 1
        if (b.id === 'uncategorized') return -1
        const aList = customLists.find(l => l.id === a.id)
        const bList = customLists.find(l => l.id === b.id)
        return (aList?.order || 0) - (bList?.order || 0)
      })
      return result
    }

    if (groupBy === 'status') {
      const statuses = ['Open', 'In Progress', 'Blocked', 'Completed']
      statuses.forEach(status => {
        columnMap[status] = { id: status, title: status, tasks: [] }
      })
      tasks.forEach(task => {
        if (columnMap[task.status]) {
          columnMap[task.status].tasks.push(task)
        }
      })
    } else if (groupBy === 'priority') {
      const priorities = ['Critical', 'High', 'Medium', 'Low']
      priorities.forEach(priority => {
        columnMap[priority] = { id: priority, title: priority, tasks: [] }
      })
      tasks.forEach(task => {
        if (columnMap[task.priority]) {
          columnMap[task.priority].tasks.push(task)
        }
      })
    } else if (groupBy === 'assignee') {
      columnMap['Unassigned'] = { id: 'Unassigned', title: 'Unassigned', tasks: [] }
      tasks.forEach(task => {
        const key = task.assigneeName || 'Unassigned'
        if (!columnMap[key]) {
          columnMap[key] = { id: key, title: key, tasks: [] }
        }
        columnMap[key].tasks.push(task)
      })
    } else if (groupBy === 'meeting') {
      columnMap['No Meeting'] = { id: 'No Meeting', title: 'No Meeting', tasks: [] }
      tasks.forEach(task => {
        const key = task.sourceMeetingTitle || 'No Meeting'
        if (!columnMap[key]) {
          columnMap[key] = { id: key, title: key, tasks: [] }
        }
        columnMap[key].tasks.push(task)
      })
    }

    let result = Object.values(columnMap)

    if (groupBy === 'status') {
      const order = ['Open', 'In Progress', 'Blocked', 'Completed']
      result.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
    } else if (groupBy === 'priority') {
      const order = ['Critical', 'High', 'Medium', 'Low']
      result.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
    } else {
      result.sort((a, b) => {
        if (a.id === 'Unassigned' || a.id === 'No Meeting') return 1
        if (b.id === 'Unassigned' || b.id === 'No Meeting') return -1
        return a.title.localeCompare(b.title)
      })
    }

    return result
  }, [tasks, groupBy, customLists])

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, ...updates }: { id: string; [key: string]: unknown }) =>
      apiClient.tasks.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const taskId = event.active.id as string
    const task = tasks.find(t => t.id === taskId)
    if (task) {
      setActiveTask(task)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const taskId = active.id as string
    const overId = over.id as string

    let targetColumnId: string | null = null

    const column = columns.find(c => c.id === overId)
    if (column) {
      targetColumnId = column.id
    } else {
      for (const col of columns) {
        if (col.tasks.some(t => t.id === overId)) {
          targetColumnId = col.id
          break
        }
      }
    }

    if (!targetColumnId) return

    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    if (groupBy === 'status') {
      if (task.status !== targetColumnId) {
        updateTaskMutation.mutate({ id: taskId, status: targetColumnId })
      }
    } else if (groupBy === 'priority') {
      if (task.priority !== targetColumnId) {
        updateTaskMutation.mutate({ id: taskId, priority: targetColumnId })
      }
    } else if (groupBy === 'custom') {
      // Assign task to custom list
      const newStackId = targetColumnId === 'uncategorized' ? null : targetColumnId
      if (task.stackId !== newStackId) {
        assignTaskMutation.mutate({ taskId, stackId: newStackId })
      }
    }
  }

  const getColumnColor = (columnId: string) => {
    if (groupBy === 'status') {
      switch (columnId) {
        case 'Open': return 'bg-gray-100 border-gray-300'
        case 'In Progress': return 'bg-blue-50 border-blue-300'
        case 'Blocked': return 'bg-red-50 border-red-300'
        case 'Completed': return 'bg-green-50 border-green-300'
      }
    }
    if (groupBy === 'priority') {
      switch (columnId) {
        case 'Critical': return 'bg-red-50 border-red-300'
        case 'High': return 'bg-orange-50 border-orange-300'
        case 'Medium': return 'bg-yellow-50 border-yellow-300'
        case 'Low': return 'bg-gray-100 border-gray-300'
      }
    }
    if (groupBy === 'custom') {
      if (columnId === 'uncategorized') return 'bg-gray-100 border-gray-300'
      return 'bg-blue-50 border-blue-300'
    }
    return 'bg-gray-50 border-gray-300'
  }

  const handleAddList = () => {
    if (newListName.trim()) {
      createListMutation.mutate(newListName.trim())
    }
  }

  const handleCreateBoard = () => {
    if (newBoardName.trim()) {
      createBoardMutation.mutate(newBoardName.trim())
    }
  }

  const handleDeleteBoard = () => {
    if (selectedBoardId && boards.length > 1) {
      const boardToDelete = boards.find(b => b.id === selectedBoardId)
      if (confirm(`Delete board "${boardToDelete?.name}"? Lists in this board will become unassigned.`)) {
        deleteBoardMutation.mutate(selectedBoardId)
      }
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Board Controls */}
      <div className="flex items-center gap-3 mb-4 bg-white border border-gray-200 px-4 py-2 rounded">
        <span className="text-[11px] font-medium text-gray-700">Group by:</span>
        <select
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value as GroupByOption)}
          className="text-[11px] border border-gray-300 rounded px-2 py-1 bg-white"
        >
          <option value="status">Status</option>
          <option value="priority">Priority</option>
          <option value="assignee">Assignee</option>
          <option value="meeting">Meeting</option>
          <option value="custom">Custom Boards</option>
        </select>

        {/* Board selector - only show in custom mode */}
        {groupBy === 'custom' && (
          <div className="flex items-center gap-2 ml-4 border-l border-gray-300 pl-4">
            <span className="text-[11px] font-medium text-gray-700">Board:</span>
            {isCreatingBoard ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  placeholder="Board name..."
                  className="text-[11px] border border-gray-300 rounded px-2 py-1 w-32"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateBoard()
                    if (e.key === 'Escape') {
                      setIsCreatingBoard(false)
                      setNewBoardName('')
                    }
                  }}
                />
                <button
                  onClick={handleCreateBoard}
                  disabled={!newBoardName.trim() || createBoardMutation.isPending}
                  className="text-[10px] bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setIsCreatingBoard(false)
                    setNewBoardName('')
                  }}
                  className="text-[10px] text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <select
                  value={selectedBoardId || ''}
                  onChange={(e) => setSelectedBoardId(e.target.value)}
                  className="text-[11px] border border-gray-300 rounded px-2 py-1 bg-white"
                >
                  {boards.map(board => (
                    <option key={board.id} value={board.id}>
                      {board.name} {board.isDefault ? '(default)' : ''}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setIsCreatingBoard(true)}
                  className="text-[10px] text-blue-600 hover:text-blue-800"
                  title="Create new board"
                >
                  + New
                </button>
                {boards.length > 1 && (
                  <button
                    onClick={handleDeleteBoard}
                    className="text-[10px] text-red-500 hover:text-red-700"
                    title="Delete this board"
                  >
                    Delete
                  </button>
                )}
              </>
            )}
          </div>
        )}

        <span className="text-[10px] text-gray-500 ml-auto">
          {groupBy === 'status' || groupBy === 'priority' || groupBy === 'custom'
            ? 'Drag cards between columns to update'
            : 'View only - switch to Status, Priority, or Custom Boards to drag'}
        </span>
      </div>

      {/* Trello-style Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-4 h-full pb-4" style={{ minWidth: 'max-content' }}>
            {columns.map(column => (
              <BoardColumn
                key={column.id}
                id={column.id}
                title={column.title}
                taskCount={column.tasks.length}
                colorClass={getColumnColor(column.id)}
                isCustom={column.isCustom}
                onRename={column.isCustom ? (name) => updateListMutation.mutate({ id: column.id, name }) : undefined}
                onDelete={column.isCustom ? () => {
                  if (confirm(`Delete list "${column.title}"? Tasks will be moved to Uncategorized.`)) {
                    deleteListMutation.mutate(column.id)
                  }
                } : undefined}
              >
                <SortableContext
                  items={column.tasks.map(t => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2 min-h-[100px]">
                    {column.tasks.map(task => (
                      <BoardCard
                        key={task.id}
                        task={task}
                        onClick={() => onTaskClick(task)}
                        onStatusChange={onStatusChange}
                        showAssignee={true}
                        showMeeting={true}
                        showStatus={groupBy !== 'status'}
                        showPriority={groupBy !== 'priority'}
                      />
                    ))}
                    {column.tasks.length === 0 && (
                      <div className="text-[10px] text-gray-400 text-center py-8 border-2 border-dashed border-gray-200 rounded">
                        Drop tasks here
                      </div>
                    )}
                  </div>
                </SortableContext>
              </BoardColumn>
            ))}

            {/* Add List button - only in custom mode */}
            {groupBy === 'custom' && (
              <div className="w-72 flex-shrink-0">
                {isAddingList ? (
                  <div className="bg-gray-100 border-2 border-gray-300 rounded-lg p-3">
                    <input
                      type="text"
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      placeholder="Enter list name..."
                      className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 mb-2"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddList()
                        if (e.key === 'Escape') {
                          setIsAddingList(false)
                          setNewListName('')
                        }
                      }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddList}
                        disabled={!newListName.trim() || createListMutation.isPending}
                        className="text-[11px] bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        Add List
                      </button>
                      <button
                        onClick={() => {
                          setIsAddingList(false)
                          setNewListName('')
                        }}
                        className="text-[11px] text-gray-600 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsAddingList(true)}
                    className="w-full bg-gray-100 hover:bg-gray-200 border-2 border-dashed border-gray-300 rounded-lg p-4 text-xs text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    + Add another list
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeTask && (
            <BoardCard
              task={activeTask}
              onClick={() => {}}
              onStatusChange={() => {}}
              isDragging
              showAssignee={true}
              showMeeting={true}
              showStatus={groupBy !== 'status'}
              showPriority={groupBy !== 'priority'}
            />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
