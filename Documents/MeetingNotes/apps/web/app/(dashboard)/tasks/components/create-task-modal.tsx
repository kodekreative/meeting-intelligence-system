'use client'

import { useState, useMemo } from 'react'

export interface User {
  id: string
  fullName: string
  email: string
}

export interface Meeting {
  id: string
  title: string
  startTime: string
}

interface CreateTaskModalProps {
  onClose: () => void
  onCreate: (data: {
    name: string
    description?: string
    status?: string
    priority?: string
    dueDate?: string
    assigneeId?: string
    assigneeName?: string
    sourceMeetingId?: string
  }) => void
  isLoading: boolean
  users?: User[]
  meetings?: Meeting[]
}

export function CreateTaskModal({ onClose, onCreate, isLoading, users = [], meetings = [] }: CreateTaskModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('Backlog')
  const [priority, setPriority] = useState('Medium')
  const [dueDate, setDueDate] = useState('')
  const [assigneeInput, setAssigneeInput] = useState('')
  const [showAssigneeSuggestions, setShowAssigneeSuggestions] = useState(false)
  const [meetingId, setMeetingId] = useState('')
  const [meetingSearch, setMeetingSearch] = useState('')

  // Filter users based on input, excluding users without fullName
  const filteredUsers = useMemo(() => {
    const validUsers = users.filter(user => user.fullName)
    if (!assigneeInput.trim()) return validUsers
    const search = assigneeInput.toLowerCase()
    return validUsers.filter(user =>
      user.fullName.toLowerCase().includes(search)
    )
  }, [users, assigneeInput])

  // Check if current input matches a user exactly
  const matchedUser = useMemo(() => {
    if (!assigneeInput.trim()) return undefined
    return users.find(u => u.fullName && u.fullName.toLowerCase() === assigneeInput.toLowerCase())
  }, [users, assigneeInput])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    // If input matches a user, send assigneeId; otherwise send assigneeName
    const assigneeData = matchedUser
      ? { assigneeId: matchedUser.id }
      : assigneeInput.trim()
        ? { assigneeName: assigneeInput.trim() }
        : {}

    onCreate({
      name: name.trim(),
      description: description.trim() || undefined,
      status,
      priority,
      dueDate: dueDate || undefined,
      ...assigneeData,
      sourceMeetingId: meetingId || undefined,
    })
  }

  const handleSelectUser = (user: User) => {
    setAssigneeInput(user.fullName)
    setShowAssigneeSuggestions(false)
  }

  // Filter meetings based on search
  const filteredMeetings = meetings.filter(meeting => {
    if (!meetingSearch) return true
    const search = meetingSearch.toLowerCase()
    return meeting.title.toLowerCase().includes(search)
  })

  // Format meeting date for display
  const formatMeetingDate = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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
        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 sticky top-0 bg-white">
            <h2 className="text-sm font-semibold text-gray-900">Create New Task</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Task Name */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Task Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter task name..."
                className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
                required
              />
            </div>

            {/* Description/Notes */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Notes / Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add notes, context, or details..."
                rows={3}
                className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Assignee - Combo box with autocomplete */}
            <div className="relative">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Assignee
              </label>
              <input
                type="text"
                value={assigneeInput}
                onChange={(e) => {
                  setAssigneeInput(e.target.value)
                  setShowAssigneeSuggestions(true)
                }}
                onFocus={() => setShowAssigneeSuggestions(true)}
                onBlur={() => {
                  // Delay hiding to allow click on suggestion
                  setTimeout(() => setShowAssigneeSuggestions(false), 150)
                }}
                placeholder="Type a name or select from list..."
                className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {matchedUser && (
                <span className="absolute right-3 top-[30px] text-xs text-green-600">
                  ✓ Linked
                </span>
              )}

              {/* Suggestions dropdown */}
              {showAssigneeSuggestions && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto">
                  {users.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-500 italic">
                      Loading team members...
                    </div>
                  ) : filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => handleSelectUser(user)}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${
                          matchedUser?.id === user.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                        }`}
                      >
                        {user.fullName}
                        <span className="text-xs text-gray-400 ml-2">{user.email}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500 italic">
                      No matching team members. Name will be saved as-is.
                    </div>
                  )}
                </div>
              )}
              <p className="text-[10px] text-gray-500 mt-1">
                Select a team member or type any name
              </p>
            </div>

            {/* Status & Priority Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Backlog">Backlog</option>
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
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

            {/* Link to Meeting */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Link to Meeting
              </label>
              {meetings.length > 0 ? (
                <>
                  <input
                    type="text"
                    value={meetingSearch}
                    onChange={(e) => setMeetingSearch(e.target.value)}
                    placeholder="Search meetings..."
                    className="w-full text-sm border border-gray-300 rounded px-3 py-2 mb-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <select
                    value={meetingId}
                    onChange={(e) => setMeetingId(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    size={Math.min(5, filteredMeetings.length + 1)}
                  >
                    <option value="">No linked meeting</option>
                    {filteredMeetings.slice(0, 50).map((meeting) => (
                      <option key={meeting.id} value={meeting.id}>
                        {meeting.title} ({formatMeetingDate(meeting.startTime)})
                      </option>
                    ))}
                  </select>
                  {meetingId && (
                    <button
                      type="button"
                      onClick={() => setMeetingId('')}
                      className="mt-1 text-xs text-blue-600 hover:text-blue-800"
                    >
                      Clear selection
                    </button>
                  )}
                </>
              ) : (
                <div className="text-xs text-gray-500 italic">
                  Loading meetings...
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 mt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim() || isLoading}
                className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
