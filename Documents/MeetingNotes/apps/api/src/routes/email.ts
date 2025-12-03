/**
 * Email Routes
 * API endpoints for sending daily digest emails
 */

import { Router, Request, Response } from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { emailService } from '../services/email.js'
import { getAirtableClient } from '../lib/client.js'

const router = Router()

/**
 * POST /api/v1/email/test
 * Send a test email with sample data
 */
router.post(
  '/test',
  asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body

    if (!email) {
      res.status(400).json({
        success: false,
        error: { message: 'Email address is required' },
      })
      return
    }

    // Get real data from Airtable
    const airtable = getAirtableClient()

    // Get today's meetings
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const meetings = await airtable.getMeetings({
      fromDate: today,
      toDate: tomorrow,
      maxRecords: 10,
    })

    // Get action items
    const actionItems = await airtable.getActionItems({ maxRecords: 20 })

    // Process action items
    const processedActionItems = actionItems.map(item => {
      const dueDate = item.fields['Due Date'] ? new Date(item.fields['Due Date']) : null
      const now = new Date()
      const isOverdue = dueDate && dueDate < now && item.fields.Status !== 'Complete'
      const isDueToday = dueDate && dueDate.toDateString() === now.toDateString()
      const weekFromNow = new Date(now)
      weekFromNow.setDate(weekFromNow.getDate() + 7)
      const isDueThisWeek = dueDate && dueDate > now && dueDate <= weekFromNow

      return {
        taskDescription: item.fields['Task Description'],
        assignee: item.fields.Assignee,
        dueDate: item.fields['Due Date'],
        status: item.fields.Status,
        priority: item.fields.Priority,
        sourceMeetingTitle: item.fields.Title?.[0],
        overdue: isOverdue,
        dueToday: isDueToday,
        dueThisWeek: isDueThisWeek && !isDueToday && !isOverdue,
      }
    }).filter(item => item.overdue || item.dueToday || item.dueThisWeek)

    // Get business issues
    const businessIssues = await airtable.getBusinessIssues({ status: 'Active' })

    const digestData = {
      todaysMeetings: meetings.map(m => ({
        title: m.fields.Title || m.fields.Name,
        startTime: m.fields['Start Time'],
        participants: m.fields.Participants,
        summary: m.fields['Meeting Summary'],
      })),
      actionItems: processedActionItems,
      followUps: [],
      businessIssues: businessIssues.slice(0, 5).map(issue => ({
        issueDescription: issue.fields['Issue Description'],
        companyName: issue.fields.Company?.[0],
        category: issue.fields.Category,
        severity: issue.fields.Severity,
      })),
      personalIntel: [],
    }

    await emailService.sendDailyDigest(email, digestData)

    res.json({
      success: true,
      data: {
        message: `Test email sent to ${email}`,
        summary: {
          meetings: digestData.todaysMeetings.length,
          actionItems: digestData.actionItems.length,
          issues: digestData.businessIssues.length,
        },
      },
    })
  })
)

/**
 * POST /api/v1/email/daily-digest
 * Generate and send daily digest for a user
 */
router.post(
  '/daily-digest',
  asyncHandler(async (req: Request, res: Response) => {
    const { email, userId } = req.body

    if (!email) {
      res.status(400).json({
        success: false,
        error: { message: 'Email address is required' },
      })
      return
    }

    // TODO: Get user preferences from Airtable
    // TODO: Filter data based on user's role and permissions

    res.json({
      success: true,
      data: { message: 'Daily digest sent successfully' },
    })
  })
)

export default router
