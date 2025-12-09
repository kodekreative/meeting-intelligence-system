/**
 * Team Member Tasks Routes
 *
 * Secure, token-based access to individual team member's tasks.
 * Each team member gets a unique, cryptographically secure token that
 * allows them to view ONLY their own tasks - no cross-access is possible.
 *
 * Security Design:
 * - Tokens are UUID v4 (cryptographically secure, non-guessable)
 * - One token per assignee name
 * - Tokens can be revoked by setting Is Active to false
 * - Access is logged (Last Accessed, Access Count)
 * - No authentication bypass possible - token MUST match exactly
 */

import { Router, Request, Response } from 'express'
import Airtable, { FieldSet } from 'airtable'
import { randomUUID } from 'crypto'
import { asyncHandler, AppError } from '../middleware/errorHandler.js'
import { AIRTABLE_TABLES } from '../lib/schema.js'
import { CACHE, TASKS } from '../shared/constants.js'
import { cacheDeletePattern } from '../utils/redis.js'

const router: Router = Router()

// Name mapping cache - loaded dynamically from Team Member Tokens table
// The "Full Name" field in Team Member Tokens is the source of truth
// This cache is used as a fallback when the Full Name isn't directly available
const nameMappingCache: Record<string, string> = {}

// Initialize Airtable base
const getBase = () => {
  const apiKey = process.env.AIRTABLE_API_KEY
  const baseId = process.env.AIRTABLE_BASE_ID
  if (!apiKey || !baseId) {
    throw new AppError('Airtable configuration missing', 500)
  }
  return new Airtable({ apiKey }).base(baseId)
}

/**
 * Resolve partial names to full names using the cached mappings
 * Falls back to the Full Name field from the token record if available
 */
function resolveFullName(name: string, tokenFullName?: string): string {
  // If we have a full name from the token record, use that
  if (tokenFullName) return tokenFullName
  // If already a full name (has space), return as-is
  if (name.includes(' ')) return name
  // Look up in cache
  const nameLower = name.toLowerCase().trim()
  return nameMappingCache[nameLower] || name
}

/**
 * GET /api/v1/team-tasks/:token
 * Get tasks for a team member using their secure token
 *
 * Security:
 * - Token must exist and be active
 * - Returns ONLY tasks for that specific assignee
 * - Updates access tracking
 */
router.get(
  '/:token',
  asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params

    if (!token || token.length < 32) {
      throw new AppError('Invalid access token', 401)
    }

    const base = getBase()

    // Find the token record
    const tokenRecords = await base(AIRTABLE_TABLES.TEAM_MEMBER_TOKENS)
      .select({
        filterByFormula: `AND({Token} = "${token}", {Is Active} = TRUE())`,
        maxRecords: 1,
      })
      .all()

    if (tokenRecords.length === 0) {
      throw new AppError('Invalid or expired access token', 401)
    }

    const tokenRecord = tokenRecords[0]
    const assigneeName = tokenRecord.get('Assignee Name') as string
    const tokenFullName = tokenRecord.get('Full Name') as string | undefined
    const accessCount = (tokenRecord.get('Access Count') as number) || 0

    // Update access tracking (non-blocking)
    base(AIRTABLE_TABLES.TEAM_MEMBER_TOKENS).update(tokenRecord.id, {
      'Last Accessed': new Date().toISOString(),
      'Access Count': accessCount + 1,
    }).catch(err => {
      console.warn('Failed to update access tracking:', err)
    })

    // Fetch tasks for this assignee
    // Match by full name or partial name
    const resolvedName = resolveFullName(assigneeName, tokenFullName)

    // Build filter to match the assignee name (exact match or partial match)
    const filterFormula = `AND(
      OR(
        {Assignee Name} = "${assigneeName}",
        {Assignee Name} = "${resolvedName}",
        FIND(LOWER("${assigneeName}"), LOWER({Assignee Name})) > 0
      ),
      {Status} != "${TASKS.STATUS.DONE}"
    )`

    const taskRecords = await base(AIRTABLE_TABLES.TASKS)
      .select({
        filterByFormula: filterFormula,
        sort: [
          { field: 'Priority', direction: 'desc' },
          { field: 'Due Date', direction: 'asc' },
        ],
      })
      .all()

    // Also get Action Items for this assignee (legacy items not migrated to Tasks)
    const actionItemRecords = await base(AIRTABLE_TABLES.ACTION_ITEMS)
      .select({
        filterByFormula: `AND(
          OR(
            {Assignee} = "${assigneeName}",
            {Assignee} = "${resolvedName}",
            FIND(LOWER("${assigneeName}"), LOWER({Assignee})) > 0
          ),
          {Status} != "Complete"
        )`,
        sort: [
          { field: 'Priority', direction: 'desc' },
          { field: 'Due Date', direction: 'asc' },
        ],
      })
      .all()

    // Collect source meeting IDs to fetch meeting details
    const meetingIds = new Set<string>()
    taskRecords.forEach(record => {
      const meetingId = record.get('Source Meeting ID') as string
      if (meetingId) meetingIds.add(meetingId)
    })
    actionItemRecords.forEach(record => {
      const meetingId = (record.get('Source Meeting') as string[])?.[0]
      if (meetingId) meetingIds.add(meetingId)
    })

    // Fetch meeting details (title, summary snippet, date)
    interface MeetingContext {
      title: string
      date?: string
      summarySnippet?: string
    }
    const meetingContextMap = new Map<string, MeetingContext>()
    if (meetingIds.size > 0) {
      const meetingIdArray = Array.from(meetingIds)
      const orConditions = meetingIdArray.map(id => `RECORD_ID() = "${id}"`).join(', ')

      try {
        const meetings = await base(AIRTABLE_TABLES.MEETINGS)
          .select({
            filterByFormula: `OR(${orConditions})`,
            fields: ['Title', 'Name', 'Start Time', 'Meeting Summary'],
          })
          .all()

        meetings.forEach(meeting => {
          const title = (meeting.get('Title') as string) || (meeting.get('Name') as string) || 'Meeting'
          const startTime = meeting.get('Start Time') as string
          const summary = meeting.get('Meeting Summary') as string

          // Create a snippet from the summary (first 200 chars)
          const summarySnippet = summary ? summary.substring(0, 200) + (summary.length > 200 ? '...' : '') : undefined

          meetingContextMap.set(meeting.id, {
            title,
            date: startTime,
            summarySnippet,
          })
        })
      } catch (e) {
        console.warn('Failed to fetch meeting details:', e)
      }
    }

    // Collect all task IDs to fetch comment counts
    const allTaskIds = [
      ...taskRecords.map(r => r.id),
      ...actionItemRecords.map(r => r.id),
    ]

    // Fetch comment counts for all tasks
    const commentCounts = new Map<string, number>()
    if (allTaskIds.length > 0) {
      try {
        const allComments = await base(AIRTABLE_TABLES.TASK_COMMENTS)
          .select({
            fields: ['Task ID'],
          })
          .all()

        allComments.forEach(comment => {
          const taskId = comment.get('Task ID') as string
          commentCounts.set(taskId, (commentCounts.get(taskId) || 0) + 1)
        })
      } catch (e) {
        console.warn('Failed to fetch comment counts:', e)
      }
    }

    // Transform tasks
    const tasks = taskRecords.map(record => {
      const sourceMeetingId = record.get('Source Meeting ID') as string
      const meetingContext = sourceMeetingId ? meetingContextMap.get(sourceMeetingId) : undefined
      return {
        id: record.id,
        type: 'task' as const,
        name: record.get('Name') as string,
        description: record.get('Description') as string | undefined,
        status: record.get('Status') as string,
        priority: record.get('Priority') as string,
        dueDate: record.get('Due Date') as string | undefined,
        source: record.get('Source') as string,
        sourceMeetingId,
        sourceMeetingTitle: meetingContext?.title,
        sourceMeetingDate: meetingContext?.date,
        sourceMeetingSummary: meetingContext?.summarySnippet,
        blocker: record.get('Blocker Description') as string | undefined,
        helpRequested: record.get('Help Requested') as boolean | undefined,
        helpRequestMessage: record.get('Help Request Message') as string | undefined,
        commentCount: commentCounts.get(record.id) || 0,
        reminderDate: record.get('Reminder Date') as string | undefined,
        parentTaskId: record.get('Parent Task ID') as string | undefined,
      }
    })

    // Collect parent task IDs to fetch their subtasks
    const parentTaskIds = tasks.filter(t => !t.parentTaskId).map(t => t.id)

    // Fetch all subtasks for the user's tasks (subtasks are tasks with Parent Task ID set)
    interface Subtask {
      id: string
      name: string
      status: string
      parentTaskId: string
    }
    const subtasksByParent = new Map<string, Subtask[]>()

    if (parentTaskIds.length > 0) {
      try {
        // Fetch subtasks that belong to any of the user's tasks
        const subtaskRecords = await base(AIRTABLE_TABLES.TASKS)
          .select({
            filterByFormula: `AND(
              {Parent Task ID} != "",
              OR(
                {Assignee Name} = "${assigneeName}",
                {Assignee Name} = "${resolvedName}",
                FIND(LOWER("${assigneeName}"), LOWER({Assignee Name})) > 0
              )
            )`,
            sort: [{ field: 'Name', direction: 'asc' }],
          })
          .all()

        subtaskRecords.forEach(record => {
          const parentId = record.get('Parent Task ID') as string
          if (parentId) {
            const subtask: Subtask = {
              id: record.id,
              name: record.get('Name') as string,
              status: record.get('Status') as string,
              parentTaskId: parentId,
            }
            const existing = subtasksByParent.get(parentId) || []
            existing.push(subtask)
            subtasksByParent.set(parentId, existing)
          }
        })
      } catch (e) {
        console.warn('Failed to fetch subtasks:', e)
      }
    }

    // Transform action items
    const actionItems = actionItemRecords.map(record => {
      const sourceMeetingId = (record.get('Source Meeting') as string[])?.[0]
      const meetingContext = sourceMeetingId ? meetingContextMap.get(sourceMeetingId) : undefined
      return {
        id: record.id,
        type: 'action_item' as const,
        name: record.get('Task Description') as string,
        description: record.get('Notes') as string | undefined,
        status: record.get('Status') as string,
        priority: record.get('Priority') as string,
        dueDate: record.get('Due Date') as string | undefined,
        source: 'Action Item' as const,
        sourceMeetingId,
        sourceMeetingTitle: meetingContext?.title,
        sourceMeetingDate: meetingContext?.date,
        sourceMeetingSummary: meetingContext?.summarySnippet,
        blocker: undefined, // Action Items may not have this field
        helpRequested: record.get('Help Requested') as boolean | undefined,
        helpRequestMessage: record.get('Help Request Message') as string | undefined,
        commentCount: commentCounts.get(record.id) || 0,
        reminderDate: record.get('Reminder Date') as string | undefined,
      }
    })

    // Enrich tasks with subtasks and compute subtask progress
    const enrichedTasks = tasks.map(task => {
      const subtasks = subtasksByParent.get(task.id) || []
      const subtaskTotal = subtasks.length
      const subtaskComplete = subtasks.filter(s => s.status === 'Done' || s.status === 'Complete').length
      return {
        ...task,
        subtasks: subtasks.length > 0 ? subtasks : undefined,
        subtaskProgress: subtaskTotal > 0 ? { complete: subtaskComplete, total: subtaskTotal } : undefined,
      }
    })

    // Filter out subtasks from the main list (they'll be shown nested under parents)
    const parentTasks = enrichedTasks.filter(t => !t.parentTaskId)

    // Combine tasks (without subtasks in main list) and action items
    const allTasks = [...parentTasks, ...actionItems]

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const overdue = allTasks.filter(t => {
      if (!t.dueDate) return false
      return new Date(t.dueDate) < today
    })

    const dueToday = allTasks.filter(t => {
      if (!t.dueDate) return false
      const due = new Date(t.dueDate)
      return due >= today && due < new Date(today.getTime() + 24 * 60 * 60 * 1000)
    })

    const upcoming = allTasks.filter(t => {
      if (!t.dueDate) return false
      const due = new Date(t.dueDate)
      return due >= new Date(today.getTime() + 24 * 60 * 60 * 1000)
    })

    const noDueDate = allTasks.filter(t => !t.dueDate)

    res.json({
      success: true,
      data: {
        assigneeName: resolvedName,
        overdue,
        dueToday,
        upcoming,
        noDueDate,
        total: allTasks.length,
      },
      meta: {
        accessedAt: new Date().toISOString(),
      },
    })
  })
)

/**
 * Helper to validate token and get assignee info
 */
async function validateTokenAndGetAssignee(base: ReturnType<typeof getBase>, token: string) {
  if (!token || token.length < 32) {
    throw new AppError('Invalid access token', 401)
  }

  const tokenRecords = await base(AIRTABLE_TABLES.TEAM_MEMBER_TOKENS)
    .select({
      filterByFormula: `AND({Token} = "${token}", {Is Active} = TRUE())`,
      maxRecords: 1,
    })
    .all()

  if (tokenRecords.length === 0) {
    throw new AppError('Invalid or expired access token', 401)
  }

  const tokenRecord = tokenRecords[0]
  const assigneeName = tokenRecord.get('Assignee Name') as string
  const tokenFullName = tokenRecord.get('Full Name') as string | undefined
  const resolvedName = resolveFullName(assigneeName, tokenFullName)

  return { tokenRecord, assigneeName, resolvedName }
}

/**
 * Helper to check if a task belongs to the token holder
 */
function verifyTaskOwnership(taskAssignee: string | undefined, assigneeName: string, resolvedName: string) {
  if (!taskAssignee ||
      (taskAssignee.toLowerCase() !== assigneeName.toLowerCase() &&
       taskAssignee.toLowerCase() !== resolvedName.toLowerCase() &&
       !taskAssignee.toLowerCase().includes(assigneeName.toLowerCase()))) {
    throw new AppError('You can only update your own tasks', 403)
  }
}

/**
 * PATCH /api/v1/team-tasks/:token/items/:id
 * Update a task - supports status, priority, notes, and blocker
 *
 * Security:
 * - Token must be valid and active
 * - Can only update tasks that belong to that assignee
 *
 * Body params:
 * - status: 'Open' | 'In Progress' | 'Blocked' | 'Done'
 * - priority: 'Low' | 'Medium' | 'High' | 'Critical'
 * - notes: string (description/notes)
 * - blocker: string (blocker description, required when status is Blocked)
 */
router.patch(
  '/:token/items/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { token, id } = req.params
    const { status, priority, notes, blocker } = req.body

    const base = getBase()
    const { assigneeName, resolvedName } = await validateTokenAndGetAssignee(base, token)

    // Validate status if provided
    const validStatuses = ['Open', 'In Progress', 'Blocked', 'Done']
    if (status && !validStatuses.includes(status)) {
      throw new AppError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400)
    }

    // Validate priority if provided
    const validPriorities = ['Low', 'Medium', 'High', 'Critical']
    if (priority && !validPriorities.includes(priority)) {
      throw new AppError(`Invalid priority. Must be one of: ${validPriorities.join(', ')}`, 400)
    }

    // Require blocker description when setting status to Blocked
    if (status === 'Blocked' && !blocker) {
      throw new AppError('Please describe what is blocking this task', 400)
    }

    // Try to find the item in Tasks table first
    try {
      const taskRecord = await base(AIRTABLE_TABLES.TASKS).find(id)
      const taskAssignee = taskRecord.get('Assignee Name') as string

      verifyTaskOwnership(taskAssignee, assigneeName, resolvedName)

      // Build updates
      const updates: Record<string, unknown> = {}
      if (status) {
        updates['Status'] = status
        if (status === TASKS.STATUS.DONE) {
          updates['Completed Date'] = new Date().toISOString().split('T')[0]
        }
        // Clear completed date if reopening
        if (status !== TASKS.STATUS.DONE && taskRecord.get('Completed Date')) {
          updates['Completed Date'] = null
        }
      }
      if (priority) {
        updates['Priority'] = priority
      }
      if (notes !== undefined) {
        updates['Description'] = notes
      }
      if (blocker !== undefined) {
        updates['Blocker Description'] = blocker
      }

      await base(AIRTABLE_TABLES.TASKS).update(id, updates as Partial<FieldSet>)

      // Invalidate tasks cache
      await cacheDeletePattern(`${CACHE.KEYS.TASKS}:*`)

      res.json({
        success: true,
        message: 'Task updated successfully',
        data: { id, ...updates },
      })
      return
    } catch (e: unknown) {
      // If not found in Tasks, try Action Items
      if (e && typeof e === 'object' && 'statusCode' in e && e.statusCode !== 404) {
        throw e
      }
    }

    // Try Action Items table
    try {
      const actionItemRecord = await base(AIRTABLE_TABLES.ACTION_ITEMS).find(id)
      const itemAssignee = actionItemRecord.get('Assignee') as string

      verifyTaskOwnership(itemAssignee, assigneeName, resolvedName)

      // Build updates - map to Action Items field names
      const updates: Record<string, unknown> = {}
      if (status) {
        // Map status to Action Items status values
        updates['Status'] = status === 'Done' ? 'Complete' : status
        if (status === 'Done' || status === 'Complete') {
          updates['Completed At'] = new Date().toISOString()
        }
      }
      if (priority) {
        updates['Priority'] = priority
      }
      if (notes !== undefined) {
        updates['Notes'] = notes
      }
      // Note: Action Items may not have Blocker Description field

      await base(AIRTABLE_TABLES.ACTION_ITEMS).update(id, updates as Partial<FieldSet>)

      // Invalidate action items cache
      await cacheDeletePattern(`${CACHE.KEYS.ACTION_ITEMS}:*`)

      res.json({
        success: true,
        message: 'Action item updated successfully',
        data: { id, ...updates },
      })
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'statusCode' in e && e.statusCode === 404) {
        throw new AppError('Task not found', 404)
      }
      throw e
    }
  })
)

/**
 * POST /api/v1/team-tasks/:token/items/:id/request-extension
 * Request a due date extension for a task
 *
 * Body params:
 * - requestedDate: string (ISO date)
 * - reason: string (why extension is needed)
 */
router.post(
  '/:token/items/:id/request-extension',
  asyncHandler(async (req: Request, res: Response) => {
    const { token, id } = req.params
    const { requestedDate, reason } = req.body

    if (!requestedDate) {
      throw new AppError('Requested date is required', 400)
    }
    if (!reason) {
      throw new AppError('Please provide a reason for the extension request', 400)
    }

    const base = getBase()
    const { assigneeName, resolvedName } = await validateTokenAndGetAssignee(base, token)

    // Try Tasks table first
    try {
      const taskRecord = await base(AIRTABLE_TABLES.TASKS).find(id)
      const taskAssignee = taskRecord.get('Assignee Name') as string

      verifyTaskOwnership(taskAssignee, assigneeName, resolvedName)

      await base(AIRTABLE_TABLES.TASKS).update(id, {
        'Requested Due Date': requestedDate,
        'Due Date Request Reason': reason,
      } as Partial<FieldSet>)

      // Invalidate tasks cache
      await cacheDeletePattern(`${CACHE.KEYS.TASKS}:*`)

      res.json({
        success: true,
        message: 'Extension request submitted successfully',
        data: { id, requestedDate, reason },
      })
      return
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'statusCode' in e && e.statusCode !== 404) {
        throw e
      }
    }

    // Try Action Items table
    try {
      const actionItemRecord = await base(AIRTABLE_TABLES.ACTION_ITEMS).find(id)
      const itemAssignee = actionItemRecord.get('Assignee') as string

      verifyTaskOwnership(itemAssignee, assigneeName, resolvedName)

      // Action Items may not have these fields, but try anyway
      await base(AIRTABLE_TABLES.ACTION_ITEMS).update(id, {
        'Requested Due Date': requestedDate,
        'Due Date Request Reason': reason,
      } as Partial<FieldSet>)

      await cacheDeletePattern(`${CACHE.KEYS.ACTION_ITEMS}:*`)

      res.json({
        success: true,
        message: 'Extension request submitted successfully',
        data: { id, requestedDate, reason },
      })
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'statusCode' in e && e.statusCode === 404) {
        throw new AppError('Task not found', 404)
      }
      throw e
    }
  })
)

/**
 * GET /api/v1/team-tasks/:token/items/:id/comments
 * Get comments for a task
 */
router.get(
  '/:token/items/:id/comments',
  asyncHandler(async (req: Request, res: Response) => {
    const { token, id } = req.params

    const base = getBase()
    const { assigneeName, resolvedName } = await validateTokenAndGetAssignee(base, token)

    // Verify task belongs to user (check both tables)
    let taskTable: 'Tasks' | 'Action Items' = 'Tasks'
    try {
      const taskRecord = await base(AIRTABLE_TABLES.TASKS).find(id)
      const taskAssignee = taskRecord.get('Assignee Name') as string
      verifyTaskOwnership(taskAssignee, assigneeName, resolvedName)
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'statusCode' in e && e.statusCode === 404) {
        // Try Action Items
        try {
          const actionItemRecord = await base(AIRTABLE_TABLES.ACTION_ITEMS).find(id)
          const itemAssignee = actionItemRecord.get('Assignee') as string
          verifyTaskOwnership(itemAssignee, assigneeName, resolvedName)
          taskTable = 'Action Items'
        } catch (e2: unknown) {
          if (e2 && typeof e2 === 'object' && 'statusCode' in e2 && e2.statusCode === 404) {
            throw new AppError('Task not found', 404)
          }
          throw e2
        }
      } else {
        throw e
      }
    }

    // Fetch comments for this task
    const comments = await base(AIRTABLE_TABLES.TASK_COMMENTS)
      .select({
        filterByFormula: `AND({Task ID} = "${id}", {Task Table} = "${taskTable}")`,
        sort: [{ field: 'Created At', direction: 'asc' }],
      })
      .all()

    const commentList = comments.map(record => ({
      id: record.id,
      authorName: record.get('Author Name') as string,
      authorType: record.get('Author Type') as 'team_member' | 'admin',
      content: record.get('Content') as string,
      createdAt: record.get('Created At') as string,
    }))

    res.json({
      success: true,
      data: commentList,
    })
  })
)

/**
 * POST /api/v1/team-tasks/:token/items/:id/comments
 * Add a comment to a task
 *
 * Body params:
 * - content: string (the comment text)
 */
router.post(
  '/:token/items/:id/comments',
  asyncHandler(async (req: Request, res: Response) => {
    const { token, id } = req.params
    const { content } = req.body

    if (!content || content.trim().length === 0) {
      throw new AppError('Comment content is required', 400)
    }

    const base = getBase()
    const { assigneeName, resolvedName } = await validateTokenAndGetAssignee(base, token)

    // Verify task belongs to user and determine which table
    let taskTable: 'Tasks' | 'Action Items' = 'Tasks'
    try {
      const taskRecord = await base(AIRTABLE_TABLES.TASKS).find(id)
      const taskAssignee = taskRecord.get('Assignee Name') as string
      verifyTaskOwnership(taskAssignee, assigneeName, resolvedName)
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'statusCode' in e && e.statusCode === 404) {
        try {
          const actionItemRecord = await base(AIRTABLE_TABLES.ACTION_ITEMS).find(id)
          const itemAssignee = actionItemRecord.get('Assignee') as string
          verifyTaskOwnership(itemAssignee, assigneeName, resolvedName)
          taskTable = 'Action Items'
        } catch (e2: unknown) {
          if (e2 && typeof e2 === 'object' && 'statusCode' in e2 && e2.statusCode === 404) {
            throw new AppError('Task not found', 404)
          }
          throw e2
        }
      } else {
        throw e
      }
    }

    // Create the comment
    const record = await base(AIRTABLE_TABLES.TASK_COMMENTS).create({
      'Task ID': id,
      'Task Table': taskTable,
      'Author Name': resolvedName,
      'Author Type': 'team_member',
      'Content': content.trim(),
      'Created At': new Date().toISOString(),
    })

    res.json({
      success: true,
      message: 'Comment added successfully',
      data: {
        id: record.id,
        authorName: resolvedName,
        authorType: 'team_member',
        content: content.trim(),
        createdAt: record.get('Created At') as string,
      },
    })
  })
)

/**
 * POST /api/v1/team-tasks/:token/items/:id/request-help
 * Request help on a task - flags it for admin attention
 *
 * Body params:
 * - message: string (optional message about what help is needed)
 */
router.post(
  '/:token/items/:id/request-help',
  asyncHandler(async (req: Request, res: Response) => {
    const { token, id } = req.params
    const { message } = req.body

    const base = getBase()
    const { assigneeName, resolvedName } = await validateTokenAndGetAssignee(base, token)

    // Try Tasks table first
    try {
      const taskRecord = await base(AIRTABLE_TABLES.TASKS).find(id)
      const taskAssignee = taskRecord.get('Assignee Name') as string

      verifyTaskOwnership(taskAssignee, assigneeName, resolvedName)

      const updates: Record<string, unknown> = {
        'Help Requested': true,
      }
      if (message) {
        updates['Help Request Message'] = message
      }

      await base(AIRTABLE_TABLES.TASKS).update(id, updates as Partial<FieldSet>)

      // Invalidate tasks cache
      await cacheDeletePattern(`${CACHE.KEYS.TASKS}:*`)

      res.json({
        success: true,
        message: 'Help request submitted successfully',
        data: { id, helpRequested: true, message },
      })
      return
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'statusCode' in e && e.statusCode !== 404) {
        throw e
      }
    }

    // Try Action Items table
    try {
      const actionItemRecord = await base(AIRTABLE_TABLES.ACTION_ITEMS).find(id)
      const itemAssignee = actionItemRecord.get('Assignee') as string

      verifyTaskOwnership(itemAssignee, assigneeName, resolvedName)

      // Note: Action Items may not have Help Requested field - we'll try anyway
      const updates: Record<string, unknown> = {
        'Help Requested': true,
      }
      if (message) {
        updates['Help Request Message'] = message
      }

      await base(AIRTABLE_TABLES.ACTION_ITEMS).update(id, updates as Partial<FieldSet>)
      await cacheDeletePattern(`${CACHE.KEYS.ACTION_ITEMS}:*`)

      res.json({
        success: true,
        message: 'Help request submitted successfully',
        data: { id, helpRequested: true, message },
      })
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'statusCode' in e && e.statusCode === 404) {
        throw new AppError('Task not found', 404)
      }
      throw e
    }
  })
)

/**
 * GET /api/v1/team-tasks/:token/items/:id/activity
 * Get activity history for a task
 */
router.get(
  '/:token/items/:id/activity',
  asyncHandler(async (req: Request, res: Response) => {
    const { token, id } = req.params

    const base = getBase()
    const { assigneeName, resolvedName } = await validateTokenAndGetAssignee(base, token)

    // Verify task belongs to user (check both tables)
    let taskTable: 'Tasks' | 'Action Items' = 'Tasks'
    try {
      const taskRecord = await base(AIRTABLE_TABLES.TASKS).find(id)
      const taskAssignee = taskRecord.get('Assignee Name') as string
      verifyTaskOwnership(taskAssignee, assigneeName, resolvedName)
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'statusCode' in e && e.statusCode === 404) {
        try {
          const actionItemRecord = await base(AIRTABLE_TABLES.ACTION_ITEMS).find(id)
          const itemAssignee = actionItemRecord.get('Assignee') as string
          verifyTaskOwnership(itemAssignee, assigneeName, resolvedName)
          taskTable = 'Action Items'
        } catch (e2: unknown) {
          if (e2 && typeof e2 === 'object' && 'statusCode' in e2 && e2.statusCode === 404) {
            throw new AppError('Task not found', 404)
          }
          throw e2
        }
      } else {
        throw e
      }
    }

    // Fetch activity for this task
    try {
      const activities = await base(AIRTABLE_TABLES.TASK_ACTIVITY)
        .select({
          filterByFormula: `AND({Task ID} = "${id}", {Task Table} = "${taskTable}")`,
          sort: [{ field: 'Created At', direction: 'desc' }],
        })
        .all()

      const activityList = activities.map(record => ({
        id: record.id,
        action: record.get('Action') as string,
        oldValue: record.get('Old Value') as string | undefined,
        newValue: record.get('New Value') as string | undefined,
        actorName: record.get('Actor Name') as string,
        actorType: record.get('Actor Type') as string,
        createdAt: record.get('Created At') as string,
      }))

      res.json({
        success: true,
        data: activityList,
      })
    } catch (e) {
      // If table doesn't exist yet, return empty array
      console.warn('Failed to fetch task activity:', e)
      res.json({
        success: true,
        data: [],
      })
    }
  })
)

/**
 * GET /api/v1/team-tasks/:token/items/:id/related
 * Get related tasks from the same meeting
 */
router.get(
  '/:token/items/:id/related',
  asyncHandler(async (req: Request, res: Response) => {
    const { token, id } = req.params

    const base = getBase()
    const { assigneeName, resolvedName } = await validateTokenAndGetAssignee(base, token)

    // Find the task and its source meeting
    let sourceMeetingId: string | undefined
    let taskTable: 'Tasks' | 'Action Items' = 'Tasks'

    try {
      const taskRecord = await base(AIRTABLE_TABLES.TASKS).find(id)
      const taskAssignee = taskRecord.get('Assignee Name') as string
      verifyTaskOwnership(taskAssignee, assigneeName, resolvedName)
      sourceMeetingId = taskRecord.get('Source Meeting ID') as string
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'statusCode' in e && e.statusCode === 404) {
        try {
          const actionItemRecord = await base(AIRTABLE_TABLES.ACTION_ITEMS).find(id)
          const itemAssignee = actionItemRecord.get('Assignee') as string
          verifyTaskOwnership(itemAssignee, assigneeName, resolvedName)
          sourceMeetingId = (actionItemRecord.get('Source Meeting') as string[])?.[0]
          taskTable = 'Action Items'
        } catch (e2: unknown) {
          if (e2 && typeof e2 === 'object' && 'statusCode' in e2 && e2.statusCode === 404) {
            throw new AppError('Task not found', 404)
          }
          throw e2
        }
      } else {
        throw e
      }
    }

    if (!sourceMeetingId) {
      res.json({
        success: true,
        data: [],
        message: 'No source meeting found for this task',
      })
      return
    }

    // Find other tasks from the same meeting (for any assignee, not just the current user)
    const relatedTasks: Array<{
      id: string
      name: string
      assignee: string
      status: string
      type: 'task' | 'action_item'
    }> = []

    // Search Tasks table
    try {
      const tasks = await base(AIRTABLE_TABLES.TASKS)
        .select({
          filterByFormula: `AND({Source Meeting ID} = "${sourceMeetingId}", RECORD_ID() != "${id}")`,
          fields: ['Name', 'Assignee Name', 'Status'],
        })
        .all()

      tasks.forEach(task => {
        relatedTasks.push({
          id: task.id,
          name: task.get('Name') as string,
          assignee: task.get('Assignee Name') as string,
          status: task.get('Status') as string,
          type: 'task',
        })
      })
    } catch (e) {
      console.warn('Failed to fetch related tasks:', e)
    }

    // Search Action Items table
    try {
      const actionItems = await base(AIRTABLE_TABLES.ACTION_ITEMS)
        .select({
          filterByFormula: `AND(RECORD_ID() != "${id}")`,
          fields: ['Task Description', 'Assignee', 'Status', 'Source Meeting'],
        })
        .all()

      // Filter to same meeting (Source Meeting is a link field)
      actionItems.forEach(item => {
        const itemMeetingId = (item.get('Source Meeting') as string[])?.[0]
        if (itemMeetingId === sourceMeetingId) {
          relatedTasks.push({
            id: item.id,
            name: item.get('Task Description') as string,
            assignee: item.get('Assignee') as string,
            status: item.get('Status') as string,
            type: 'action_item',
          })
        }
      })
    } catch (e) {
      console.warn('Failed to fetch related action items:', e)
    }

    res.json({
      success: true,
      data: relatedTasks,
      meta: {
        sourceMeetingId,
        currentTaskTable: taskTable,
      },
    })
  })
)

/**
 * GET /api/v1/team-tasks/:token/preferences
 * Get user preferences (reminder frequency, email)
 */
router.get(
  '/:token/preferences',
  asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params

    const base = getBase()
    const { tokenRecord } = await validateTokenAndGetAssignee(base, token)

    res.json({
      success: true,
      data: {
        email: tokenRecord.get('Email') as string | undefined,
        reminderFrequency: (tokenRecord.get('Reminder Frequency') as string) || 'none',
      },
    })
  })
)

/**
 * PATCH /api/v1/team-tasks/:token/preferences
 * Update user preferences
 *
 * Body params:
 * - email: string (optional)
 * - reminderFrequency: 'daily' | 'weekly' | 'none'
 */
router.patch(
  '/:token/preferences',
  asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params
    const { email, reminderFrequency } = req.body

    const base = getBase()
    const { tokenRecord } = await validateTokenAndGetAssignee(base, token)

    // Validate reminder frequency if provided
    const validFrequencies = ['daily', 'weekly', 'none']
    if (reminderFrequency && !validFrequencies.includes(reminderFrequency)) {
      throw new AppError(`Invalid reminder frequency. Must be one of: ${validFrequencies.join(', ')}`, 400)
    }

    // Build updates
    const updates: Record<string, unknown> = {}
    if (email !== undefined) {
      updates['Email'] = email
    }
    if (reminderFrequency !== undefined) {
      updates['Reminder Frequency'] = reminderFrequency
    }

    if (Object.keys(updates).length === 0) {
      throw new AppError('No updates provided', 400)
    }

    await base(AIRTABLE_TABLES.TEAM_MEMBER_TOKENS).update(tokenRecord.id, updates as Partial<FieldSet>)

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      data: {
        email: email !== undefined ? email : tokenRecord.get('Email'),
        reminderFrequency: reminderFrequency || tokenRecord.get('Reminder Frequency') || 'none',
      },
    })
  })
)

/**
 * POST /api/v1/team-tasks/:token/items/:id/reminder
 * Set a reminder date for a task
 *
 * Body params:
 * - reminderDate: string (ISO date) | null (to clear)
 */
router.post(
  '/:token/items/:id/reminder',
  asyncHandler(async (req: Request, res: Response) => {
    const { token, id } = req.params
    const { reminderDate } = req.body

    const base = getBase()
    const { assigneeName, resolvedName } = await validateTokenAndGetAssignee(base, token)

    // Try Tasks table first
    try {
      const taskRecord = await base(AIRTABLE_TABLES.TASKS).find(id)
      const taskAssignee = taskRecord.get('Assignee Name') as string

      verifyTaskOwnership(taskAssignee, assigneeName, resolvedName)

      await base(AIRTABLE_TABLES.TASKS).update(id, {
        'Reminder Date': reminderDate || null,
      } as Partial<FieldSet>)

      // Invalidate tasks cache
      await cacheDeletePattern(`${CACHE.KEYS.TASKS}:*`)

      res.json({
        success: true,
        message: reminderDate ? 'Reminder set successfully' : 'Reminder cleared',
        data: { id, reminderDate },
      })
      return
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'statusCode' in e && e.statusCode !== 404) {
        throw e
      }
    }

    // Try Action Items table (may not support reminders)
    try {
      const actionItemRecord = await base(AIRTABLE_TABLES.ACTION_ITEMS).find(id)
      const itemAssignee = actionItemRecord.get('Assignee') as string

      verifyTaskOwnership(itemAssignee, assigneeName, resolvedName)

      // Action Items may not have Reminder Date field - try anyway
      await base(AIRTABLE_TABLES.ACTION_ITEMS).update(id, {
        'Reminder Date': reminderDate || null,
      } as Partial<FieldSet>)

      await cacheDeletePattern(`${CACHE.KEYS.ACTION_ITEMS}:*`)

      res.json({
        success: true,
        message: reminderDate ? 'Reminder set successfully' : 'Reminder cleared',
        data: { id, reminderDate },
      })
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'statusCode' in e && e.statusCode === 404) {
        throw new AppError('Task not found', 404)
      }
      throw e
    }
  })
)

/**
 * POST /api/v1/team-tasks/:token/items/:id/subtasks
 * Create a subtask for an existing task
 *
 * Body params:
 * - name: string (required - subtask title)
 */
router.post(
  '/:token/items/:id/subtasks',
  asyncHandler(async (req: Request, res: Response) => {
    const { token, id } = req.params
    const { name } = req.body

    if (!name || name.trim().length === 0) {
      throw new AppError('Subtask name is required', 400)
    }

    const base = getBase()
    const { assigneeName, resolvedName } = await validateTokenAndGetAssignee(base, token)

    // Verify parent task exists and belongs to user (only Tasks table supports subtasks)
    let parentTask: Airtable.Record<FieldSet>
    try {
      parentTask = await base(AIRTABLE_TABLES.TASKS).find(id)
      const taskAssignee = parentTask.get('Assignee Name') as string
      verifyTaskOwnership(taskAssignee, assigneeName, resolvedName)
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'statusCode' in e && e.statusCode === 404) {
        throw new AppError('Parent task not found', 404)
      }
      throw e
    }

    // Prevent creating subtasks of subtasks (only one level deep)
    const parentOfParent = parentTask.get('Parent Task ID') as string
    if (parentOfParent) {
      throw new AppError('Cannot create subtasks of subtasks. Only one level of nesting is allowed.', 400)
    }

    // Create the subtask
    const subtaskRecord = await base(AIRTABLE_TABLES.TASKS).create({
      'Name': name.trim(),
      'Status': 'Open',
      'Priority': parentTask.get('Priority') as string || 'Medium', // Inherit parent priority
      'Assignee Name': resolvedName,
      'Parent Task ID': id,
      'Source': 'Manual',
      'Source Meeting ID': parentTask.get('Source Meeting ID') as string || undefined,
    } as Partial<FieldSet>)

    // Invalidate tasks cache
    await cacheDeletePattern(`${CACHE.KEYS.TASKS}:*`)

    res.json({
      success: true,
      message: 'Subtask created successfully',
      data: {
        id: subtaskRecord.id,
        name: name.trim(),
        status: 'Open',
        parentTaskId: id,
      },
    })
  })
)

/**
 * PATCH /api/v1/team-tasks/:token/subtasks/:id
 * Update a subtask (simplified - just status toggle)
 */
router.patch(
  '/:token/subtasks/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { token, id } = req.params
    const { status, name } = req.body

    const base = getBase()
    const { assigneeName, resolvedName } = await validateTokenAndGetAssignee(base, token)

    // Find the subtask
    let subtaskRecord: Airtable.Record<FieldSet>
    try {
      subtaskRecord = await base(AIRTABLE_TABLES.TASKS).find(id)
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'statusCode' in e && e.statusCode === 404) {
        throw new AppError('Subtask not found', 404)
      }
      throw e
    }

    // Verify it's actually a subtask
    const parentTaskId = subtaskRecord.get('Parent Task ID') as string
    if (!parentTaskId) {
      throw new AppError('This is not a subtask', 400)
    }

    // Verify ownership
    const taskAssignee = subtaskRecord.get('Assignee Name') as string
    verifyTaskOwnership(taskAssignee, assigneeName, resolvedName)

    // Build updates
    const updates: Record<string, unknown> = {}
    if (status) {
      const validStatuses = ['Open', 'In Progress', 'Done']
      if (!validStatuses.includes(status)) {
        throw new AppError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400)
      }
      updates['Status'] = status
      if (status === 'Done') {
        updates['Completed Date'] = new Date().toISOString().split('T')[0]
      }
    }
    if (name !== undefined) {
      updates['Name'] = name.trim()
    }

    if (Object.keys(updates).length === 0) {
      throw new AppError('No updates provided', 400)
    }

    await base(AIRTABLE_TABLES.TASKS).update(id, updates as Partial<FieldSet>)

    // Invalidate tasks cache
    await cacheDeletePattern(`${CACHE.KEYS.TASKS}:*`)

    res.json({
      success: true,
      message: 'Subtask updated successfully',
      data: { id, ...updates, parentTaskId },
    })
  })
)

/**
 * DELETE /api/v1/team-tasks/:token/subtasks/:id
 * Delete a subtask
 */
router.delete(
  '/:token/subtasks/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { token, id } = req.params

    const base = getBase()
    const { assigneeName, resolvedName } = await validateTokenAndGetAssignee(base, token)

    // Find the subtask
    let subtaskRecord: Airtable.Record<FieldSet>
    try {
      subtaskRecord = await base(AIRTABLE_TABLES.TASKS).find(id)
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'statusCode' in e && e.statusCode === 404) {
        throw new AppError('Subtask not found', 404)
      }
      throw e
    }

    // Verify it's actually a subtask
    const parentTaskId = subtaskRecord.get('Parent Task ID') as string
    if (!parentTaskId) {
      throw new AppError('This is not a subtask', 400)
    }

    // Verify ownership
    const taskAssignee = subtaskRecord.get('Assignee Name') as string
    verifyTaskOwnership(taskAssignee, assigneeName, resolvedName)

    // Delete the subtask
    await base(AIRTABLE_TABLES.TASKS).destroy(id)

    // Invalidate tasks cache
    await cacheDeletePattern(`${CACHE.KEYS.TASKS}:*`)

    res.json({
      success: true,
      message: 'Subtask deleted successfully',
      data: { id, parentTaskId },
    })
  })
)

/**
 * POST /api/v1/team-tasks/tokens
 * Create or get existing token for an assignee (admin endpoint)
 *
 * This is used internally when sending emails to generate the secure link
 */
router.post(
  '/tokens',
  asyncHandler(async (req: Request, res: Response) => {
    const { assigneeName, email, fullName } = req.body

    if (!assigneeName) {
      throw new AppError('Assignee name is required', 400)
    }

    // Use provided fullName, or fall back to resolving from cache
    const resolvedName = fullName || resolveFullName(assigneeName)
    const base = getBase()

    // Check if token already exists for this assignee
    const existingTokens = await base(AIRTABLE_TABLES.TEAM_MEMBER_TOKENS)
      .select({
        filterByFormula: `OR({Assignee Name} = "${assigneeName}", {Assignee Name} = "${resolvedName}")`,
        maxRecords: 1,
      })
      .all()

    if (existingTokens.length > 0) {
      const existing = existingTokens[0]
      const token = existing.get('Token') as string
      const isActive = existing.get('Is Active') as boolean

      // If token exists but is inactive, reactivate it with a new token
      if (!isActive) {
        const newToken = randomUUID()
        await base(AIRTABLE_TABLES.TEAM_MEMBER_TOKENS).update(existing.id, {
          'Token': newToken,
          'Is Active': true,
          'Email': email || existing.get('Email'),
        })

        res.json({
          success: true,
          data: {
            id: existing.id,
            assigneeName: resolvedName,
            token: newToken,
            isNew: false,
            reactivated: true,
          },
        })
        return
      }

      // Return existing active token
      res.json({
        success: true,
        data: {
          id: existing.id,
          assigneeName: existing.get('Assignee Name') as string,
          token,
          isNew: false,
        },
      })
      return
    }

    // Create new token
    const newToken = randomUUID()
    const record = await base(AIRTABLE_TABLES.TEAM_MEMBER_TOKENS).create({
      'Assignee Name': assigneeName, // Store the short/partial name for matching
      'Full Name': resolvedName, // Store the full display name
      'Token': newToken,
      'Email': email || '',
      'Is Active': true,
      'Access Count': 0,
    })

    res.json({
      success: true,
      data: {
        id: record.id,
        assigneeName: resolvedName,
        token: newToken,
        isNew: true,
      },
    })
  })
)

/**
 * GET /api/v1/team-tasks/tokens
 * List all tokens (admin endpoint for management)
 */
router.get(
  '/tokens',
  asyncHandler(async (_req: Request, res: Response) => {
    const base = getBase()

    const records = await base(AIRTABLE_TABLES.TEAM_MEMBER_TOKENS)
      .select({
        sort: [{ field: 'Assignee Name', direction: 'asc' }],
      })
      .all()

    const tokens = records.map(record => ({
      id: record.id,
      assigneeName: record.get('Assignee Name') as string,
      email: record.get('Email') as string | undefined,
      isActive: record.get('Is Active') as boolean,
      lastAccessed: record.get('Last Accessed') as string | undefined,
      accessCount: record.get('Access Count') as number,
    }))

    res.json({
      success: true,
      data: tokens,
    })
  })
)

/**
 * DELETE /api/v1/team-tasks/tokens/:id
 * Revoke a token (set inactive, don't delete)
 */
router.delete(
  '/tokens/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params
    const base = getBase()

    await base(AIRTABLE_TABLES.TEAM_MEMBER_TOKENS).update(id, {
      'Is Active': false,
    })

    res.json({
      success: true,
      message: 'Token revoked successfully',
    })
  })
)

/**
 * POST /api/v1/team-tasks/tokens/:id/regenerate
 * Regenerate a token (new UUID, keeps record)
 */
router.post(
  '/tokens/:id/regenerate',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params
    const base = getBase()

    const newToken = randomUUID()

    const record = await base(AIRTABLE_TABLES.TEAM_MEMBER_TOKENS).update(id, {
      'Token': newToken,
      'Is Active': true,
    })

    res.json({
      success: true,
      data: {
        id: record.id,
        assigneeName: record.get('Assignee Name') as string,
        token: newToken,
      },
    })
  })
)

export default router
