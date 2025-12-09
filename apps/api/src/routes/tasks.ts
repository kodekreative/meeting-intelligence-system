/**
 * Tasks Routes
 * API endpoints for task management (unified view of action items + manual tasks)
 */

import { Router, Request, Response } from 'express'
import Airtable from 'airtable'
import { asyncHandler, AppError } from '../middleware/errorHandler.js'
import { cacheGet, cacheSet, cacheDeletePattern } from '../utils/redis.js'
import { CACHE, TASKS } from '../shared/constants.js'
import { AIRTABLE_TABLES } from '../lib/schema.js'
import { createTaskSchema, updateTaskSchema } from '../shared/schemas.js'

const router: Router = Router()

// Name mapping for team members (partial name -> full name)
// This maps partial names from Action Items to full names
const NAME_MAPPING: Record<string, string> = {
  // Last names
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
  // First names (when only first name is provided)
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
 * GET /api/v1/tasks
 * Get all tasks with optional filtering
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { status, priority, assigneeId, companyId, source, search } = req.query

    // Build cache key
    const cacheKey = `${CACHE.KEYS.TASKS}:${JSON.stringify(req.query)}`

    // Try cache first
    const cached = await cacheGet(cacheKey)
    if (cached) {
      res.json({
        success: true,
        data: cached,
        meta: { cached: true },
      })
      return
    }

    // Build filter formula
    const filters: string[] = []

    if (status) {
      const statuses = (status as string).split(',')
      if (statuses.length === 1) {
        filters.push(`{Status} = "${statuses[0]}"`)
      } else {
        const orConditions = statuses.map(s => `{Status} = "${s}"`).join(', ')
        filters.push(`OR(${orConditions})`)
      }
    }

    if (priority) {
      const priorities = (priority as string).split(',')
      if (priorities.length === 1) {
        filters.push(`{Priority} = "${priorities[0]}"`)
      } else {
        const orConditions = priorities.map(p => `{Priority} = "${p}"`).join(', ')
        filters.push(`OR(${orConditions})`)
      }
    }

    if (assigneeId) {
      filters.push(`FIND("${assigneeId}", ARRAYJOIN({Assignee}))`)
    }

    if (companyId) {
      filters.push(`FIND("${companyId}", ARRAYJOIN({Company}))`)
    }

    if (source) {
      filters.push(`{Source} = "${source}"`)
    }

    if (search) {
      const searchTerm = (search as string).replace(/"/g, '\\"')
      filters.push(`OR(FIND(LOWER("${searchTerm}"), LOWER({Name})), FIND(LOWER("${searchTerm}"), LOWER({Description})))`)
    }

    const filterFormula = filters.length > 0 ? `AND(${filters.join(', ')})` : ''

    // Fetch from Airtable
    const base = getBase()
    const records = await base(AIRTABLE_TABLES.TASKS)
      .select({
        filterByFormula: filterFormula,
        sort: [
          { field: 'Due Date', direction: 'asc' },
          { field: 'Priority', direction: 'desc' },
        ],
      })
      .all()

    // Collect all unique assignee IDs, names, and source meeting IDs
    const assigneeIds = new Set<string>()
    const assigneeNames = new Set<string>()
    const sourceMeetingIds = new Set<string>()
    records.forEach((record) => {
      const assignee = record.get('Assignee') as string[] | undefined
      if (assignee?.[0]) {
        assigneeIds.add(assignee[0])
      }
      const assigneeName = record.get('Assignee Name') as string | undefined
      if (assigneeName) {
        assigneeNames.add(assigneeName)
      }
      const sourceMeetingId = record.get('Source Meeting ID') as string | undefined
      if (sourceMeetingId) {
        sourceMeetingIds.add(sourceMeetingId)
      }
    })

    // Fetch all users to build a lookup map (by ID and by last name)
    const assigneeMapById = new Map<string, string>()
    const assigneeMapByLastName = new Map<string, string>()

    // Map for meeting ID -> Start Time (used as task created time)
    const meetingStartTimeMap = new Map<string, string>()

    try {
      // Fetch all active users for name matching
      const userRecords = await base(AIRTABLE_TABLES.USERS)
        .select({
          filterByFormula: '{Is Active} = TRUE()',
        })
        .all()

      userRecords.forEach((user) => {
        const fullName = user.get('Full Name') as string
        if (fullName) {
          // Map by ID
          assigneeMapById.set(user.id, fullName)
          // Map by last name (for matching partial names like "Schmitt" -> "Peter Schmitt")
          const nameParts = fullName.split(' ')
          if (nameParts.length > 1) {
            const lastName = nameParts[nameParts.length - 1]
            assigneeMapByLastName.set(lastName.toLowerCase(), fullName)
          }
        }
      })
    } catch (e) {
      // If user lookup fails, fall back to Assignee Name field
      console.warn('Failed to fetch user full names:', e)
    }

    // Fetch meeting start times for tasks that came from meetings
    if (sourceMeetingIds.size > 0) {
      try {
        // Fetch meetings in batches if needed (Airtable formula has length limits)
        const meetingIdArray = Array.from(sourceMeetingIds)
        const batchSize = 50 // Process in batches to avoid formula length limits

        for (let i = 0; i < meetingIdArray.length; i += batchSize) {
          const batch = meetingIdArray.slice(i, i + batchSize)
          const orConditions = batch.map(id => `RECORD_ID() = "${id}"`).join(', ')
          const meetingRecords = await base(AIRTABLE_TABLES.MEETINGS)
            .select({
              filterByFormula: `OR(${orConditions})`,
              fields: ['Start Time'],
            })
            .all()

          meetingRecords.forEach((meeting) => {
            const startTime = meeting.get('Start Time') as string
            if (startTime) {
              meetingStartTimeMap.set(meeting.id, startTime)
            }
          })
        }
      } catch (e) {
        console.warn('Failed to fetch meeting start times:', e)
      }
    }

    // Transform to API response format
    const tasks = records.map((record) => {
      const assigneeId = (record.get('Assignee') as string[] | undefined)?.[0]
      let assigneeName = record.get('Assignee Name') as string | undefined

      // Try to resolve full name
      if (assigneeId && assigneeMapById.has(assigneeId)) {
        // First priority: linked user ID
        assigneeName = assigneeMapById.get(assigneeId)
      } else if (assigneeName && !assigneeName.includes(' ')) {
        // Second priority: match by last name from Users table
        const nameLower = assigneeName.toLowerCase()
        if (assigneeMapByLastName.has(nameLower)) {
          assigneeName = assigneeMapByLastName.get(nameLower)
        } else if (NAME_MAPPING[nameLower]) {
          // Third priority: use hardcoded name mapping
          assigneeName = NAME_MAPPING[nameLower]
        }
      }

      // Get the meeting start time as the task's created time
      const sourceMeetingId = record.get('Source Meeting ID') as string | undefined
      const createdTime = sourceMeetingId
        ? meetingStartTimeMap.get(sourceMeetingId)
        : undefined

      return {
        id: record.id,
        name: record.get('Name') as string,
        description: record.get('Description') as string | undefined,
        status: record.get('Status') as string,
        priority: record.get('Priority') as string,
        assigneeId,
        assigneeName,
        dueDate: record.get('Due Date') as string | undefined,
        companyId: (record.get('Company') as string[] | undefined)?.[0],
        source: record.get('Source') as string,
        sourceActionItemId: record.get('Source Action Item ID') as string | undefined,
        sourceMeetingId,
        sourceMeetingTitle: record.get('Source Meeting Title') as string | undefined,
        completedDate: record.get('Completed Date') as string | undefined,
        createdTime,
        stackId: record.get('Stack ID') as string | undefined,
        stackOrder: record.get('Stack Order') as number | undefined,
      }
    })

    // Cache the result
    await cacheSet(cacheKey, tasks, CACHE.TTL.SHORT)

    res.json({
      success: true,
      data: tasks,
      meta: {
        count: tasks.length,
        cached: false,
      },
    })
  })
)

/**
 * GET /api/v1/tasks/users
 * Get all assignees for selection - combines Users table + unique assignee names from tasks
 * NOTE: This must be defined BEFORE /:id route to avoid being caught by it
 */
router.get(
  '/users',
  asyncHandler(async (_req: Request, res: Response) => {
    const cacheKey = `${CACHE.KEYS.TASKS}:users`

    const cached = await cacheGet(cacheKey)
    if (cached) {
      res.json({
        success: true,
        data: cached,
        meta: { cached: true },
      })
      return
    }

    const base = getBase()

    // Get users from Users table
    const userRecords = await base(AIRTABLE_TABLES.USERS)
      .select({
        filterByFormula: '{Is Active} = TRUE()',
        sort: [{ field: 'Full Name', direction: 'asc' }],
      })
      .all()

    const usersFromTable = userRecords
      .filter(record => record.get('Full Name'))
      .map((record) => ({
        id: record.id,
        fullName: record.get('Full Name') as string,
        email: record.get('Email') as string || '',
        source: 'user' as const,
      }))

    // Get unique assignee names from existing tasks
    const taskRecords = await base(AIRTABLE_TABLES.TASKS)
      .select({
        fields: ['Assignee Name'],
      })
      .all()

    const assigneeNamesFromTasks = new Set<string>()
    taskRecords.forEach(record => {
      const name = record.get('Assignee Name') as string
      if (name && name.trim()) {
        assigneeNamesFromTasks.add(name.trim())
      }
    })

    // Also get from Action Items table
    const actionItemRecords = await base(AIRTABLE_TABLES.ACTION_ITEMS)
      .select({
        fields: ['Assignee'],
      })
      .all()

    actionItemRecords.forEach(record => {
      const name = record.get('Assignee') as string
      if (name && name.trim()) {
        assigneeNamesFromTasks.add(name.trim())
      }
    })

    // Create set of existing user names (lowercase) to avoid duplicates
    const existingUserNames = new Set(
      usersFromTable.map(u => u.fullName.toLowerCase())
    )

    // Helper to resolve partial names to full names using NAME_MAPPING
    const resolveFullName = (name: string): string => {
      const nameLower = name.toLowerCase()
      // Check if it's already a full name (has space)
      if (name.includes(' ')) return name
      // Try to map partial name to full name
      return NAME_MAPPING[nameLower] || name
    }

    // Add task assignees that aren't already in the users table
    // Convert partial names (like "Collopy") to full names (like "Tim Collopy")
    const resolvedNames = new Map<string, string>() // lowercase -> resolved name
    Array.from(assigneeNamesFromTasks).forEach(name => {
      const fullName = resolveFullName(name)
      const key = fullName.toLowerCase()
      // Only add if not already in users table and not a duplicate
      if (!existingUserNames.has(key) && !resolvedNames.has(key)) {
        resolvedNames.set(key, fullName)
      }
    })

    const assigneesFromTasks = Array.from(resolvedNames.values())
      .map(name => ({
        id: `custom-${name.toLowerCase().replace(/\s+/g, '-')}`,
        fullName: name,
        email: '',
        source: 'task' as const,
      }))

    // Combine and sort
    const allUsers = [...usersFromTable, ...assigneesFromTasks]
      .sort((a, b) => a.fullName.localeCompare(b.fullName))

    await cacheSet(cacheKey, allUsers, CACHE.TTL.MEDIUM)

    res.json({
      success: true,
      data: allUsers,
      meta: { cached: false },
    })
  })
)

/**
 * GET /api/v1/tasks/meetings
 * Get recent meetings for linking tasks
 * NOTE: This must be defined BEFORE /:id route to avoid being caught by it
 */
router.get(
  '/meetings',
  asyncHandler(async (_req: Request, res: Response) => {
    const cacheKey = `${CACHE.KEYS.TASKS}:meetings`

    const cached = await cacheGet(cacheKey)
    if (cached) {
      res.json({
        success: true,
        data: cached,
        meta: { cached: true },
      })
      return
    }

    const base = getBase()
    const records = await base(AIRTABLE_TABLES.MEETINGS)
      .select({
        sort: [{ field: 'Start Time', direction: 'desc' }],
        maxRecords: 100,
      })
      .all()

    const meetings = records.map((record) => ({
      id: record.id,
      title: record.get('Title') as string || record.get('Name') as string || 'Untitled Meeting',
      startTime: record.get('Start Time') as string,
    }))

    await cacheSet(cacheKey, meetings, CACHE.TTL.SHORT)

    res.json({
      success: true,
      data: meetings,
      meta: { cached: false },
    })
  })
)

/**
 * GET /api/v1/tasks/stats/by-status
 * Get task counts grouped by status
 * NOTE: This must be defined BEFORE /:id route to avoid being caught by it
 */
router.get(
  '/stats/by-status',
  asyncHandler(async (_req: Request, res: Response) => {
    const cacheKey = `${CACHE.KEYS.TASKS}:stats:by-status`

    const cached = await cacheGet(cacheKey)
    if (cached) {
      res.json({
        success: true,
        data: cached,
        meta: { cached: true },
      })
      return
    }

    const base = getBase()
    const records = await base(AIRTABLE_TABLES.TASKS).select().all()

    const stats = {
      [TASKS.STATUS.BACKLOG]: 0,
      [TASKS.STATUS.IN_PROGRESS]: 0,
      [TASKS.STATUS.BLOCKED]: 0,
      [TASKS.STATUS.DONE]: 0,
      total: records.length,
    }

    records.forEach((record) => {
      const status = record.get('Status') as string
      if (status in stats) {
        stats[status as keyof typeof stats]++
      }
    })

    await cacheSet(cacheKey, stats, CACHE.TTL.SHORT)

    res.json({
      success: true,
      data: stats,
      meta: { cached: false },
    })
  })
)

/**
 * GET /api/v1/tasks/:id
 * Get a single task by ID
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params

    // Try cache first
    const cacheKey = `${CACHE.KEYS.TASKS}:${id}`
    const cached = await cacheGet(cacheKey)
    if (cached) {
      res.json({
        success: true,
        data: cached,
        meta: { cached: true },
      })
      return
    }

    // Fetch from Airtable
    const base = getBase()

    try {
      const record = await base(AIRTABLE_TABLES.TASKS).find(id)

      // Look up assignee full name if available
      const assigneeId = (record.get('Assignee') as string[] | undefined)?.[0]
      let assigneeName = record.get('Assignee Name') as string | undefined

      if (assigneeId) {
        try {
          const userRecord = await base(AIRTABLE_TABLES.USERS).find(assigneeId)
          const fullName = userRecord.get('Full Name') as string
          if (fullName) {
            assigneeName = fullName
          }
        } catch {
          // Fall back to Assignee Name field
        }
      }

      // Get meeting start time as created time
      const sourceMeetingId = record.get('Source Meeting ID') as string | undefined
      let createdTime: string | undefined
      if (sourceMeetingId) {
        try {
          const meeting = await base(AIRTABLE_TABLES.MEETINGS).find(sourceMeetingId)
          createdTime = meeting.get('Start Time') as string | undefined
        } catch {
          // Meeting not found, leave createdTime undefined
        }
      }

      const task = {
        id: record.id,
        name: record.get('Name') as string,
        description: record.get('Description') as string | undefined,
        status: record.get('Status') as string,
        priority: record.get('Priority') as string,
        assigneeId,
        assigneeName,
        dueDate: record.get('Due Date') as string | undefined,
        companyId: (record.get('Company') as string[] | undefined)?.[0],
        source: record.get('Source') as string,
        sourceActionItemId: record.get('Source Action Item ID') as string | undefined,
        sourceMeetingId,
        sourceMeetingTitle: record.get('Source Meeting Title') as string | undefined,
        completedDate: record.get('Completed Date') as string | undefined,
        createdTime,
        stackId: record.get('Stack ID') as string | undefined,
        stackOrder: record.get('Stack Order') as number | undefined,
      }

      // Cache the result
      await cacheSet(cacheKey, task, CACHE.TTL.MEDIUM)

      res.json({
        success: true,
        data: task,
      })
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 404) {
        throw new AppError('Task not found', 404)
      }
      throw error
    }
  })
)

/**
 * POST /api/v1/tasks
 * Create a new task
 */
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const validatedData = createTaskSchema.parse(req.body)

    // Build Airtable fields
    const fields: Record<string, unknown> = {
      'Name': validatedData.name,
      'Status': validatedData.status || TASKS.STATUS.BACKLOG,
      'Priority': validatedData.priority || TASKS.PRIORITY.MEDIUM,
      'Source': validatedData.source || TASKS.SOURCE.MANUAL,
    }

    if (validatedData.description) {
      fields['Description'] = validatedData.description
    }
    if (validatedData.assigneeId) {
      fields['Assignee'] = [validatedData.assigneeId]
    }
    // Support custom assignee name (when not linking to a User record)
    if (validatedData.assigneeName && !validatedData.assigneeId) {
      fields['Assignee Name'] = validatedData.assigneeName
    }
    if (validatedData.dueDate) {
      fields['Due Date'] = validatedData.dueDate
    }
    if (validatedData.companyId) {
      fields['Company'] = [validatedData.companyId]
    }
    if (validatedData.sourceActionItemId) {
      fields['Source Action Item ID'] = validatedData.sourceActionItemId
    }
    if (validatedData.sourceMeetingId) {
      fields['Source Meeting ID'] = validatedData.sourceMeetingId
    }

    // Create in Airtable
    const base = getBase()
    const record = await base(AIRTABLE_TABLES.TASKS).create({ fields: fields as any })

    // Invalidate cache
    await cacheDeletePattern(`${CACHE.KEYS.TASKS}:*`)

    // Resolve assignee name
    let assigneeName: string | undefined
    if (validatedData.assigneeId) {
      // Linked to a User record - fetch the full name
      try {
        const userRecord = await base(AIRTABLE_TABLES.USERS).find(validatedData.assigneeId)
        assigneeName = userRecord.get('Full Name') as string
      } catch {
        // Fallback to lookup field if user fetch fails
        assigneeName = (record as any).get('Assignee Name') as string | undefined
      }
    } else if (validatedData.assigneeName) {
      // Custom name provided directly
      assigneeName = validatedData.assigneeName
    }

    // Resolve meeting title if meeting was linked
    let sourceMeetingTitle: string | undefined
    if (validatedData.sourceMeetingId) {
      try {
        const meetingRecord = await base(AIRTABLE_TABLES.MEETINGS).find(validatedData.sourceMeetingId)
        sourceMeetingTitle = (meetingRecord.get('Title') as string) || (meetingRecord.get('Name') as string) || 'Untitled Meeting'
      } catch {
        // Fallback to lookup field if meeting fetch fails
        sourceMeetingTitle = (record as any).get('Source Meeting Title') as string | undefined
      }
    }

    const task = {
      id: (record as any).id,
      name: (record as any).get('Name') as string,
      description: (record as any).get('Description') as string | undefined,
      status: (record as any).get('Status') as string,
      priority: (record as any).get('Priority') as string,
      assigneeId: ((record as any).get('Assignee') as string[] | undefined)?.[0],
      assigneeName,
      dueDate: (record as any).get('Due Date') as string | undefined,
      companyId: ((record as any).get('Company') as string[] | undefined)?.[0],
      source: (record as any).get('Source') as string,
      sourceActionItemId: (record as any).get('Source Action Item ID') as string | undefined,
      sourceMeetingId: (record as any).get('Source Meeting ID') as string | undefined,
      sourceMeetingTitle,
      completedDate: (record as any).get('Completed Date') as string | undefined,
    }

    res.status(201).json({
      success: true,
      data: task,
    })
  })
)

/**
 * PATCH /api/v1/tasks/:id
 * Update a task
 */
router.patch(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params

    // Validate request body
    const validatedData = updateTaskSchema.parse(req.body)

    // Build Airtable fields
    const fields: Record<string, unknown> = {}

    if (validatedData.name !== undefined) {
      fields['Name'] = validatedData.name
    }
    if (validatedData.description !== undefined) {
      fields['Description'] = validatedData.description
    }
    if (validatedData.status !== undefined) {
      fields['Status'] = validatedData.status

      // Auto-set completed date when status changes to Done
      if (validatedData.status === TASKS.STATUS.DONE && !validatedData.completedDate) {
        fields['Completed Date'] = new Date().toISOString().split('T')[0]
      }
    }
    if (validatedData.priority !== undefined) {
      fields['Priority'] = validatedData.priority
    }
    if (validatedData.assigneeId !== undefined) {
      fields['Assignee'] = validatedData.assigneeId ? [validatedData.assigneeId] : []
    }
    if (validatedData.dueDate !== undefined) {
      fields['Due Date'] = validatedData.dueDate || null
    }
    if (validatedData.companyId !== undefined) {
      fields['Company'] = validatedData.companyId ? [validatedData.companyId] : []
    }
    if (validatedData.completedDate !== undefined) {
      fields['Completed Date'] = validatedData.completedDate || null
    }

    // Update in Airtable
    const base = getBase()

    try {
      const record = await base(AIRTABLE_TABLES.TASKS).update(id, { fields: fields as any })

      // Invalidate cache
      await cacheDeletePattern(`${CACHE.KEYS.TASKS}:*`)

      const task = {
        id: (record as any).id,
        name: (record as any).get('Name') as string,
        description: (record as any).get('Description') as string | undefined,
        status: (record as any).get('Status') as string,
        priority: (record as any).get('Priority') as string,
        assigneeId: ((record as any).get('Assignee') as string[] | undefined)?.[0],
        dueDate: (record as any).get('Due Date') as string | undefined,
        companyId: ((record as any).get('Company') as string[] | undefined)?.[0],
        source: (record as any).get('Source') as string,
        sourceActionItemId: (record as any).get('Source Action Item ID') as string | undefined,
        sourceMeetingId: (record as any).get('Source Meeting ID') as string | undefined,
        completedDate: (record as any).get('Completed Date') as string | undefined,
      }

      res.json({
        success: true,
        data: task,
      })
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 404) {
        throw new AppError('Task not found', 404)
      }
      throw error
    }
  })
)

/**
 * DELETE /api/v1/tasks/:id
 * Delete a task
 */
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params

    const base = getBase()

    try {
      await base(AIRTABLE_TABLES.TASKS).destroy(id)

      // Invalidate cache
      await cacheDeletePattern(`${CACHE.KEYS.TASKS}:*`)

      res.json({
        success: true,
        message: 'Task deleted successfully',
      })
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 404) {
        throw new AppError('Task not found', 404)
      }
      throw error
    }
  })
)

export default router
