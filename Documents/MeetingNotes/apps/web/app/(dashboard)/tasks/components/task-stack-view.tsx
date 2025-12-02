'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { apiClient } from '@/lib/api-client'
import type { Task } from '../page'
import { StackCard } from './stack-card'
import { TaskCard } from './task-card'

export interface Stack {
  id: string
  name: string
  type: 'Assignee' | 'Meeting' | 'Custom'
  parentStackId?: string
  order?: number
  color?: string
  isCollapsed?: boolean
  ownerId?: string
}

interface TaskStackViewProps {
  tasks: Task[]
  onStatusChange: (id: string, status: Task['status']) => void
  onTaskClick: (task: Task) => void
}

export function TaskStackView({ tasks, onStatusChange, onTaskClick }: TaskStackViewProps) {
  const queryClient = useQueryClient()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeType, setActiveType] = useState<'stack' | 'task' | null>(null)

  // Fetch stacks
  const { data: stacksData } = useQuery({
    queryKey: ['stacks'],
    queryFn: () => apiClient.stacks.list(),
  })

  const stacks = (stacksData?.data || []) as Stack[]

  // Organize tasks by stack
  const { stackedTasks, unstackedTasks } = useMemo(() => {
    const stacked: Record<string, Task[]> = {}
    const unstacked: Task[] = []

    // Initialize stacks
    stacks.forEach(stack => {
      stacked[stack.id] = []
    })

    // Distribute tasks
    tasks.forEach(task => {
      if (task.stackId && stacked[task.stackId]) {
        stacked[task.stackId].push(task)
      } else {
        unstacked.push(task)
      }
    })

    // Sort tasks within each stack by stackOrder
    Object.keys(stacked).forEach(stackId => {
      stacked[stackId].sort((a, b) => (a.stackOrder || 0) - (b.stackOrder || 0))
    })

    return { stackedTasks: stacked, unstackedTasks: unstacked }
  }, [tasks, stacks])

  // Mutations
  const assignTaskMutation = useMutation({
    mutationFn: ({ taskId, stackId, stackOrder }: { taskId: string; stackId: string | null; stackOrder?: number }) =>
      apiClient.stacks.assignTask(taskId, stackId, stackOrder),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const createStackMutation = useMutation({
    mutationFn: (data: Parameters<typeof apiClient.stacks.create>[0]) =>
      apiClient.stacks.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stacks'] })
    },
  })

  const updateStackMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Parameters<typeof apiClient.stacks.update>[1]) =>
      apiClient.stacks.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stacks'] })
    },
  })

  const deleteStackMutation = useMutation({
    mutationFn: (id: string) => apiClient.stacks.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stacks'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const autoGenerateMutation = useMutation({
    mutationFn: (type: 'assignee' | 'meeting') => apiClient.stacks.autoGenerate(type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stacks'] })
    },
  })

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const id = active.id as string

    if (id.startsWith('stack-')) {
      setActiveType('stack')
      setActiveId(id.replace('stack-', ''))
    } else if (id.startsWith('task-')) {
      setActiveType('task')
      setActiveId(id.replace('task-', ''))
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    setActiveId(null)
    setActiveType(null)

    if (!over) return

    const activeId = (active.id as string).replace(/^(stack-|task-)/, '')
    const overId = (over.id as string).replace(/^(stack-|task-)/, '')

    // If dragging a task
    if ((active.id as string).startsWith('task-')) {
      // Dropped on a stack
      if ((over.id as string).startsWith('stack-')) {
        const stackId = overId
        const tasksInStack = stackedTasks[stackId] || []
        assignTaskMutation.mutate({
          taskId: activeId,
          stackId,
          stackOrder: tasksInStack.length,
        })
      }
      // Dropped on unstacked area
      else if (over.id === 'unstacked-drop-zone') {
        assignTaskMutation.mutate({
          taskId: activeId,
          stackId: null,
        })
      }
      // Dropped on another task (reorder within stack or move to same stack)
      else if ((over.id as string).startsWith('task-')) {
        const overTask = tasks.find(t => t.id === overId)
        if (overTask?.stackId) {
          const tasksInStack = stackedTasks[overTask.stackId] || []
          const overIndex = tasksInStack.findIndex(t => t.id === overId)
          assignTaskMutation.mutate({
            taskId: activeId,
            stackId: overTask.stackId,
            stackOrder: overIndex,
          })
        }
      }
    }
  }

  const activeTask = activeType === 'task' && activeId ? tasks.find(t => t.id === activeId) : null
  const activeStack = activeType === 'stack' && activeId ? stacks.find(s => s.id === activeId) : null

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex gap-2 items-center flex-wrap bg-white border border-gray-200 p-3">
        <span className="text-[11px] font-medium text-gray-700">Auto-Generate Stacks:</span>
        <button
          onClick={() => autoGenerateMutation.mutate('assignee')}
          disabled={autoGenerateMutation.isPending}
          className="text-[11px] bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          By Assignee
        </button>
        <button
          onClick={() => autoGenerateMutation.mutate('meeting')}
          disabled={autoGenerateMutation.isPending}
          className="text-[11px] bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 disabled:opacity-50"
        >
          By Meeting
        </button>
        <div className="border-l border-gray-300 h-4 mx-2" />
        <button
          onClick={() => createStackMutation.mutate({ name: 'New Stack', type: 'Custom' })}
          disabled={createStackMutation.isPending}
          className="text-[11px] bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700 disabled:opacity-50"
        >
          + Custom Stack
        </button>
        <span className="text-[10px] text-gray-500 ml-auto">
          Drag tasks onto stacks to organize them
        </span>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {/* Render stacks */}
          <SortableContext
            items={stacks.map(s => `stack-${s.id}`)}
            strategy={verticalListSortingStrategy}
          >
            {stacks.map(stack => (
              <StackCard
                key={stack.id}
                stack={stack}
                tasks={stackedTasks[stack.id] || []}
                onStatusChange={onStatusChange}
                onTaskClick={onTaskClick}
                onRename={(name) => updateStackMutation.mutate({ id: stack.id, name })}
                onToggleCollapse={() => updateStackMutation.mutate({ id: stack.id, isCollapsed: !stack.isCollapsed })}
                onDelete={() => deleteStackMutation.mutate(stack.id)}
              />
            ))}
          </SortableContext>

          {/* Unstacked tasks */}
          <div
            id="unstacked-drop-zone"
            className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-4 min-h-[200px]"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-700">
                Unstacked Tasks ({unstackedTasks.length})
              </h3>
            </div>
            <SortableContext
              items={unstackedTasks.map(t => `task-${t.id}`)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {unstackedTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onStatusChange={onStatusChange}
                    onClick={() => onTaskClick(task)}
                  />
                ))}
              </div>
            </SortableContext>
            {unstackedTasks.length === 0 && (
              <div className="text-[11px] text-gray-500 text-center py-8">
                All tasks are organized in stacks
              </div>
            )}
          </div>
        </div>

        {/* Drag overlay */}
        <DragOverlay>
          {activeTask && (
            <TaskCard
              task={activeTask}
              onStatusChange={() => {}}
              onClick={() => {}}
              isDragging
            />
          )}
          {activeStack && (
            <div className="bg-white border border-gray-300 rounded-lg p-3 shadow-lg opacity-80">
              <span className="text-xs font-medium">{activeStack.name}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
