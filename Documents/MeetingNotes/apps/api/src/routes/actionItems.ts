/**
 * Action Items Routes
 */

import { Router, Request, Response } from 'express'
import { getAirtableClient } from '../lib/client.js'
import { asyncHandler, AppError } from '../middleware/errorHandler.js'
import { cacheGet, cacheSet, cacheDelete } from '../utils/redis.js'
import { CACHE } from '../shared/constants.js'
import { updateActionItemSchema } from '../shared/schemas.js'

const router = Router()

/**
 * GET /api/v1/action-items
 * Get all action items with optional filtering
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { assigneeId, status, dueBefore, dueAfter } = req.query

    // Build cache key
    const cacheKey = `${CACHE.KEYS.ACTION_ITEMS}:${JSON.stringify(req.query)}`

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

    // Fetch from Airtable
    const airtable = getAirtableClient()
    const actionItems = await airtable.getActionItems({
      assigneeId: assigneeId as string | undefined,
      status: status as string | undefined,
      dueBefore: dueBefore ? new Date(dueBefore as string) : undefined,
      dueAfter: dueAfter ? new Date(dueAfter as string) : undefined,
    })

    // Transform to API response format
    const transformedItems = actionItems.map((item) => ({
      id: item.id,
      taskDescription: item.fields['Task Description'],
      assignee: item.fields.Assignee,
      dueDate: item.fields['Due Date'],
      status: item.fields.Status,
      priority: item.fields.Priority,
      sourceMeetingId: item.fields['Source Meeting']?.[0],
      sourceMeetingTitle: item.fields.Title?.[0], // Lookup field returns array
      companyId: item.fields.Company?.[0],
      completedAt: item.fields['Completed At'],
      lastFollowedUp: item.fields['Last Followed Up'],
      extractionConfidence: item.fields['Extraction Confidence'],
      createdAt: item.fields.Created,
    }))

    // Cache the result
    await cacheSet(cacheKey, transformedItems, CACHE.TTL.SHORT)

    res.json({
      success: true,
      data: transformedItems,
      meta: {
        count: transformedItems.length,
        cached: false,
      },
    })
  })
)

/**
 * PATCH /api/v1/action-items/:id
 * Update an action item
 */
router.patch(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params

    // Validate request body
    const validatedData = updateActionItemSchema.parse(req.body)

    // Map to Airtable field names
    const updates: Record<string, unknown> = {}
    if (validatedData.taskDescription !== undefined) {
      updates['Task Description'] = validatedData.taskDescription
    }
    if (validatedData.assignee !== undefined) {
      updates['Assignee'] = validatedData.assignee
    }
    if (validatedData.status !== undefined) {
      updates['Status'] = validatedData.status
    }
    if (validatedData.priority !== undefined) {
      updates['Priority'] = validatedData.priority
    }
    if (validatedData.dueDate !== undefined) {
      updates['Due Date'] = validatedData.dueDate
    }
    if (validatedData.notes !== undefined) {
      updates['Notes'] = validatedData.notes
    }

    // Update in Airtable
    const airtable = getAirtableClient()
    await airtable.updateActionItem(id, updates)

    // Invalidate cache
    await cacheDelete(`${CACHE.KEYS.ACTION_ITEMS}:${id}`)

    res.json({
      success: true,
      data: { id, ...validatedData },
    })
  })
)

/**
 * GET /api/v1/action-items/my-tasks
 * Get current user's action items grouped by due date
 */
router.get(
  '/filter/my-tasks',
  asyncHandler(async (req: Request, res: Response) => {
    // TODO: Get user ID from auth token
    // For now, return sample structure
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const weekFromNow = new Date(today)
    weekFromNow.setDate(weekFromNow.getDate() + 7)

    const airtable = getAirtableClient()

    // Get overdue items
    const overdue = await airtable.getActionItems({
      dueBefore: today,
      status: 'Open',
    })

    // Get items due today
    const dueToday = await airtable.getActionItems({
      dueAfter: today,
      dueBefore: new Date(today.getTime() + 24 * 60 * 60 * 1000),
    })

    // Get items due this week
    const dueThisWeek = await airtable.getActionItems({
      dueAfter: today,
      dueBefore: weekFromNow,
    })

    res.json({
      success: true,
      data: {
        overdue: overdue.map((item) => ({
          id: item.id,
          taskDescription: item.fields['Task Description'],
          dueDate: item.fields['Due Date'],
          status: item.fields.Status,
          priority: item.fields.Priority,
        })),
        dueToday: dueToday.map((item) => ({
          id: item.id,
          taskDescription: item.fields['Task Description'],
          dueDate: item.fields['Due Date'],
          status: item.fields.Status,
          priority: item.fields.Priority,
        })),
        dueThisWeek: dueThisWeek.map((item) => ({
          id: item.id,
          taskDescription: item.fields['Task Description'],
          dueDate: item.fields['Due Date'],
          status: item.fields.Status,
          priority: item.fields.Priority,
        })),
      },
    })
  })
)

export default router
