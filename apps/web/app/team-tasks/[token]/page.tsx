'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  Calendar,
  Loader2,
  ChevronDown,
  ChevronRight,
  Play,
  Pause,
  MessageSquare,
  CalendarClock,
  X,
  Save,
  RotateCcw,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  Eye,
  EyeOff,
  Filter,
  HelpCircle,
  Send,
  FileText,
  Users,
  History,
  Bell,
  Settings,
  Mail,
  Plus,
  ListChecks,
  Trash2,
} from 'lucide-react'

interface Subtask {
  id: string
  name: string
  status: string
  parentTaskId: string
}

interface SubtaskProgress {
  complete: number
  total: number
}

interface TaskItem {
  id: string
  type: 'task' | 'action_item'
  name: string
  description?: string
  status: string
  priority: string
  dueDate?: string
  source: string
  sourceMeetingId?: string
  sourceMeetingTitle?: string
  sourceMeetingDate?: string
  sourceMeetingSummary?: string
  blockerDescription?: string
  blocker?: string
  requestedDueDate?: string
  createdTime?: string
  helpRequested?: boolean
  helpRequestMessage?: string
  commentCount?: number
  reminderDate?: string
  subtasks?: Subtask[]
  subtaskProgress?: SubtaskProgress
}

interface UserPreferences {
  email?: string
  reminderFrequency: 'daily' | 'weekly' | 'none'
}

interface Comment {
  id: string
  authorName: string
  authorType: 'team_member' | 'admin'
  content: string
  createdAt: string
}

interface ActivityItem {
  id: string
  action: string
  oldValue?: string
  newValue?: string
  actorName: string
  actorType: string
  createdAt: string
}

interface RelatedTask {
  id: string
  name: string
  assignee: string
  status: string
  type: 'task' | 'action_item'
}

interface TasksData {
  assigneeName: string
  overdue: TaskItem[]
  dueToday: TaskItem[]
  upcoming: TaskItem[]
  noDueDate: TaskItem[]
  total: number
}

// Types for filtering/sorting
type SortOption = 'dueDate' | 'dueDateDesc' | 'priority' | 'alphabetical' | 'recentlyAdded'
type GroupOption = 'dueDate' | 'status' | 'priority' | 'meeting' | 'none'
type StatusFilter = 'all' | 'Open' | 'In Progress' | 'Blocked' | 'Done'
type PriorityFilter = 'all' | 'Critical' | 'High' | 'Medium' | 'Low'

interface Preferences {
  sortBy: SortOption
  groupBy: GroupOption
  statusFilter: StatusFilter
  priorityFilter: PriorityFilter
  showCompleted: boolean
  searchQuery: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
const STORAGE_KEY = 'team-tasks-preferences'

const STATUS_OPTIONS = [
  { value: 'Open', label: 'Open', icon: Circle, color: 'text-gray-500', bg: 'bg-gray-100' },
  { value: 'In Progress', label: 'In Progress', icon: Play, color: 'text-blue-600', bg: 'bg-blue-100' },
  { value: 'Blocked', label: 'Blocked', icon: Pause, color: 'text-orange-600', bg: 'bg-orange-100' },
  { value: 'Done', label: 'Done', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100' },
]

const PRIORITY_OPTIONS = [
  { value: 'Critical', color: 'bg-red-100 text-red-800 border-red-200', order: 4 },
  { value: 'High', color: 'bg-orange-100 text-orange-800 border-orange-200', order: 3 },
  { value: 'Medium', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', order: 2 },
  { value: 'Low', color: 'bg-gray-100 text-gray-600 border-gray-200', order: 1 },
]

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'dueDate', label: 'Due Date (soonest)' },
  { value: 'dueDateDesc', label: 'Due Date (latest)' },
  { value: 'priority', label: 'Priority (highest)' },
  { value: 'alphabetical', label: 'Alphabetical' },
  { value: 'recentlyAdded', label: 'Recently Added' },
]

const GROUP_OPTIONS: { value: GroupOption; label: string }[] = [
  { value: 'dueDate', label: 'Due Date' },
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priority' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'none', label: 'No Grouping' },
]

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  })
}

function getPriorityOrder(priority: string): number {
  return PRIORITY_OPTIONS.find(p => p.value === priority)?.order || 0
}

// Load preferences from localStorage
function loadPreferences(): Preferences {
  if (typeof window === 'undefined') {
    return getDefaultPreferences()
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return { ...getDefaultPreferences(), ...JSON.parse(stored) }
    }
  } catch {
    // Ignore parse errors
  }
  return getDefaultPreferences()
}

function getDefaultPreferences(): Preferences {
  return {
    sortBy: 'dueDate',
    groupBy: 'dueDate',
    statusFilter: 'all',
    priorityFilter: 'all',
    showCompleted: false,
    searchQuery: '',
  }
}

// Save preferences to localStorage
function savePreferences(prefs: Partial<Preferences>) {
  if (typeof window === 'undefined') return
  try {
    const current = loadPreferences()
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...prefs }))
  } catch {
    // Ignore storage errors
  }
}

function PriorityBadge({
  priority,
  onClick,
  editable = false
}: {
  priority: string
  onClick?: () => void
  editable?: boolean
}) {
  const option = PRIORITY_OPTIONS.find(p => p.value === priority) || PRIORITY_OPTIONS[2]

  return (
    <button
      onClick={onClick}
      disabled={!editable}
      className={`px-2 py-0.5 rounded text-xs font-medium border ${option.color} ${
        editable ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
      }`}
    >
      {priority}
    </button>
  )
}

function StatusBadge({ status }: { status: string }) {
  const option = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0]
  const Icon = option.icon

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${option.bg} ${option.color}`}>
      <Icon className="w-3 h-3" />
      {option.label}
    </span>
  )
}

// Filter/Sort Toolbar
function Toolbar({
  preferences,
  onPreferencesChange,
  taskCount,
  filteredCount,
}: {
  preferences: Preferences
  onPreferencesChange: (prefs: Partial<Preferences>) => void
  taskCount: number
  filteredCount: number
}) {
  const [showFilters, setShowFilters] = useState(false)

  const hasActiveFilters = preferences.statusFilter !== 'all' ||
    preferences.priorityFilter !== 'all' ||
    preferences.searchQuery.length > 0

  return (
    <div className="bg-white border-b sticky top-[73px] z-10">
      <div className="max-w-3xl mx-auto px-4 py-3">
        {/* Search bar */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={preferences.searchQuery}
            onChange={(e) => onPreferencesChange({ searchQuery: e.target.value })}
            placeholder="Search tasks..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {preferences.searchQuery && (
            <button
              onClick={() => onPreferencesChange({ searchQuery: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Controls row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sort dropdown */}
          <div className="relative">
            <select
              value={preferences.sortBy}
              onChange={(e) => onPreferencesChange({ sortBy: e.target.value as SortOption })}
              className="appearance-none pl-8 pr-8 py-1.5 text-xs border rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ArrowUpDown className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Group dropdown */}
          <div className="relative">
            <select
              value={preferences.groupBy}
              onChange={(e) => onPreferencesChange({ groupBy: e.target.value as GroupOption })}
              className="appearance-none pl-8 pr-8 py-1.5 text-xs border rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
            >
              {GROUP_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>Group: {opt.label}</option>
              ))}
            </select>
            <SlidersHorizontal className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Filters button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-lg ${
              hasActiveFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white text-gray-600'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters
            {hasActiveFilters && (
              <span className="bg-blue-600 text-white px-1.5 rounded-full text-[10px]">
                {(preferences.statusFilter !== 'all' ? 1 : 0) + (preferences.priorityFilter !== 'all' ? 1 : 0)}
              </span>
            )}
          </button>

          {/* Show/hide completed toggle */}
          <button
            onClick={() => onPreferencesChange({ showCompleted: !preferences.showCompleted })}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-lg ${
              preferences.showCompleted ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white text-gray-600'
            }`}
          >
            {preferences.showCompleted ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {preferences.showCompleted ? 'Showing Done' : 'Hide Done'}
          </button>

          {/* Task count */}
          <span className="ml-auto text-xs text-gray-500">
            {filteredCount === taskCount ? `${taskCount} tasks` : `${filteredCount} of ${taskCount} tasks`}
          </span>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t flex flex-wrap gap-3">
            {/* Status filter */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => onPreferencesChange({ statusFilter: 'all' })}
                  className={`px-2 py-1 text-xs rounded ${
                    preferences.statusFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  All
                </button>
                {STATUS_OPTIONS.filter(s => s.value !== 'Done').map(status => (
                  <button
                    key={status.value}
                    onClick={() => onPreferencesChange({ statusFilter: status.value as StatusFilter })}
                    className={`px-2 py-1 text-xs rounded ${
                      preferences.statusFilter === status.value ? `${status.bg} ${status.color}` : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority filter */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => onPreferencesChange({ priorityFilter: 'all' })}
                  className={`px-2 py-1 text-xs rounded ${
                    preferences.priorityFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  All
                </button>
                {PRIORITY_OPTIONS.map(priority => (
                  <button
                    key={priority.value}
                    onClick={() => onPreferencesChange({ priorityFilter: priority.value as PriorityFilter })}
                    className={`px-2 py-1 text-xs rounded border ${
                      preferences.priorityFilter === priority.value ? priority.color : 'bg-gray-100 text-gray-600 border-transparent'
                    }`}
                  >
                    {priority.value}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear filters */}
            {hasActiveFilters && (
              <button
                onClick={() => onPreferencesChange({
                  statusFilter: 'all',
                  priorityFilter: 'all',
                  searchQuery: '',
                })}
                className="self-end px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
              >
                Clear all
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Priority Selector Modal
function PrioritySelector({
  currentPriority,
  onSelect,
  onClose,
}: {
  currentPriority: string
  onSelect: (priority: string) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-xs w-full p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium text-gray-900">Set Priority</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-2">
          {PRIORITY_OPTIONS.map(option => (
            <button
              key={option.value}
              onClick={() => onSelect(option.value)}
              className={`w-full text-left px-3 py-2 rounded border ${option.color} ${
                currentPriority === option.value ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              {option.value}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// Status Selector Modal
function StatusSelector({
  currentStatus,
  onSelect,
  onClose,
}: {
  currentStatus: string
  onSelect: (status: string, blocker?: string) => void
  onClose: () => void
}) {
  const [blockerText, setBlockerText] = useState('')
  const [showBlockerInput, setShowBlockerInput] = useState(false)

  const handleSelect = (status: string) => {
    if (status === 'Blocked') {
      setShowBlockerInput(true)
    } else {
      onSelect(status)
    }
  }

  const handleBlockerSubmit = () => {
    if (!blockerText.trim()) {
      alert('Please describe what is blocking this task')
      return
    }
    onSelect('Blocked', blockerText)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium text-gray-900">
            {showBlockerInput ? 'What is blocking this task?' : 'Update Status'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {showBlockerInput ? (
          <div className="space-y-3">
            <textarea
              value={blockerText}
              onChange={(e) => setBlockerText(e.target.value)}
              placeholder="Describe what's preventing progress..."
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowBlockerInput(false)}
                className="flex-1 px-3 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleBlockerSubmit}
                className="flex-1 px-3 py-2 text-sm text-white bg-orange-600 rounded-lg hover:bg-orange-700"
              >
                Set as Blocked
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {STATUS_OPTIONS.map(option => {
              const Icon = option.icon
              return (
                <button
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={`w-full flex items-center gap-3 text-left px-3 py-2 rounded border ${option.bg} ${option.color} ${
                    currentStatus === option.value ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {option.label}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// Notes Editor Modal
function NotesEditor({
  taskName,
  currentNotes,
  onSave,
  onClose,
}: {
  taskName: string
  currentNotes?: string
  onSave: (notes: string) => void
  onClose: () => void
}) {
  const [notes, setNotes] = useState(currentNotes || '')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium text-gray-900">Notes</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{taskName}</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes, updates, or context..."
          className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          rows={5}
          autoFocus
        />
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(notes)}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Notes
          </button>
        </div>
      </div>
    </div>
  )
}

// Extension Request Modal
function ExtensionRequestModal({
  taskName,
  currentDueDate,
  onSubmit,
  onClose,
}: {
  taskName: string
  currentDueDate?: string
  onSubmit: (requestedDate: string, reason: string) => void
  onClose: () => void
}) {
  const [requestedDate, setRequestedDate] = useState('')
  const [reason, setReason] = useState('')

  const handleSubmit = () => {
    if (!requestedDate) {
      alert('Please select a new due date')
      return
    }
    if (!reason.trim()) {
      alert('Please provide a reason for the extension')
      return
    }
    onSubmit(requestedDate, reason)
  }

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium text-gray-900">Request Due Date Extension</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{taskName}</p>

        {currentDueDate && (
          <p className="text-xs text-gray-500 mb-3">
            Current due date: {formatDate(currentDueDate)}
          </p>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Requested new date
            </label>
            <input
              type="date"
              value={requestedDate}
              onChange={(e) => setRequestedDate(e.target.value)}
              min={minDate}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason for extension
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why you need more time..."
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <CalendarClock className="w-4 h-4" />
            Submit Request
          </button>
        </div>
      </div>
    </div>
  )
}

// Comments Modal
function CommentsModal({
  taskId,
  taskName,
  token,
  onClose,
}: {
  taskId: string
  taskName: string
  token: string
  onClose: () => void
}) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchComments()
  }, [taskId, token])

  const fetchComments = async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/team-tasks/${token}/items/${taskId}/comments`)
      const result = await response.json()
      if (result.success) {
        setComments(result.data)
      }
    } catch (err) {
      console.error('Failed to fetch comments:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!newComment.trim()) return
    setSubmitting(true)
    try {
      const response = await fetch(`${API_URL}/api/v1/team-tasks/${token}/items/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment }),
      })
      const result = await response.json()
      if (result.success) {
        setComments([...comments, result.data])
        setNewComment('')
      } else {
        alert(result.error?.message || 'Failed to add comment')
      }
    } catch (err) {
      alert('Failed to add comment')
    } finally {
      setSubmitting(false)
    }
  }

  const formatCommentDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="font-medium text-gray-900">Comments</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="px-4 py-2 text-sm text-gray-600 border-b line-clamp-2">{taskName}</p>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No comments yet. Start the conversation!</p>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className={`p-3 rounded-lg ${
                  comment.authorType === 'admin'
                    ? 'bg-blue-50 border border-blue-100'
                    : 'bg-gray-50 border border-gray-100'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-sm font-medium text-gray-900">
                    {comment.authorName}
                    {comment.authorType === 'admin' && (
                      <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                        Admin
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-gray-400">{formatCommentDate(comment.createdAt)}</span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t">
          <div className="flex gap-2">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={2}
            />
            <button
              onClick={handleSubmit}
              disabled={!newComment.trim() || submitting}
              className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Help Request Modal
function HelpRequestModal({
  taskId,
  taskName,
  token,
  onSubmit,
  onClose,
}: {
  taskId: string
  taskName: string
  token: string
  onSubmit: () => void
  onClose: () => void
}) {
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const response = await fetch(`${API_URL}/api/v1/team-tasks/${token}/items/${taskId}/request-help`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to submit help request')
      }
      alert('Help request submitted! Your team will be notified.')
      onSubmit()
      onClose()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to submit help request')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium text-gray-900 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-purple-600" />
            Request Help
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{taskName}</p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            What do you need help with? (optional)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe what you need help with..."
            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
          />
        </div>

        <p className="text-xs text-gray-500 mb-4">
          This will flag the task for admin attention. They'll see your request and can follow up.
        </p>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 text-sm text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <HelpCircle className="w-4 h-4" />}
            Request Help
          </button>
        </div>
      </div>
    </div>
  )
}

// Meeting Context Modal
function MeetingContextModal({
  task,
  token,
  onClose,
}: {
  task: TaskItem
  token: string
  onClose: () => void
}) {
  const [relatedTasks, setRelatedTasks] = useState<RelatedTask[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (task.sourceMeetingId) {
      fetchRelatedTasks()
    } else {
      setLoading(false)
    }
  }, [task.id, token])

  const fetchRelatedTasks = async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/team-tasks/${token}/items/${task.id}/related`)
      const result = await response.json()
      if (result.success) {
        setRelatedTasks(result.data)
      }
    } catch (err) {
      console.error('Failed to fetch related tasks:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatMeetingDate = (dateString?: string) => {
    if (!dateString) return 'Unknown date'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="font-medium text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Meeting Context
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {task.sourceMeetingTitle ? (
            <>
              <div className="mb-4">
                <h4 className="font-medium text-gray-900">{task.sourceMeetingTitle}</h4>
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                  <Calendar className="w-4 h-4" />
                  {formatMeetingDate(task.sourceMeetingDate)}
                </p>
              </div>

              {task.sourceMeetingSummary && (
                <div className="mb-4">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Meeting Summary</h5>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    {task.sourceMeetingSummary}
                  </p>
                </div>
              )}

              <div className="mb-4">
                <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Related Tasks from this Meeting
                </h5>
                {loading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  </div>
                ) : relatedTasks.length === 0 ? (
                  <p className="text-sm text-gray-500 py-2">No other tasks from this meeting</p>
                ) : (
                  <ul className="space-y-2">
                    {relatedTasks.map((rt) => (
                      <li key={rt.id} className="text-sm p-2 bg-gray-50 rounded border">
                        <p className="font-medium text-gray-800">{rt.name}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          <span>{rt.assignee}</span>
                          <span>•</span>
                          <span className={
                            rt.status === 'Done' || rt.status === 'Complete'
                              ? 'text-green-600'
                              : rt.status === 'Blocked'
                              ? 'text-orange-600'
                              : rt.status === 'In Progress'
                              ? 'text-blue-600'
                              : 'text-gray-500'
                          }>
                            {rt.status}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : (
            <p className="text-center text-gray-500 py-8">
              This task is not linked to a meeting
            </p>
          )}
        </div>

        <div className="p-4 border-t">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// Activity History Modal
function ActivityModal({
  taskId,
  taskName,
  token,
  onClose,
}: {
  taskId: string
  taskName: string
  token: string
  onClose: () => void
}) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchActivities()
  }, [taskId, token])

  const fetchActivities = async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/team-tasks/${token}/items/${taskId}/activity`)
      const result = await response.json()
      if (result.success) {
        setActivities(result.data)
      }
    } catch (err) {
      console.error('Failed to fetch activities:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatActivityDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const getActionDescription = (activity: ActivityItem) => {
    switch (activity.action) {
      case 'created':
        return 'created this task'
      case 'status_changed':
        return `changed status from "${activity.oldValue}" to "${activity.newValue}"`
      case 'priority_changed':
        return `changed priority from "${activity.oldValue}" to "${activity.newValue}"`
      case 'note_added':
        return 'added notes'
      case 'help_requested':
        return 'requested help'
      case 'extension_requested':
        return `requested due date extension to ${activity.newValue}`
      case 'comment_added':
        return 'added a comment'
      case 'blocker_added':
        return `added blocker: "${activity.newValue}"`
      default:
        return activity.action.replace(/_/g, ' ')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="font-medium text-gray-900 flex items-center gap-2">
            <History className="w-5 h-5 text-gray-600" />
            Activity History
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="px-4 py-2 text-sm text-gray-600 border-b line-clamp-2">{taskName}</p>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : activities.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No activity recorded yet</p>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">{activity.actorName}</span>{' '}
                      {getActionDescription(activity)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatActivityDate(activity.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// Preferences Modal
function PreferencesModal({
  token,
  onClose,
}: {
  token: string
  onClose: () => void
}) {
  const [email, setEmail] = useState('')
  const [reminderFrequency, setReminderFrequency] = useState<'daily' | 'weekly' | 'none'>('none')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchPreferences()
  }, [token])

  const fetchPreferences = async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/team-tasks/${token}/preferences`)
      const result = await response.json()
      if (result.success) {
        setEmail(result.data.email || '')
        setReminderFrequency(result.data.reminderFrequency || 'none')
      }
    } catch (err) {
      console.error('Failed to fetch preferences:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch(`${API_URL}/api/v1/team-tasks/${token}/preferences`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, reminderFrequency }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to save preferences')
      }
      alert('Preferences saved successfully!')
      onClose()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium text-gray-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-600" />
            Preferences
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Used for task reminders (if enabled)
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Task Reminders
              </label>
              <div className="space-y-2">
                {(['none', 'daily', 'weekly'] as const).map((freq) => (
                  <label
                    key={freq}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      reminderFrequency === freq
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reminderFrequency"
                      value={freq}
                      checked={reminderFrequency === freq}
                      onChange={() => setReminderFrequency(freq)}
                      className="text-blue-600"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900 capitalize">{freq === 'none' ? 'No reminders' : freq}</p>
                      <p className="text-xs text-gray-500">
                        {freq === 'none' && "Don't send any email reminders"}
                        {freq === 'daily' && 'Get a daily summary of your open tasks'}
                        {freq === 'weekly' && 'Get a weekly summary every Monday'}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Preferences
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Reminder Modal
function ReminderModal({
  taskId,
  taskName,
  currentReminderDate,
  token,
  onSubmit,
  onClose,
}: {
  taskId: string
  taskName: string
  currentReminderDate?: string
  token: string
  onSubmit: () => void
  onClose: () => void
}) {
  const [reminderDate, setReminderDate] = useState(currentReminderDate || '')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const response = await fetch(`${API_URL}/api/v1/team-tasks/${token}/items/${taskId}/reminder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminderDate: reminderDate || null }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to set reminder')
      }
      alert(reminderDate ? 'Reminder set!' : 'Reminder cleared!')
      onSubmit()
      onClose()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to set reminder')
    } finally {
      setSubmitting(false)
    }
  }

  const setQuickDate = (days: number) => {
    const date = new Date()
    date.setDate(date.getDate() + days)
    setReminderDate(date.toISOString().split('T')[0])
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium text-gray-900 flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            Set Reminder
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{taskName}</p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Quick Select</label>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setQuickDate(1)}
              className="px-3 py-1.5 text-xs border rounded-lg hover:bg-gray-50"
            >
              Tomorrow
            </button>
            <button
              onClick={() => setQuickDate(3)}
              className="px-3 py-1.5 text-xs border rounded-lg hover:bg-gray-50"
            >
              In 3 days
            </button>
            <button
              onClick={() => setQuickDate(7)}
              className="px-3 py-1.5 text-xs border rounded-lg hover:bg-gray-50"
            >
              Next week
            </button>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Or select date</label>
          <input
            type="date"
            value={reminderDate}
            onChange={(e) => setReminderDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {currentReminderDate && (
          <button
            onClick={() => setReminderDate('')}
            className="w-full mb-4 text-sm text-red-600 hover:text-red-700"
          >
            Clear existing reminder
          </button>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
            {reminderDate ? 'Set Reminder' : 'Clear Reminder'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Enhanced Task Card
function TaskCard({
  task,
  token,
  onUpdate,
  searchQuery,
}: {
  task: TaskItem
  token: string
  onUpdate: () => void
  searchQuery?: string
}) {
  const [showStatusSelector, setShowStatusSelector] = useState(false)
  const [showPrioritySelector, setShowPrioritySelector] = useState(false)
  const [showNotesEditor, setShowNotesEditor] = useState(false)
  const [showExtensionModal, setShowExtensionModal] = useState(false)
  const [showCommentsModal, setShowCommentsModal] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [showMeetingContext, setShowMeetingContext] = useState(false)
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [showReminderModal, setShowReminderModal] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [showSubtasks, setShowSubtasks] = useState(false)
  const [newSubtaskName, setNewSubtaskName] = useState('')
  const [isAddingSubtask, setIsAddingSubtask] = useState(false)

  const isComplete = task.status === 'Done' || task.status === 'Complete'
  const isBlocked = task.status === 'Blocked'
  const hasHelpRequested = task.helpRequested
  const hasMeetingContext = !!task.sourceMeetingId
  const hasReminder = !!task.reminderDate
  const hasSubtasks = task.subtasks && task.subtasks.length > 0
  const isTaskType = task.type === 'task' // Only tasks support subtasks, not action items

  // Highlight matching text
  const highlightMatch = (text: string) => {
    if (!searchQuery || searchQuery.length < 2) return text
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    return parts.map((part, i) =>
      regex.test(part) ? <mark key={i} className="bg-yellow-200">{part}</mark> : part
    )
  }

  const handleStatusChange = async (status: string, blocker?: string) => {
    setIsUpdating(true)
    setShowStatusSelector(false)
    try {
      const response = await fetch(`${API_URL}/api/v1/team-tasks/${token}/items/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, blocker }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to update status')
      }
      onUpdate()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setIsUpdating(false)
    }
  }

  const handlePriorityChange = async (priority: string) => {
    setIsUpdating(true)
    setShowPrioritySelector(false)
    try {
      const response = await fetch(`${API_URL}/api/v1/team-tasks/${token}/items/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to update priority')
      }
      onUpdate()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update priority')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleNotesSave = async (notes: string) => {
    setIsUpdating(true)
    setShowNotesEditor(false)
    try {
      const response = await fetch(`${API_URL}/api/v1/team-tasks/${token}/items/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to save notes')
      }
      onUpdate()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save notes')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleExtensionRequest = async (requestedDate: string, reason: string) => {
    setIsUpdating(true)
    setShowExtensionModal(false)
    try {
      const response = await fetch(`${API_URL}/api/v1/team-tasks/${token}/items/${task.id}/request-extension`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestedDate, reason }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to submit extension request')
      }
      alert('Extension request submitted successfully!')
      onUpdate()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to submit extension request')
    } finally {
      setIsUpdating(false)
    }
  }

  const quickToggleStatus = () => {
    if (isComplete) {
      handleStatusChange('Open')
    } else {
      handleStatusChange('Done')
    }
  }

  const handleAddSubtask = async () => {
    if (!newSubtaskName.trim()) return
    setIsAddingSubtask(true)
    try {
      const response = await fetch(`${API_URL}/api/v1/team-tasks/${token}/items/${task.id}/subtasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSubtaskName.trim() }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to create subtask')
      }
      setNewSubtaskName('')
      onUpdate()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create subtask')
    } finally {
      setIsAddingSubtask(false)
    }
  }

  const handleToggleSubtask = async (subtaskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Done' ? 'Open' : 'Done'
    try {
      const response = await fetch(`${API_URL}/api/v1/team-tasks/${token}/subtasks/${subtaskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to update subtask')
      }
      onUpdate()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update subtask')
    }
  }

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!confirm('Delete this subtask?')) return
    try {
      const response = await fetch(`${API_URL}/api/v1/team-tasks/${token}/subtasks/${subtaskId}`, {
        method: 'DELETE',
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to delete subtask')
      }
      onUpdate()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete subtask')
    }
  }

  return (
    <>
      <div
        className={`bg-white rounded-lg border p-4 shadow-sm transition-all ${
          isComplete ? 'opacity-60' : ''
        } ${isBlocked ? 'border-orange-300 bg-orange-50/50' : ''}`}
      >
        <div className="flex items-start gap-3">
          <button
            onClick={quickToggleStatus}
            disabled={isUpdating}
            className="mt-0.5 flex-shrink-0 text-gray-400 hover:text-green-600 transition-colors"
            aria-label={isComplete ? 'Mark as incomplete' : 'Mark as complete'}
          >
            {isUpdating ? (
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            ) : isComplete ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : isBlocked ? (
              <Pause className="w-5 h-5 text-orange-500" />
            ) : (
              <Circle className="w-5 h-5" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium text-gray-900 ${isComplete ? 'line-through' : ''}`}>
              {highlightMatch(task.name)}
            </p>

            {task.description && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{highlightMatch(task.description)}</p>
            )}

            {isBlocked && (task.blockerDescription || task.blocker) && (
              <div className="mt-2 p-2 bg-orange-100 border border-orange-200 rounded text-xs text-orange-800">
                <strong>Blocked:</strong> {task.blockerDescription || task.blocker}
              </div>
            )}

            {hasHelpRequested && (
              <div className="mt-2 p-2 bg-purple-100 border border-purple-200 rounded text-xs text-purple-800 flex items-start gap-2">
                <HelpCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Help Requested</strong>
                  {task.helpRequestMessage && <p className="mt-1">{task.helpRequestMessage}</p>}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 mt-2">
              <button
                onClick={() => setShowStatusSelector(true)}
                className="hover:opacity-80"
              >
                <StatusBadge status={task.status} />
              </button>

              <PriorityBadge
                priority={task.priority}
                onClick={() => setShowPrioritySelector(true)}
                editable
              />

              {task.dueDate && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                  <Calendar className="w-3 h-3" />
                  {formatDate(task.dueDate)}
                </span>
              )}

              {task.requestedDueDate && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-700">
                  <CalendarClock className="w-3 h-3" />
                  Extension pending
                </span>
              )}

              {task.sourceMeetingTitle && (
                <button
                  onClick={() => setShowMeetingContext(true)}
                  className="text-xs text-blue-600 hover:text-blue-800 truncate max-w-[180px] hover:underline flex items-center gap-1"
                >
                  <FileText className="w-3 h-3" />
                  {task.sourceMeetingTitle}
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              <button
                onClick={() => setShowCommentsModal(true)}
                className={`inline-flex items-center gap-1 px-2 py-1 text-xs border rounded hover:bg-gray-50 ${
                  (task.commentCount || 0) > 0 ? 'text-blue-600 border-blue-200 bg-blue-50' : 'text-gray-600'
                }`}
              >
                <MessageSquare className="w-3 h-3" />
                {(task.commentCount || 0) > 0 ? `${task.commentCount} Comments` : 'Comment'}
              </button>

              <button
                onClick={() => setShowNotesEditor(true)}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 border rounded hover:bg-gray-50"
              >
                <Save className="w-3 h-3" />
                {task.description ? 'Edit Notes' : 'Add Notes'}
              </button>

              <button
                onClick={() => setShowActivityModal(true)}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 border rounded hover:bg-gray-50"
              >
                <History className="w-3 h-3" />
                History
              </button>

              {!isComplete && (
                <button
                  onClick={() => setShowReminderModal(true)}
                  className={`inline-flex items-center gap-1 px-2 py-1 text-xs border rounded hover:bg-gray-50 ${
                    hasReminder ? 'text-blue-600 border-blue-200 bg-blue-50' : 'text-gray-600'
                  }`}
                >
                  <Bell className="w-3 h-3" />
                  {hasReminder ? `Reminder: ${formatDate(task.reminderDate!)}` : 'Remind Me'}
                </button>
              )}

              {!isComplete && !hasHelpRequested && (
                <button
                  onClick={() => setShowHelpModal(true)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs text-purple-600 border border-purple-200 rounded hover:bg-purple-50"
                >
                  <HelpCircle className="w-3 h-3" />
                  Need Help
                </button>
              )}

              {task.dueDate && !isComplete && (
                <button
                  onClick={() => setShowExtensionModal(true)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 border rounded hover:bg-gray-50"
                >
                  <CalendarClock className="w-3 h-3" />
                  Request Extension
                </button>
              )}

              {isComplete && (
                <button
                  onClick={() => handleStatusChange('Open')}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 border rounded hover:bg-gray-50"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reopen
                </button>
              )}

              {/* Subtasks button - only for task type, not action items */}
              {isTaskType && !isComplete && (
                <button
                  onClick={() => setShowSubtasks(!showSubtasks)}
                  className={`inline-flex items-center gap-1 px-2 py-1 text-xs border rounded hover:bg-gray-50 ${
                    hasSubtasks ? 'text-indigo-600 border-indigo-200 bg-indigo-50' : 'text-gray-600'
                  }`}
                >
                  <ListChecks className="w-3 h-3" />
                  {hasSubtasks
                    ? `Subtasks (${task.subtaskProgress?.complete}/${task.subtaskProgress?.total})`
                    : 'Add Subtask'
                  }
                </button>
              )}
            </div>

            {/* Subtask Progress Indicator */}
            {hasSubtasks && task.subtaskProgress && !showSubtasks && (
              <div className="mt-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all duration-300"
                      style={{ width: `${(task.subtaskProgress.complete / task.subtaskProgress.total) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">
                    {task.subtaskProgress.complete}/{task.subtaskProgress.total}
                  </span>
                </div>
              </div>
            )}

            {/* Subtasks Section (Expanded) */}
            {showSubtasks && isTaskType && (
              <div className="mt-3 pt-3 border-t">
                <div className="flex items-center gap-2 mb-2">
                  <ListChecks className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-medium text-gray-700">Subtasks</span>
                  {task.subtaskProgress && (
                    <span className="text-xs text-gray-500">
                      ({task.subtaskProgress.complete}/{task.subtaskProgress.total} complete)
                    </span>
                  )}
                </div>

                {/* Existing Subtasks */}
                {hasSubtasks && (
                  <div className="space-y-1 mb-2">
                    {task.subtasks!.map((subtask) => (
                      <div
                        key={subtask.id}
                        className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-gray-50 group"
                      >
                        <button
                          onClick={() => handleToggleSubtask(subtask.id, subtask.status)}
                          className="flex-shrink-0"
                        >
                          {subtask.status === 'Done' ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <Circle className="w-4 h-4 text-gray-400 hover:text-green-500" />
                          )}
                        </button>
                        <span
                          className={`flex-1 text-sm ${
                            subtask.status === 'Done' ? 'line-through text-gray-400' : 'text-gray-700'
                          }`}
                        >
                          {subtask.name}
                        </span>
                        <button
                          onClick={() => handleDeleteSubtask(subtask.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity"
                          aria-label="Delete subtask"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add New Subtask Input */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newSubtaskName}
                    onChange={(e) => setNewSubtaskName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                    placeholder="Add a subtask..."
                    className="flex-1 px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={handleAddSubtask}
                    disabled={!newSubtaskName.trim() || isAddingSubtask}
                    className="p-1.5 text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAddingSubtask ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showStatusSelector && (
        <StatusSelector
          currentStatus={task.status}
          onSelect={handleStatusChange}
          onClose={() => setShowStatusSelector(false)}
        />
      )}

      {showPrioritySelector && (
        <PrioritySelector
          currentPriority={task.priority}
          onSelect={handlePriorityChange}
          onClose={() => setShowPrioritySelector(false)}
        />
      )}

      {showNotesEditor && (
        <NotesEditor
          taskName={task.name}
          currentNotes={task.description}
          onSave={handleNotesSave}
          onClose={() => setShowNotesEditor(false)}
        />
      )}

      {showExtensionModal && (
        <ExtensionRequestModal
          taskName={task.name}
          currentDueDate={task.dueDate}
          onSubmit={handleExtensionRequest}
          onClose={() => setShowExtensionModal(false)}
        />
      )}

      {showCommentsModal && (
        <CommentsModal
          taskId={task.id}
          taskName={task.name}
          token={token}
          onClose={() => {
            setShowCommentsModal(false)
            onUpdate() // Refresh to get updated comment count
          }}
        />
      )}

      {showHelpModal && (
        <HelpRequestModal
          taskId={task.id}
          taskName={task.name}
          token={token}
          onSubmit={onUpdate}
          onClose={() => setShowHelpModal(false)}
        />
      )}

      {showMeetingContext && (
        <MeetingContextModal
          task={task}
          token={token}
          onClose={() => setShowMeetingContext(false)}
        />
      )}

      {showActivityModal && (
        <ActivityModal
          taskId={task.id}
          taskName={task.name}
          token={token}
          onClose={() => setShowActivityModal(false)}
        />
      )}

      {showReminderModal && (
        <ReminderModal
          taskId={task.id}
          taskName={task.name}
          currentReminderDate={task.reminderDate}
          token={token}
          onSubmit={onUpdate}
          onClose={() => setShowReminderModal(false)}
        />
      )}
    </>
  )
}

// Task Group component
function TaskGroup({
  title,
  icon: Icon,
  tasks,
  iconColor,
  defaultOpen = true,
  token,
  onUpdate,
  searchQuery,
}: {
  title: string
  icon?: React.ComponentType<{ className?: string }>
  tasks: TaskItem[]
  iconColor?: string
  defaultOpen?: boolean
  token: string
  onUpdate: () => void
  searchQuery?: string
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  if (tasks.length === 0) return null

  return (
    <div className="mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full text-left mb-3"
      >
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
        {Icon && <Icon className={`w-5 h-5 ${iconColor || 'text-gray-500'}`} />}
        <h2 className="text-sm font-semibold text-gray-700">
          {title} ({tasks.length})
        </h2>
      </button>

      {isOpen && (
        <div className="space-y-3 pl-6">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              token={token}
              onUpdate={onUpdate}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function TeamMemberTasksPage() {
  const params = useParams()
  const token = params.token as string

  const [data, setData] = useState<TasksData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [preferences, setPreferences] = useState<Preferences>(getDefaultPreferences)

  // Load preferences on mount
  useEffect(() => {
    setPreferences(loadPreferences())
  }, [])

  const handlePreferencesChange = useCallback((newPrefs: Partial<Preferences>) => {
    setPreferences(prev => {
      const updated = { ...prev, ...newPrefs }
      savePreferences(newPrefs)
      return updated
    })
  }, [])

  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/team-tasks/${token}`)
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to load tasks')
      }

      setData(result.data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  // Process and filter tasks
  const processedTasks = useMemo(() => {
    if (!data) return { filtered: [], grouped: new Map<string, TaskItem[]>(), total: 0 }

    // Combine all tasks
    let allTasks = [...data.overdue, ...data.dueToday, ...data.upcoming, ...data.noDueDate]

    // Add completed tasks if showCompleted is true (need to fetch separately or include in API)
    // For now, we work with what we have

    // Apply filters
    let filtered = allTasks

    // Search filter
    if (preferences.searchQuery.length >= 2) {
      const query = preferences.searchQuery.toLowerCase()
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query) ||
        t.sourceMeetingTitle?.toLowerCase().includes(query)
      )
    }

    // Status filter
    if (preferences.statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === preferences.statusFilter)
    }

    // Priority filter
    if (preferences.priorityFilter !== 'all') {
      filtered = filtered.filter(t => t.priority === preferences.priorityFilter)
    }

    // Show/hide completed
    if (!preferences.showCompleted) {
      filtered = filtered.filter(t => t.status !== 'Done' && t.status !== 'Complete')
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      switch (preferences.sortBy) {
        case 'dueDate':
          if (!a.dueDate && !b.dueDate) return 0
          if (!a.dueDate) return 1
          if (!b.dueDate) return -1
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        case 'dueDateDesc':
          if (!a.dueDate && !b.dueDate) return 0
          if (!a.dueDate) return 1
          if (!b.dueDate) return -1
          return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
        case 'priority':
          return getPriorityOrder(b.priority) - getPriorityOrder(a.priority)
        case 'alphabetical':
          return a.name.localeCompare(b.name)
        case 'recentlyAdded':
          if (!a.createdTime && !b.createdTime) return 0
          if (!a.createdTime) return 1
          if (!b.createdTime) return -1
          return new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime()
        default:
          return 0
      }
    })

    // Group
    const grouped = new Map<string, TaskItem[]>()

    if (preferences.groupBy === 'none') {
      grouped.set('All Tasks', filtered)
    } else {
      filtered.forEach(task => {
        let groupKey: string
        switch (preferences.groupBy) {
          case 'dueDate':
            if (!task.dueDate) {
              groupKey = 'No Due Date'
            } else {
              const today = new Date()
              today.setHours(0, 0, 0, 0)
              const dueDate = new Date(task.dueDate)
              if (dueDate < today) {
                groupKey = 'Overdue'
              } else if (dueDate.toDateString() === today.toDateString()) {
                groupKey = 'Due Today'
              } else {
                groupKey = 'Upcoming'
              }
            }
            break
          case 'status':
            groupKey = task.status
            break
          case 'priority':
            groupKey = task.priority
            break
          case 'meeting':
            groupKey = task.sourceMeetingTitle || 'No Meeting'
            break
          default:
            groupKey = 'All'
        }

        if (!grouped.has(groupKey)) {
          grouped.set(groupKey, [])
        }
        grouped.get(groupKey)!.push(task)
      })
    }

    return { filtered, grouped, total: allTasks.length }
  }, [data, preferences])

  // Get icon and color for group
  const getGroupConfig = (groupKey: string) => {
    if (preferences.groupBy === 'dueDate') {
      switch (groupKey) {
        case 'Overdue': return { icon: AlertTriangle, color: 'text-red-500' }
        case 'Due Today': return { icon: Clock, color: 'text-orange-500' }
        case 'Upcoming': return { icon: Calendar, color: 'text-blue-500' }
        default: return { icon: Circle, color: 'text-gray-400' }
      }
    }
    if (preferences.groupBy === 'status') {
      const status = STATUS_OPTIONS.find(s => s.value === groupKey)
      return { icon: status?.icon || Circle, color: status?.color || 'text-gray-500' }
    }
    if (preferences.groupBy === 'priority') {
      switch (groupKey) {
        case 'Critical': return { icon: AlertTriangle, color: 'text-red-600' }
        case 'High': return { icon: AlertTriangle, color: 'text-orange-500' }
        case 'Medium': return { icon: Circle, color: 'text-yellow-500' }
        default: return { icon: Circle, color: 'text-gray-400' }
      }
    }
    return { icon: undefined, color: undefined }
  }

  // Order groups
  const orderedGroups = useMemo(() => {
    const entries = Array.from(processedTasks.grouped.entries())

    if (preferences.groupBy === 'dueDate') {
      const order = ['Overdue', 'Due Today', 'Upcoming', 'No Due Date']
      return entries.sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
    }
    if (preferences.groupBy === 'priority') {
      const order = ['Critical', 'High', 'Medium', 'Low']
      return entries.sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
    }
    if (preferences.groupBy === 'status') {
      const order = ['Blocked', 'In Progress', 'Open', 'Done']
      return entries.sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
    }
    return entries
  }, [processedTasks.grouped, preferences.groupBy])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-sm text-gray-600">Loading your tasks...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            If you believe this is an error, please contact your team administrator for a new access
            link.
          </p>
        </div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  const [showPreferences, setShowPreferences] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{data.assigneeName}&apos;s Tasks</h1>
            <p className="text-sm text-gray-500">
              {processedTasks.total} total task{processedTasks.total !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => setShowPreferences(true)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Preferences"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {showPreferences && (
        <PreferencesModal
          token={token}
          onClose={() => setShowPreferences(false)}
        />
      )}

      {/* Toolbar */}
      <Toolbar
        preferences={preferences}
        onPreferencesChange={handlePreferencesChange}
        taskCount={processedTasks.total}
        filteredCount={processedTasks.filtered.length}
      />

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        {processedTasks.filtered.length === 0 ? (
          <div className="text-center py-12">
            {processedTasks.total === 0 ? (
              <>
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h2 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h2>
                <p className="text-gray-600">You have no open tasks at the moment.</p>
              </>
            ) : (
              <>
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h2 className="text-lg font-medium text-gray-900 mb-2">No matching tasks</h2>
                <p className="text-gray-600 mb-4">Try adjusting your filters or search query.</p>
                <button
                  onClick={() => handlePreferencesChange({
                    searchQuery: '',
                    statusFilter: 'all',
                    priorityFilter: 'all',
                  })}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  Clear all filters
                </button>
              </>
            )}
          </div>
        ) : (
          orderedGroups.map(([groupKey, tasks]) => {
            const config = getGroupConfig(groupKey)
            return (
              <TaskGroup
                key={groupKey}
                title={groupKey}
                icon={config.icon}
                iconColor={config.color}
                tasks={tasks}
                token={token}
                onUpdate={fetchTasks}
                searchQuery={preferences.searchQuery}
                defaultOpen={groupKey !== 'No Due Date' && groupKey !== 'Done'}
              />
            )
          })
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-auto">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <p className="text-xs text-gray-400 text-center">
            Meeting Intelligence System - This page shows only your assigned tasks
          </p>
        </div>
      </footer>
    </div>
  )
}
