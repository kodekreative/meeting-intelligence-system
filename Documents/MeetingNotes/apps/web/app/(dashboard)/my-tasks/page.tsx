'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense, useMemo, useState } from 'react'

interface ActionItem {
  id: string
  taskDescription: string
  assignee?: string
  dueDate?: string
  status: string
  priority: string
  sourceMeetingId?: string
  sourceMeetingTitle?: string
  createdAt?: string
  companyId?: string
  companyName?: string
  notes?: string
  lastFollowedUp?: string
  extractionConfidence?: number
  includeInDailyEmail?: boolean
}

interface MeetingContext {
  id: string
  title?: string
  summary?: string
  actionItems?: string
  topics?: string
  chapterSummaries?: string
  startTime?: string
  participants?: string[]
}

// Name mapping: first names and variations -> canonical full name (First Last)
const NAME_MAPPING: Record<string, string> = {
  // Bill Shansky
  'bill': 'Bill Shansky',
  'william': 'Bill Shansky',
  'shansky': 'Bill Shansky',
  'bill shansky': 'Bill Shansky',
  // Jon Maso
  'jon': 'Jon Maso',
  'maso': 'Jon Maso',
  'jon maso': 'Jon Maso',
  // Ellie Phillips
  'ellie': 'Ellie Phillips',
  'phillips': 'Ellie Phillips',
  'ellie phillips': 'Ellie Phillips',
  // Peter Schmitt
  'peter': 'Peter Schmitt',
  'schmitt': 'Peter Schmitt',
  'peter schmitt': 'Peter Schmitt',
  // Steve Collopy
  'steve': 'Steve Collopy',
  'collopy': 'Steve Collopy',
  'steve collopy': 'Steve Collopy',
  // Joe Hecker
  'joe': 'Joe Hecker',
  'hecker': 'Joe Hecker',
  'joe hecker': 'Joe Hecker',
  // Tim Lemley
  'tim': 'Tim Lemley',
  'lemley': 'Tim Lemley',
  'tim lemley': 'Tim Lemley',
  // Katy Conzelman
  'katy': 'Katy Conzelman',
  'conzelman': 'Katy Conzelman',
  'katy conzelman': 'Katy Conzelman',
  // Martinez
  'martinez': 'Martinez',
  // Yang
  'yang': 'Yang',
  // Lowry
  'lowry': 'Lowry',
  // Tyler McClosky
  'tyler': 'Tyler McClosky',
  'tyler mcclosky': 'Tyler McClosky',
  'mcclosky': 'Tyler McClosky',
}

// Get canonical name (last name) from any name variation
function getCanonicalName(name: string): string {
  if (!name) return 'Unassigned'
  const normalized = name.toLowerCase().trim()
  return NAME_MAPPING[normalized] || name // Return original if not mapped
}

// Get all name variations for a canonical name
function getNameVariations(canonicalName: string): string[] {
  const variations: string[] = []
  for (const [key, value] of Object.entries(NAME_MAPPING)) {
    if (value === canonicalName) {
      variations.push(key)
    }
  }
  return variations
}

type ViewMode = 'person' | 'status' | 'meeting' | 'dueDate'
type StatusFilter = 'all' | 'open' | 'inProgress' | 'complete' | 'overdue'
type SortOrder = 'oldest' | 'newest'

function MyTasksContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const assigneeParam = searchParams.get('assignee') || searchParams.get('name') || ''
  const queryClient = useQueryClient()

  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>('person')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortOrder, setSortOrder] = useState<SortOrder>('oldest')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null)
  const [notesText, setNotesText] = useState<string>('')
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [meetingContexts, setMeetingContexts] = useState<Record<string, MeetingContext>>({})
  const [loadingMeetings, setLoadingMeetings] = useState<Set<string>>(new Set())
  const [updatingTasks, setUpdatingTasks] = useState<Set<string>>(new Set())
  const [showEmailSettings, setShowEmailSettings] = useState(false)

  // Determine selected person (normalize to canonical name)
  const selectedPerson = assigneeParam ? getCanonicalName(assigneeParam) : ''

  // Fetch all tasks
  const { data, isLoading, error } = useQuery({
    queryKey: ['action-items', 'my-tasks'],
    queryFn: () => apiClient.actionItems.list(),
  })

  // Fetch email preferences for assignees
  const { data: emailPrefsData } = useQuery({
    queryKey: ['email-preferences'],
    queryFn: () => apiClient.emailPreferences.getMap(),
  })
  const emailPrefsMap = (emailPrefsData?.data || {}) as Record<string, boolean>

  // Mutation to update email preferences
  const updateEmailPrefMutation = useMutation({
    mutationFn: (data: { assigneeName: string; emailEnabled: boolean }) =>
      apiClient.emailPreferences.upsert(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-preferences'] })
    },
  })

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, ...updates }: { id: string; [key: string]: any }) =>
      apiClient.actionItems.update(id, updates),
    onMutate: async ({ id, ...updates }) => {
      // Mark task as updating
      setUpdatingTasks(prev => new Set(prev).add(id))

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['action-items', 'my-tasks'] })

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(['action-items', 'my-tasks'])

      // Optimistically update the cache
      queryClient.setQueryData(['action-items', 'my-tasks'], (old: any) => {
        if (!old?.data) return old
        return {
          ...old,
          data: old.data.map((item: ActionItem) =>
            item.id === id ? { ...item, ...updates } : item
          ),
        }
      })

      return { previousData, id }
    },
    onError: (_err, _variables, context) => {
      // Roll back on error
      if (context?.previousData) {
        queryClient.setQueryData(['action-items', 'my-tasks'], context.previousData)
      }
    },
    onSuccess: () => {
      // Don't invalidate on success - keep the optimistic update
      // The cache was already updated optimistically
      setEditingNotesId(null)
      setNotesText('')
    },
    onSettled: (_data, _error, _variables, context) => {
      // Remove task from updating set
      if (context?.id) {
        setUpdatingTasks(prev => {
          const newSet = new Set(prev)
          newSet.delete(context.id)
          return newSet
        })
      }
    },
  })

  // Process tasks with canonical names
  const allTasks = useMemo(() => {
    const tasks = (data?.data || []) as ActionItem[]
    return tasks.map(task => ({
      ...task,
      canonicalAssignee: getCanonicalName(task.assignee || ''),
    }))
  }, [data])

  // Get unique canonical assignees sorted by last name
  const uniqueAssignees = useMemo(() => {
    const assigneeMap = new Map<string, { canonical: string; count: number; openCount: number }>()

    allTasks.forEach(task => {
      const canonical = task.canonicalAssignee
      if (canonical && canonical !== 'Unassigned') {
        const existing = assigneeMap.get(canonical) || { canonical, count: 0, openCount: 0 }
        existing.count++
        if (task.status === 'Open' || task.status === 'In Progress') {
          existing.openCount++
        }
        assigneeMap.set(canonical, existing)
      }
    })

    // Sort by last name (second word if exists, otherwise the full name)
    return Array.from(assigneeMap.values()).sort((a, b) => {
      const getLastName = (name: string) => {
        const parts = name.split(' ')
        return parts.length > 1 ? parts[parts.length - 1] : name
      }
      return getLastName(a.canonical).localeCompare(getLastName(b.canonical))
    })
  }, [allTasks])

  // Filter tasks based on selected person and filters
  const filteredTasks = useMemo(() => {
    let tasks = allTasks

    // Filter by person if selected
    if (selectedPerson) {
      tasks = tasks.filter(t => t.canonicalAssignee === selectedPerson)
    }

    // Filter by status
    if (statusFilter !== 'all') {
      tasks = tasks.filter(t => {
        switch (statusFilter) {
          case 'open': return t.status === 'Open'
          case 'inProgress': return t.status === 'In Progress'
          case 'complete': return t.status === 'Complete'
          case 'overdue':
            return t.dueDate && t.status !== 'Complete' && new Date(t.dueDate) < new Date()
          default: return true
        }
      })
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      tasks = tasks.filter(t =>
        t.taskDescription?.toLowerCase().includes(query) ||
        t.sourceMeetingTitle?.toLowerCase().includes(query) ||
        t.notes?.toLowerCase().includes(query)
      )
    }

    // Sort by date
    tasks = [...tasks].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return sortOrder === 'oldest' ? dateA - dateB : dateB - dateA
    })

    return tasks
  }, [allTasks, selectedPerson, statusFilter, searchQuery, sortOrder])

  // Group tasks based on view mode
  const groupedTasks = useMemo(() => {
    const groups: Record<string, typeof filteredTasks> = {}

    filteredTasks.forEach(task => {
      let groupKey: string

      switch (viewMode) {
        case 'person':
          groupKey = task.canonicalAssignee || 'Unassigned'
          break
        case 'status':
          groupKey = task.status
          break
        case 'meeting':
          groupKey = task.sourceMeetingTitle || 'Unknown Meeting'
          break
        case 'dueDate':
          if (!task.dueDate) {
            groupKey = 'No Due Date'
          } else {
            const due = new Date(task.dueDate)
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
            if (diff < 0) groupKey = 'Overdue'
            else if (diff === 0) groupKey = 'Due Today'
            else if (diff === 1) groupKey = 'Due Tomorrow'
            else if (diff <= 7) groupKey = 'This Week'
            else groupKey = 'Later'
          }
          break
        default:
          groupKey = 'All'
      }

      if (!groups[groupKey]) groups[groupKey] = []
      groups[groupKey].push(task)
    })

    // Sort groups
    const sortedEntries = Object.entries(groups).sort(([a], [b]) => {
      if (viewMode === 'dueDate') {
        const order = ['Overdue', 'Due Today', 'Due Tomorrow', 'This Week', 'Later', 'No Due Date']
        return order.indexOf(a) - order.indexOf(b)
      }
      if (viewMode === 'status') {
        const order = ['Open', 'In Progress', 'Overdue', 'Complete']
        return order.indexOf(a) - order.indexOf(b)
      }
      return a.localeCompare(b)
    })

    return sortedEntries
  }, [filteredTasks, viewMode])

  // Stats
  const stats = useMemo(() => {
    const tasks = selectedPerson ? filteredTasks : allTasks
    return {
      total: tasks.length,
      open: tasks.filter(t => t.status === 'Open').length,
      inProgress: tasks.filter(t => t.status === 'In Progress').length,
      complete: tasks.filter(t => t.status === 'Complete').length,
      overdue: tasks.filter(t => t.dueDate && t.status !== 'Complete' && new Date(t.dueDate) < new Date()).length,
    }
  }, [allTasks, filteredTasks, selectedPerson])

  // Handlers
  const handlePersonSelect = (canonicalName: string) => {
    if (canonicalName) {
      router.push(`/my-tasks?assignee=${encodeURIComponent(canonicalName)}`)
    } else {
      router.push('/my-tasks')
    }
  }

  const handleStatusChange = (id: string, newStatus: string) => {
    // Prevent duplicate calls while task is being updated
    if (updatingTasks.has(id)) return
    updateTaskMutation.mutate({ id, status: newStatus })
  }

  const handlePriorityChange = (id: string, newPriority: string) => {
    // Prevent duplicate calls while task is being updated
    if (updatingTasks.has(id)) return
    updateTaskMutation.mutate({ id, priority: newPriority })
  }

  const handleAssigneeChange = (id: string, newAssignee: string) => {
    // Prevent duplicate calls while task is being updated
    if (updatingTasks.has(id)) return
    updateTaskMutation.mutate({ id, assignee: newAssignee })
  }

  const handleSaveNotes = (id: string) => {
    updateTaskMutation.mutate({ id, notes: notesText })
  }

  const handleStartEditNotes = (task: ActionItem) => {
    setEditingNotesId(task.id)
    setNotesText(task.notes || '')
  }

  const handleEmailToggle = (id: string, includeInDailyEmail: boolean) => {
    if (updatingTasks.has(id)) return
    updateTaskMutation.mutate({ id, includeInDailyEmail })
  }

  const handleAssigneeEmailToggle = (assigneeName: string, emailEnabled: boolean) => {
    updateEmailPrefMutation.mutate({ assigneeName, emailEnabled })
  }

  const loadMeetingContext = async (meetingId: string) => {
    if (meetingContexts[meetingId] || loadingMeetings.has(meetingId)) return

    setLoadingMeetings(prev => new Set(prev).add(meetingId))
    try {
      const response = await apiClient.meetings.get(meetingId)
      if (response.success && response.data) {
        const meeting = response.data as any
        setMeetingContexts(prev => ({
          ...prev,
          [meetingId]: {
            id: meetingId,
            title: meeting.title,
            summary: meeting.summary,
            actionItems: meeting.actionItems,
            topics: meeting.topics,
            startTime: meeting.startTime,
            participants: meeting.participants,
          }
        }))
      }
    } catch (err) {
      console.error('Failed to load meeting context:', err)
    } finally {
      setLoadingMeetings(prev => {
        const newSet = new Set(prev)
        newSet.delete(meetingId)
        return newSet
      })
    }
  }

  const toggleExpanded = (taskId: string, meetingId?: string) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev)
      if (newSet.has(taskId)) {
        newSet.delete(taskId)
      } else {
        newSet.add(taskId)
        if (meetingId) loadMeetingContext(meetingId)
      }
      return newSet
    })
  }

  // Utility functions - Contemporary pill-style colors
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'text-red-300 bg-red-500/20 border-red-500/30'
      case 'High': return 'text-orange-300 bg-orange-500/20 border-orange-500/30'
      case 'Medium': return 'text-amber-300 bg-amber-500/20 border-amber-500/30'
      default: return 'text-gray-300 bg-gray-500/20 border-gray-500/30'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Complete': return 'text-emerald-300 bg-emerald-500/20 border-emerald-500/30'
      case 'In Progress': return 'text-sky-300 bg-sky-500/20 border-sky-500/30'
      case 'Overdue': return 'text-red-300 bg-red-500/20 border-red-500/30'
      default: return 'text-slate-300 bg-slate-500/20 border-slate-500/30'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric'
    })
  }

  const getDueBadge = (dueDate: string, status: string) => {
    if (status === 'Complete') return null
    const due = new Date(dueDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (diff < 0) return { text: `${Math.abs(diff)}d overdue`, color: 'bg-red-500/20 text-red-400' }
    if (diff === 0) return { text: 'Today', color: 'bg-yellow-500/20 text-yellow-400' }
    if (diff === 1) return { text: 'Tomorrow', color: 'bg-yellow-500/20 text-yellow-400' }
    if (diff <= 7) return { text: `${diff}d`, color: 'bg-blue-500/20 text-blue-400' }
    return { text: formatDate(dueDate), color: 'bg-white/10 text-gray-400' }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black flex items-center justify-center">
        <div className="text-white">Loading tasks...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black p-6">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
          <div className="text-sm font-medium text-red-300">Error loading tasks</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-gray-900/95 backdrop-blur-md border-b border-white/10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-white">Task Management</h1>
              <p className="text-sm text-gray-400">
                {selectedPerson ? `Viewing ${selectedPerson}'s tasks` : 'All team tasks'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowEmailSettings(!showEmailSettings)}
                className={`flex items-center gap-2 px-3 py-2 text-xs rounded-lg border transition-colors ${
                  showEmailSettings
                    ? 'bg-purple-600 border-purple-500 text-white'
                    : 'bg-white/10 border-white/20 text-gray-300 hover:text-white hover:bg-white/20'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email Settings
              </button>
              <div className="text-right text-xs text-gray-500">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </div>
            </div>
          </div>

          {/* Controls Row */}
          <div className="flex flex-wrap gap-3 items-center">
            {/* Person Selector */}
            <select
              value={selectedPerson}
              onChange={(e) => handlePersonSelect(e.target.value)}
              className="bg-white/10 border border-white/20 text-white text-sm rounded-lg px-3 py-2 min-w-[180px]"
            >
              <option value="" className="bg-gray-800">All Team Members</option>
              {uniqueAssignees.map(({ canonical, count, openCount }) => (
                <option key={canonical} value={canonical} className="bg-gray-800">
                  {canonical} ({openCount}/{count})
                </option>
              ))}
            </select>

            {/* View Mode */}
            <div className="flex bg-white/5 rounded-lg p-1">
              {[
                { value: 'person', label: 'Person' },
                { value: 'status', label: 'Status' },
                { value: 'meeting', label: 'Meeting' },
                { value: 'dueDate', label: 'Due Date' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setViewMode(value as ViewMode)}
                  className={`px-3 py-1.5 text-xs rounded transition-colors ${
                    viewMode === value
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Status Filter */}
            <div className="flex bg-white/5 rounded-lg p-1">
              {[
                { value: 'all', label: 'All' },
                { value: 'open', label: 'Open' },
                { value: 'inProgress', label: 'In Progress' },
                { value: 'overdue', label: 'Overdue' },
                { value: 'complete', label: 'Done' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setStatusFilter(value as StatusFilter)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    statusFilter === value
                      ? 'bg-white/20 text-white'
                      : 'text-gray-500 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Search */}
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/10 border border-white/20 text-white text-sm rounded-lg px-3 py-2 w-48 placeholder-gray-500"
            />

            {/* Sort Order Toggle */}
            <button
              onClick={() => setSortOrder(sortOrder === 'oldest' ? 'newest' : 'oldest')}
              className="flex items-center gap-2 bg-white/10 border border-white/20 text-white text-sm rounded-lg px-3 py-2 hover:bg-white/20 transition-colors"
            >
              <span>{sortOrder === 'oldest' ? 'Oldest First' : 'Newest First'}</span>
              <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="px-6 pb-3 flex gap-4 text-xs">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-gray-500"></span>
            <span className="text-gray-400">{stats.total} Total</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span className="text-gray-400">{stats.open} Open</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
            <span className="text-gray-400">{stats.inProgress} In Progress</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span className="text-gray-400">{stats.overdue} Overdue</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            <span className="text-gray-400">{stats.complete} Complete</span>
          </div>
        </div>

        {/* Email Settings Help - show when button is active */}
        {showEmailSettings && (
          <div className="px-6 pb-3 border-t border-white/10 bg-purple-900/20">
            <p className="text-xs text-gray-400 py-2">
              <span className="text-purple-400 font-medium">Purple checkboxes</span> control daily email inclusion.
              Uncheck next to a team member name to exclude all their tasks, or uncheck next to individual tasks.
            </p>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="p-6">
        {filteredTasks.length === 0 ? (
          <div className="bg-white/5 rounded-lg p-12 text-center">
            <div className="text-lg text-white mb-2">No tasks found</div>
            <div className="text-sm text-gray-400">Try adjusting your filters</div>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedTasks.map(([groupName, tasks]) => {
              const assigneeEmailEnabled = viewMode === 'person' && groupName !== 'Unassigned'
                ? emailPrefsMap[groupName] !== false
                : true
              return (
              <div key={groupName} className="bg-white/5 rounded-lg overflow-hidden border border-white/10">
                {/* Group Header */}
                <div className="bg-white/5 px-4 py-3 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* Email checkbox for team member - always show when viewing by person */}
                    {viewMode === 'person' && groupName !== 'Unassigned' && (
                      <input
                        type="checkbox"
                        checked={assigneeEmailEnabled}
                        onChange={() => handleAssigneeEmailToggle(groupName, !assigneeEmailEnabled)}
                        className="w-4 h-4 rounded bg-purple-500/20 border-purple-500/50 text-purple-600 focus:ring-purple-500 cursor-pointer"
                        title={assigneeEmailEnabled ? 'Included in daily emails - click to exclude' : 'Excluded from daily emails - click to include'}
                      />
                    )}
                    <h2 className="font-semibold text-white">{groupName}</h2>
                    <span className="text-xs text-gray-500 bg-white/10 px-2 py-0.5 rounded">
                      {tasks.length}
                    </span>
                  </div>
                  {viewMode === 'person' && (
                    <button
                      onClick={() => handlePersonSelect(groupName)}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      View only →
                    </button>
                  )}
                </div>

                {/* Tasks */}
                <div className="divide-y divide-white/5">
                  {tasks.map((task) => {
                    const isExpanded = expandedTasks.has(task.id)
                    const dueBadge = task.dueDate ? getDueBadge(task.dueDate, task.status) : null
                    const meetingContext = task.sourceMeetingId ? meetingContexts[task.sourceMeetingId] : null
                    const isLoadingContext = task.sourceMeetingId ? loadingMeetings.has(task.sourceMeetingId) : false
                    const isUpdating = updatingTasks.has(task.id)

                    return (
                      <div
                        key={task.id}
                        className={`p-4 hover:bg-white/5 transition-colors ${
                          task.status === 'Complete' ? 'opacity-50' : ''
                        } ${isUpdating ? 'opacity-70' : ''}`}
                      >
                        {/* Task Row */}
                        <div className="flex items-start gap-3">
                          <div className="flex items-center gap-1.5 mt-1">
                            <input
                              type="checkbox"
                              checked={task.status === 'Complete'}
                              onChange={(e) => handleStatusChange(task.id, e.target.checked ? 'Complete' : 'Open')}
                              disabled={isUpdating}
                              className="w-4 h-4 rounded bg-white/10 border-white/30 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Mark complete"
                            />
                            {/* Email checkbox for task - always visible */}
                            <input
                              type="checkbox"
                              checked={task.includeInDailyEmail ?? true}
                              onChange={() => handleEmailToggle(task.id, !(task.includeInDailyEmail ?? true))}
                              disabled={isUpdating}
                              className="w-4 h-4 rounded bg-purple-500/20 border-purple-500/50 text-purple-600 focus:ring-purple-500 cursor-pointer disabled:opacity-50"
                              title={(task.includeInDailyEmail ?? true) ? 'Included in daily emails - click to exclude' : 'Excluded from daily emails - click to include'}
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div
                              className={`text-sm cursor-pointer ${
                                task.status === 'Complete' ? 'line-through text-gray-500' : 'text-white'
                              }`}
                              onClick={() => toggleExpanded(task.id, task.sourceMeetingId)}
                            >
                              {task.taskDescription}
                            </div>

                            {/* Meeting Name and Date - Always visible */}
                            <div className="flex items-center gap-2 mt-1 text-xs">
                              <span className="text-blue-400 font-medium">
                                {task.sourceMeetingTitle || 'Unknown Meeting'}
                              </span>
                              <span className="text-gray-600">•</span>
                              <span className="text-gray-500">
                                {task.createdAt ? formatDate(task.createdAt) : 'No date'}
                              </span>
                            </div>

                            {/* Additional info row */}
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              {viewMode !== 'person' && (
                                <span className="text-xs text-gray-500">
                                  {task.canonicalAssignee}
                                </span>
                              )}
                              {dueBadge && (
                                <span className={`text-xs px-1.5 py-0.5 rounded ${dueBadge.color}`}>
                                  {dueBadge.text}
                                </span>
                              )}
                              {task.notes && !isExpanded && (
                                <span className="text-xs text-purple-400">Has notes</span>
                              )}
                              <button
                                onClick={() => toggleExpanded(task.id, task.sourceMeetingId)}
                                className="text-xs text-gray-500 hover:text-gray-300"
                              >
                                {isExpanded ? 'Less' : 'Details'}
                              </button>
                            </div>

                            {/* Expanded Content */}
                            {isExpanded && (
                              <div className="mt-4 space-y-3 border-l-2 border-white/10 pl-4">
                                {/* Meeting Context */}
                                <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
                                  <div className="text-xs font-medium text-blue-400 mb-2">Meeting Context</div>
                                  {isLoadingContext ? (
                                    <div className="text-xs text-gray-400 animate-pulse">Loading...</div>
                                  ) : meetingContext?.summary ? (
                                    <div className="text-sm text-gray-300 space-y-1">
                                      {meetingContext.summary
                                        .split(/(?<=[.!?])\s+/)
                                        .filter(s => s.trim())
                                        .slice(0, 5)
                                        .map((sentence, idx) => (
                                          <div key={idx} className="flex">
                                            <span className="text-blue-400 mr-2">•</span>
                                            <span>{sentence.trim()}</span>
                                          </div>
                                        ))}
                                    </div>
                                  ) : (
                                    <div className="text-xs text-gray-500">No context available</div>
                                  )}
                                </div>

                                {/* Notes */}
                                <div className="bg-white/5 rounded-lg p-3">
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-medium text-gray-400">Notes</span>
                                    {editingNotesId !== task.id && (
                                      <button
                                        onClick={() => handleStartEditNotes(task)}
                                        className="text-xs text-blue-400"
                                      >
                                        {task.notes ? 'Edit' : 'Add'}
                                      </button>
                                    )}
                                  </div>
                                  {editingNotesId === task.id ? (
                                    <div>
                                      <textarea
                                        value={notesText}
                                        onChange={(e) => setNotesText(e.target.value)}
                                        className="w-full bg-white/10 border border-white/20 rounded p-2 text-sm text-white"
                                        rows={3}
                                        autoFocus
                                      />
                                      <div className="flex gap-2 mt-2 justify-end">
                                        <button
                                          onClick={() => setEditingNotesId(null)}
                                          className="text-xs text-gray-400"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          onClick={() => handleSaveNotes(task.id)}
                                          className="text-xs bg-blue-600 text-white px-3 py-1 rounded"
                                        >
                                          Save
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-sm text-gray-300">
                                      {task.notes || <span className="text-gray-500 italic">No notes</span>}
                                    </div>
                                  )}
                                </div>

                                {/* Quick Actions */}
                                <div className="flex gap-2">
                                  {['Open', 'In Progress', 'Complete'].map(status => (
                                    <button
                                      key={status}
                                      onClick={() => handleStatusChange(task.id, status)}
                                      disabled={isUpdating}
                                      className={`text-xs px-3 py-1 rounded border ${
                                        task.status === status
                                          ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                                          : 'border-white/20 text-gray-400 hover:text-white'
                                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                      {status}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Right Controls */}
                          <div className="flex items-center gap-2">
                            <select
                              value={task.priority}
                              onChange={(e) => handlePriorityChange(task.id, e.target.value)}
                              disabled={isUpdating}
                              className={`text-xs font-medium px-2.5 py-1 rounded-full border appearance-none cursor-pointer pr-6 ${getPriorityColor(task.priority)} disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-white/20`}
                              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', backgroundSize: '12px' }}
                            >
                              <option value="Low" className="bg-gray-800 text-white">Low</option>
                              <option value="Medium" className="bg-gray-800 text-white">Medium</option>
                              <option value="High" className="bg-gray-800 text-white">High</option>
                              <option value="Critical" className="bg-gray-800 text-white">Critical</option>
                            </select>
                            <select
                              value={task.status}
                              onChange={(e) => handleStatusChange(task.id, e.target.value)}
                              disabled={isUpdating}
                              className={`text-xs font-medium px-2.5 py-1 rounded-full border appearance-none cursor-pointer pr-6 ${getStatusColor(task.status)} disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-white/20`}
                              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', backgroundSize: '12px' }}
                            >
                              <option value="Open" className="bg-gray-800 text-white">Open</option>
                              <option value="In Progress" className="bg-gray-800 text-white">In Progress</option>
                              <option value="Complete" className="bg-gray-800 text-white">Complete</option>
                            </select>
                            {isUpdating && (
                              <span className="text-xs text-gray-400 animate-pulse">saving</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )})}
          </div>
        )}
      </div>
    </div>
  )
}

export default function MyTasksPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <MyTasksContent />
    </Suspense>
  )
}
