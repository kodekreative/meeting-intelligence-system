'use client'

import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { ReactNode } from 'react'

interface BoardColumnProps {
  id: string
  title: string
  taskCount: number
  colorClass: string
  children: ReactNode
  isCustom?: boolean
  onRename?: (name: string) => void
  onDelete?: () => void
}

export function BoardColumn({
  id,
  title,
  taskCount,
  colorClass,
  children,
  isCustom,
  onRename,
  onDelete,
}: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(title)

  const handleSave = () => {
    if (editName.trim() && editName !== title && onRename) {
      onRename(editName.trim())
    }
    setIsEditing(false)
  }

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-72 flex-shrink-0 rounded-lg border-2 ${colorClass} ${
        isOver ? 'ring-2 ring-blue-400 border-blue-400' : ''
      }`}
    >
      {/* Column Header */}
      <div className="px-3 py-2 border-b border-inherit bg-white/50 rounded-t-lg">
        <div className="flex items-center justify-between gap-2">
          {isEditing ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave()
                if (e.key === 'Escape') {
                  setEditName(title)
                  setIsEditing(false)
                }
              }}
              autoFocus
              className="flex-1 text-xs font-semibold bg-white border border-gray-300 rounded px-1.5 py-0.5"
            />
          ) : (
            <h3
              className={`text-xs font-semibold text-gray-900 truncate ${
                isCustom ? 'cursor-pointer hover:text-blue-600' : ''
              }`}
              title={isCustom ? 'Click to rename' : title}
              onClick={() => {
                if (isCustom && onRename) {
                  setIsEditing(true)
                }
              }}
            >
              {title}
            </h3>
          )}
          <div className="flex items-center gap-1">
            <span className="text-[10px] bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded-full">
              {taskCount}
            </span>
            {isCustom && onDelete && (
              <button
                onClick={onDelete}
                className="text-gray-400 hover:text-red-600 p-0.5 transition-colors"
                title="Delete list"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Column Content */}
      <div className="flex-1 p-2 overflow-y-auto max-h-[calc(100vh-280px)]">
        {children}
      </div>
    </div>
  )
}
