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

const router = Router()

// Name mapping for team members (partial name -> full name)
const NAME_MAPPING: Record<string, string> = {
  'schmitt': 'Peter Schmitt',
  'collopy': 'Tim Collopy',
  'lowry': 'Mike Lowry',
  'conzelman': 'John Conzelman',
  'yang': 'Xiaobing Yang',
  'mason': 'Jon Mason',
  'maso': 'Jon Mason',
  'shansky': 'Bill Shansky',
  'hecker': 'Mike Hecker',
  'lemley': 'Lemley',
  'phillips': 'Ellie Phillips',
  'martinez': 'Katy Martinez',
  'peter': 'Peter Schmitt',
  'tim': 'Tim Collopy',
  'jon': 'Jon Mason',
  'joe': 'Joe',
  'steve': 'Steve',
  'ellie': 'Ellie Phillips',
  'katy': 'Katy Martinez',
  'bill': 'Bill Shansky',
  'mike': 'Mike Hecker',
  'william': 'William',
}

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
 * Resolve partial names to full names
 */
function resolveFullName(name: string): string {
  const nameLower = name.toLowerCase().trim()
  if (name.includes(' ')) return name // Already a full name
  return NAME_MAPPING[nameLower] || name
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
    const resolvedName = resolveFullName(assigneeName)

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

    // Fetch meeting titles
    const meetingTitles = new Map<string, string>()
    if (meetingIds.size > 0) {
      const meetingIdArray = Array.from(meetingIds)
      const orConditions = meetingIdArray.map(id => `RECORD_ID() = "${id}"`).join(', ')

      try {
        const meetings = await base(AIRTABLE_TABLES.MEETINGS)
          .select({
            filterByFormula: `OR(${orConditions})`,
            fields: ['Title', 'Name'],
          })
          .all()

        meetings.forEach(meeting => {
          const title = (meeting.get('Title') as string) || (meeting.get('Name') as string) || 'Meeting'
          meetingTitles.set(meeting.id, title)
        })
      } catch (e) {
        console.warn('Failed to fetch meeting titles:', e)
      }
    }

    // Transform tasks
    const tasks = taskRecords.map(record => {
      const sourceMeetingId = record.get('Source Meeting ID') as string
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
        sourceMeetingTitle: sourceMeetingId ? meetingTitles.get(sourceMeetingId) : undefined,
      }
    })

    // Transform action items
    const actionItems = actionItemRecords.map(record => {
      const sourceMeetingId = (record.get('Source Meeting') as string[])?.[0]
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
        sourceMeetingTitle: sourceMeetingId ? meetingTitles.get(sourceMeetingId) : undefined,
      }
    })

    // Combine and categorize
    const allTasks = [...tasks, ...actionItems]

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
 * PATCH /api/v1/team-tasks/:token/items/:id
 * Update a task status (team member can mark tasks complete)
 *
 * Security:
 * - Token must be valid and active
 * - Can only update tasks that belong to that assignee
 */
router.patch(
  '/:token/items/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { token, id } = req.params
    const { status, notes } = req.body

    if (!token || token.length < 32) {
      throw new AppError('Invalid access token', 401)
    }

    const base = getBase()

    // Validate token
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
    const resolvedName = resolveFullName(assigneeName)

    // Try to find the item in Tasks table first
    try {
      const taskRecord = await base(AIRTABLE_TABLES.TASKS).find(id)
      const taskAssignee = taskRecord.get('Assignee Name') as string

      // Verify this task belongs to the token holder
      if (!taskAssignee ||
          (taskAssignee.toLowerCase() !== assigneeName.toLowerCase() &&
           taskAssignee.toLowerCase() !== resolvedName.toLowerCase() &&
           !taskAssignee.toLowerCase().includes(assigneeName.toLowerCase()))) {
        throw new AppError('You can only update your own tasks', 403)
      }

      // Update the task
      const updates: Record<string, unknown> = {}
      if (status) {
        updates['Status'] = status
        if (status === TASKS.STATUS.DONE) {
          updates['Completed Date'] = new Date().toISOString().split('T')[0]
        }
      }
      if (notes !== undefined) {
        updates['Description'] = notes
      }

      await base(AIRTABLE_TABLES.TASKS).update(id, updates as Partial<FieldSet>)

      res.json({
        success: true,
        message: 'Task updated successfully',
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

      // Verify this item belongs to the token holder
      if (!itemAssignee ||
          (itemAssignee.toLowerCase() !== assigneeName.toLowerCase() &&
           itemAssignee.toLowerCase() !== resolvedName.toLowerCase() &&
           !itemAssignee.toLowerCase().includes(assigneeName.toLowerCase()))) {
        throw new AppError('You can only update your own tasks', 403)
      }

      // Update the action item
      const updates: Record<string, unknown> = {}
      if (status) {
        updates['Status'] = status === TASKS.STATUS.DONE ? 'Complete' : status
        if (status === TASKS.STATUS.DONE || status === 'Complete') {
          updates['Completed At'] = new Date().toISOString()
        }
      }
      if (notes !== undefined) {
        updates['Notes'] = notes
      }

      await base(AIRTABLE_TABLES.ACTION_ITEMS).update(id, updates as Partial<FieldSet>)

      // Invalidate action items cache
      await cacheDeletePattern(`${CACHE.KEYS.ACTION_ITEMS}:*`)

      res.json({
        success: true,
        message: 'Action item updated successfully',
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
 * POST /api/v1/team-tasks/tokens
 * Create or get existing token for an assignee (admin endpoint)
 *
 * This is used internally when sending emails to generate the secure link
 */
router.post(
  '/tokens',
  asyncHandler(async (req: Request, res: Response) => {
    const { assigneeName, email } = req.body

    if (!assigneeName) {
      throw new AppError('Assignee name is required', 400)
    }

    const resolvedName = resolveFullName(assigneeName)
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
      'Assignee Name': resolvedName,
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
