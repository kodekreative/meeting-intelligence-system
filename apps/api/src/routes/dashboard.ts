/**
 * Dashboard Routes
 */

import { Router, Request, Response } from 'express'
import { getAirtableClient } from '../lib/client.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { cacheGet, cacheSet } from '../utils/redis.js'
import { CACHE } from '../shared/constants.js'

const router = Router()

/**
 * GET /api/v1/dashboard/today
 * Get today's dashboard data
 */
router.get(
  '/today',
  asyncHandler(async (req: Request, res: Response) => {
    // Try cache first
    const cacheKey = `${CACHE.KEYS.DASHBOARD}:today:${new Date().toISOString().split('T')[0]}`
    const cached = await cacheGet(cacheKey)
    if (cached) {
      res.json({
        success: true,
        data: cached,
        meta: { cached: true },
      })
      return
    }

    const airtable = getAirtableClient()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Fetch today's meetings
    const meetings = await airtable.getMeetings({
      fromDate: today,
      toDate: tomorrow,
    })

    // Fetch action items due today
    const actionItemsDueToday = await airtable.getActionItems({
      dueAfter: today,
      dueBefore: tomorrow,
    })

    // Fetch overdue action items
    const overdueItems = await airtable.getActionItems({
      dueBefore: today,
      status: 'Open',
    })

    // Fetch action items due this week
    const weekFromNow = new Date(today)
    weekFromNow.setDate(weekFromNow.getDate() + 7)
    const actionItemsThisWeek = await airtable.getActionItems({
      dueAfter: tomorrow,
      dueBefore: weekFromNow,
    })

    // Fetch active business issues
    const businessIssues = await airtable.getBusinessIssues({
      status: 'Active',
    })

    // Fetch personal intelligence with reminders for today
    const personalIntel = await airtable.getPersonalIntelligence({
      status: 'Pending',
    })

    // Build dashboard response
    const dashboard = {
      meetings: meetings.map((m) => ({
        id: m.id,
        meetingDate: m.fields['Meeting Date'],
        title: m.fields.Name,
        participants: m.fields.Participants?.split(',').map((p) => p.trim()) || [],
        companyId: m.fields.Company?.[0],
        summary: m.fields.Summary,
        topics: m.fields.Topics || [],
      })),
      myActionItems: {
        dueToday: actionItemsDueToday.map((item) => ({
          id: item.id,
          taskDescription: item.fields['Task Description'],
          dueDate: item.fields['Due Date'],
          status: item.fields.Status,
          priority: item.fields.Priority,
        })),
        overdue: overdueItems.map((item) => ({
          id: item.id,
          taskDescription: item.fields['Task Description'],
          dueDate: item.fields['Due Date'],
          status: item.fields.Status,
          priority: item.fields.Priority,
        })),
        dueThisWeek: actionItemsThisWeek.map((item) => ({
          id: item.id,
          taskDescription: item.fields['Task Description'],
          dueDate: item.fields['Due Date'],
          status: item.fields.Status,
          priority: item.fields.Priority,
        })),
      },
      businessIssues: businessIssues.slice(0, 5).map((issue) => ({
        id: issue.id,
        issueDescription: issue.fields['Issue Description'],
        companyId: issue.fields.Company[0],
        category: issue.fields.Category,
        severity: issue.fields.Severity,
        dateIdentified: issue.fields['Date Identified'],
      })),
      personalFollowUps: personalIntel.slice(0, 5).map((intel) => ({
        id: intel.id,
        contactId: intel.fields.Contact[0],
        detailDescription: intel.fields['Detail Description'],
        category: intel.fields.Category,
        reminderDate: intel.fields['Reminder Date'],
      })),
    }

    // Cache for short time
    await cacheSet(cacheKey, dashboard, CACHE.TTL.SHORT)

    res.json({
      success: true,
      data: dashboard,
      meta: {
        date: today.toISOString(),
        cached: false,
      },
    })
  })
)

export default router
