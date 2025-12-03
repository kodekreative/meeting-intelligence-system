'use client'

import { useState, useEffect } from 'react'
import type { Task } from '../page'
import Link from 'next/link'
import { renderHighlightedText, hasHighlightedContent, stripHighlightMarkers } from '../utils/highlight-text'

interface TaskDetailModalProps {
  task: Task
  onClose: () => void
  onUpdate: (id: string, data: Partial<Task>) => void
  onDelete: (id: string) => void
  isUpdating: boolean
  isDeleting: boolean
}

export function TaskDetailModal({
  task,
  onClose,
  onUpdate,
  onDelete,
  isUpdating,
  isDeleting,
}: TaskDetailModalProps) {
  const [name, setName] = useState(task.name)
  const [description, setDescription] = useState(task.description || '')
  const [status, setStatus] = useState(task.status)
  const [priority, setPriority] = useState(task.priority)
  const [dueDate, setDueDate] = useState(task.dueDate || '')
  const [hasChanges, setHasChanges] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isEditingTranscript, setIsEditingTranscript] = useState(false)

  // Check if description contains transcript context (has highlight markers)
  const isTranscriptContext = hasHighlightedContent(task.description)

  useEffect(() => {
    const changed =
      name !== task.name ||
      description !== (task.description || '') ||
      status !== task.status ||
      priority !== task.priority ||
      dueDate !== (task.dueDate || '')
    setHasChanges(changed)
  }, [name, description, status, priority, dueDate, task])

  const handleSave = () => {
    const updates: Partial<Task> = {}

    if (name !== task.name) updates.name = name
    if (description !== (task.description || '')) updates.description = description || undefined
    if (status !== task.status) updates.status = status
    if (priority !== task.priority) updates.priority = priority
    if (dueDate !== (task.dueDate || '')) updates.dueDate = dueDate || undefined

    if (Object.keys(updates).length > 0) {
      onUpdate(task.id, updates)
    }
  }

  const handleDelete = () => {
    onDelete(task.id)
  }

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'Completed':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'In Progress':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'Blocked':
        return 'bg-red-100 text-red-700 border-red-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'Critical':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'High':
        return 'bg-orange-100 text-orange-700 border-orange-200'
      case 'Medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-900">Task Details</h2>
              <span className={`text-[10px] px-2 py-0.5 rounded border ${
                task.source === 'Action Item'
                  ? 'bg-purple-100 text-purple-700 border-purple-200'
                  : 'bg-cyan-100 text-cyan-700 border-cyan-200'
              }`}>
                {task.source}
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4 overflow-y-auto flex-1">
            {/* Task Name */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Task Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Description */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-gray-700">
                  {isTranscriptContext && !isEditingTranscript ? 'Meeting Context' : 'Description'}
                </label>
                {isTranscriptContext && !isEditingTranscript && (
                  <button
                    onClick={() => {
                      setDescription(stripHighlightMarkers(description))
                      setIsEditingTranscript(true)
                    }}
                    className="text-[10px] text-blue-600 hover:text-blue-800"
                  >
                    Edit
                  </button>
                )}
              </div>
              {isTranscriptContext && !isEditingTranscript ? (
                <div className="bg-gray-50 border border-gray-200 rounded p-3 text-xs text-gray-700 leading-relaxed max-h-48 overflow-y-auto">
                  {renderHighlightedText(description)}
                </div>
              ) : (
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add more details..."
                  rows={4}
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              )}
            </div>

            {/* Status & Priority Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Task['status'])}
                  className={`w-full text-sm border rounded px-3 py-2 ${getStatusColor(status)}`}
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Blocked">Blocked</option>
                  <option value="Done">Done</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Task['priority'])}
                  className={`w-full text-sm border rounded px-3 py-2 ${getPriorityColor(priority)}`}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Source Meeting Link (if from action item) */}
            {task.source === 'Action Item' && task.sourceMeetingId && (
              <div className="bg-purple-50 border border-purple-200 rounded p-3">
                <div className="text-xs font-medium text-purple-900 mb-1">
                  Source Meeting
                </div>
                <Link
                  href={`/intelligence?meeting=${task.sourceMeetingId}`}
                  className="text-xs text-purple-700 hover:text-purple-900 underline"
                  onClick={onClose}
                >
                  View Source Meeting →
                </Link>
              </div>
            )}

            {/* Completed Date (if done) */}
            {task.completedDate && (
              <div className="text-xs text-gray-500">
                Completed on: {new Date(task.completedDate).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </div>
            )}

            {/* Delete Confirmation */}
            {showDeleteConfirm && (
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <div className="text-xs font-medium text-red-900 mb-2">
                  Are you sure you want to delete this task?
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded disabled:opacity-50"
                  >
                    {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50 flex-shrink-0">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting || showDeleteConfirm}
              className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
            >
              Delete Task
            </button>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!hasChanges || isUpdating}
                className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
