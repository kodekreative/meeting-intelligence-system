import { Router, Request, Response } from 'express'
import { emailService } from '../services/email.service.js'
import { getAirtableClient } from '../lib/client.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { schedulerService } from '../services/scheduler.service.js'

const router = Router()

/**
 * POST /api/email/test
 * Send a test email to verify Resend configuration
 */
router.post('/test', asyncHandler(async (req: Request, res: Response) => {
  const { to } = req.body

  if (!to) {
    res.status(400).json({
      success: false,
      error: { message: 'Email recipient (to) is required' },
    })
    return
  }

  await emailService.sendEmail({
    to,
    subject: 'Test Email from Meeting Intelligence System',
    html: '<h1>Success!</h1><p>Your Resend email configuration is working correctly.</p>',
    text: 'Success! Your Resend email configuration is working correctly.',
  })

  res.json({
    success: true,
    data: { message: 'Test email sent successfully' },
  })
}))

/**
 * POST /api/email/daily-digest
 * Send complete daily digest email with meetings, tasks, issues
 */
router.post('/daily-digest', asyncHandler(async (req: Request, res: Response) => {
  const { to } = req.body

  if (!to) {
    res.status(400).json({
      success: false,
      error: { message: 'Email recipient (to) is required' },
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
    maxRecords: 20,
  })

  // Get action items
  const actionItems = await airtable.getActionItems({ maxRecords: 50 })

  // Process action items into categories
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

  // Get business issues (optional - may not have permissions)
  let businessIssues = []
  try {
    businessIssues = await airtable.getBusinessIssues({ status: 'Active' })
  } catch (error) {
    console.warn('Could not fetch business issues:', error)
  }

  const digestData = {
    todaysMeetings: meetings.map(m => ({
      title: m.fields.Title || m.fields.Name,
      startTime: m.fields['Start Time'],
      participants: m.fields.Participants,
      summary: m.fields['Meeting Summary'],
    })),
    actionItems: processedActionItems,
    followUps: [],
    businessIssues: businessIssues.slice(0, 10).map(issue => ({
      issueDescription: issue.fields['Issue Description'],
      companyName: issue.fields.Company?.[0],
      category: issue.fields.Category,
      severity: issue.fields.Severity,
    })),
    personalIntel: [],
  }

  await emailService.sendDailyDigest(to, digestData)

  res.json({
    success: true,
    data: {
      message: `Daily digest sent to ${to}`,
      summary: {
        meetings: digestData.todaysMeetings.length,
        actionItems: digestData.actionItems.length,
        issues: digestData.businessIssues.length,
      },
    },
  })
}))

/**
 * POST /api/email/trigger-digest
 * Manually trigger the daily digest (for testing)
 */
router.post('/trigger-digest', asyncHandler(async (req: Request, res: Response) => {
  await schedulerService.triggerDailyDigest()

  res.json({
    success: true,
    data: { message: 'Daily digest triggered successfully' },
  })
}))

/**
 * GET /api/email/scheduler-status
 * Get status of scheduled jobs
 */
router.get('/scheduler-status', asyncHandler(async (req: Request, res: Response) => {
  const status = schedulerService.getStatus()

  res.json({
    success: true,
    data: { jobs: status },
  })
}))

/**
 * POST /api/email/send-followups
 * Send follow-up status request emails for each assignee
 * All emails are sent to YOU for forwarding to team members
 */
router.post('/send-followups', asyncHandler(async (req: Request, res: Response) => {
  const { senderName = 'Peter', statusFilter } = req.body

  const userEmail = process.env.DAILY_DIGEST_EMAIL
  if (!userEmail) {
    res.status(400).json({
      success: false,
      error: { message: 'DAILY_DIGEST_EMAIL not configured in environment' },
    })
    return
  }

  const airtable = getAirtableClient()

  // Get all open/in-progress action items
  const actionItems = await airtable.getActionItems({ maxRecords: 100 })

  // Filter to non-complete items (or apply custom filter)
  const filteredItems = actionItems.filter(item => {
    const status = item.fields.Status
    if (statusFilter) {
      return statusFilter.includes(status)
    }
    return status !== 'Complete'
  })

  if (filteredItems.length === 0) {
    res.json({
      success: true,
      data: {
        message: 'No open action items found',
        emailsSent: 0,
        assignees: [],
      },
    })
    return
  }

  // Group action items by assignee
  const itemsByAssignee = new Map<string, {
    assigneeName: string
    items: Array<{
      taskDescription: string
      dueDate: string
      status: string
      priority: string
      meetingTitle: string
      meetingDate: string
      notes?: string
    }>
  }>()

  for (const item of filteredItems) {
    const assignee = item.fields.Assignee || 'Unassigned'

    if (!itemsByAssignee.has(assignee)) {
      itemsByAssignee.set(assignee, {
        assigneeName: assignee,
        items: [],
      })
    }

    // Get meeting details if available
    let meetingTitle = ''
    let meetingDate = ''
    let meetingSummary = ''

    if (item.fields['Source Meeting']?.[0]) {
      try {
        const meeting = await airtable.getMeeting(item.fields['Source Meeting'][0])
        if (meeting) {
          meetingTitle = meeting.fields.Title || meeting.fields.Name || ''
          meetingDate = meeting.fields['Start Time'] || ''
          meetingSummary = meeting.fields['Meeting Summary'] || ''
        }
      } catch (e) {
        // Meeting lookup failed, continue without it
      }
    }

    // Fallback to Title lookup field if available
    if (!meetingTitle && item.fields.Title?.[0]) {
      meetingTitle = item.fields.Title[0]
    }

    // Build context from meeting summary or action item notes
    // Truncate long summaries to first ~200 chars for email readability
    let context = ''
    if (meetingSummary) {
      // Take first 200 chars of meeting summary as context
      context = meetingSummary.length > 200
        ? meetingSummary.substring(0, 200).trim() + '...'
        : meetingSummary
    } else if (item.fields.Notes) {
      context = item.fields.Notes
    }

    itemsByAssignee.get(assignee)!.items.push({
      taskDescription: item.fields['Task Description'],
      dueDate: item.fields['Due Date'],
      status: item.fields.Status,
      priority: item.fields.Priority || 'Medium',
      meetingTitle,
      meetingDate,
      notes: context,
    })
  }

  // Send emails for each assignee
  const result = await emailService.sendFollowUpEmails(
    userEmail,
    itemsByAssignee,
    senderName
  )

  res.json({
    success: true,
    data: {
      message: `Sent ${result.emailsSent} follow-up email${result.emailsSent !== 1 ? 's' : ''} to ${userEmail}`,
      emailsSent: result.emailsSent,
      assignees: result.assignees,
      totalActionItems: filteredItems.length,
    },
  })
}))

/**
 * POST /api/email/send-followup-single
 * Send a follow-up email for ONE specific assignee (for testing)
 */
router.post('/send-followup-single', asyncHandler(async (req: Request, res: Response) => {
  const { assigneeName, senderName = 'Peter' } = req.body

  if (!assigneeName) {
    res.status(400).json({
      success: false,
      error: { message: 'assigneeName is required' },
    })
    return
  }

  const userEmail = process.env.DAILY_DIGEST_EMAIL
  if (!userEmail) {
    res.status(400).json({
      success: false,
      error: { message: 'DAILY_DIGEST_EMAIL not configured in environment' },
    })
    return
  }

  const airtable = getAirtableClient()

  // Get all action items for this specific assignee
  const actionItems = await airtable.getActionItems({ maxRecords: 100 })
  const filteredItems = actionItems.filter(item =>
    item.fields.Assignee === assigneeName && item.fields.Status !== 'Complete'
  )

  if (filteredItems.length === 0) {
    res.json({
      success: true,
      data: {
        message: `No open action items found for ${assigneeName}`,
        emailsSent: 0,
      },
    })
    return
  }

  // Build items list with meeting context
  const items: Array<{
    taskDescription: string
    dueDate: string
    status: string
    priority: string
    meetingTitle: string
    meetingDate: string
    notes?: string
  }> = []

  for (const item of filteredItems) {
    let meetingTitle = ''
    let meetingDate = ''
    let meetingSummary = ''

    if (item.fields['Source Meeting']?.[0]) {
      try {
        const meeting = await airtable.getMeeting(item.fields['Source Meeting'][0])
        if (meeting) {
          meetingTitle = meeting.fields.Title || meeting.fields.Name || ''
          meetingDate = meeting.fields['Start Time'] || ''
          meetingSummary = meeting.fields['Meeting Summary'] || ''
        }
      } catch (e) {
        // Meeting lookup failed
      }
    }

    if (!meetingTitle && item.fields.Title?.[0]) {
      meetingTitle = item.fields.Title[0]
    }

    let context = ''
    if (meetingSummary) {
      context = meetingSummary.length > 200
        ? meetingSummary.substring(0, 200).trim() + '...'
        : meetingSummary
    } else if (item.fields.Notes) {
      context = item.fields.Notes
    }

    items.push({
      taskDescription: item.fields['Task Description'],
      dueDate: item.fields['Due Date'],
      status: item.fields.Status,
      priority: item.fields.Priority || 'Medium',
      meetingTitle,
      meetingDate,
      notes: context,
    })
  }

  // Send single email
  const itemsByAssignee = new Map<string, { assigneeName: string; items: typeof items }>()
  itemsByAssignee.set(assigneeName, { assigneeName, items })

  const result = await emailService.sendFollowUpEmails(userEmail, itemsByAssignee, senderName)

  res.json({
    success: true,
    data: {
      message: `Sent follow-up email for ${assigneeName} to ${userEmail}`,
      emailsSent: result.emailsSent,
      actionItemCount: items.length,
    },
  })
}))

/**
 * GET /api/email/followup-preview
 * Preview the follow-up emails without sending (shows who would receive emails)
 */
router.get('/followup-preview', asyncHandler(async (req: Request, res: Response) => {
  const airtable = getAirtableClient()

  // Get all open/in-progress action items
  const actionItems = await airtable.getActionItems({ maxRecords: 100 })

  // Filter to non-complete items
  const filteredItems = actionItems.filter(item => item.fields.Status !== 'Complete')

  // Group by assignee
  const summary = new Map<string, number>()

  for (const item of filteredItems) {
    const assignee = item.fields.Assignee || 'Unassigned'
    summary.set(assignee, (summary.get(assignee) || 0) + 1)
  }

  const assigneeSummary = Array.from(summary.entries()).map(([name, count]) => ({
    assignee: name,
    actionItemCount: count,
  })).sort((a, b) => b.actionItemCount - a.actionItemCount)

  res.json({
    success: true,
    data: {
      totalAssignees: assigneeSummary.length,
      totalActionItems: filteredItems.length,
      assignees: assigneeSummary,
      note: 'Use POST /api/v1/email/send-followups to send the emails',
    },
  })
}))

/**
 * POST /api/email/yesterday-recap
 * Send an email summarizing all meetings from yesterday (or a specified date)
 */
router.post('/yesterday-recap', asyncHandler(async (req: Request, res: Response) => {
  const { date } = req.body // Optional: specific date in ISO format

  const userEmail = process.env.DAILY_DIGEST_EMAIL
  if (!userEmail) {
    res.status(400).json({
      success: false,
      error: { message: 'DAILY_DIGEST_EMAIL not configured in environment' },
    })
    return
  }

  const airtable = getAirtableClient()

  // Calculate "yesterday" - default to yesterday in local timezone, or use provided date
  // Use timezone-aware calculation to get correct local date
  const timezone = process.env.TIMEZONE || 'America/New_York'
  let targetDateStr: string
  if (date) {
    targetDateStr = date // Expected format: YYYY-MM-DD
  } else {
    // Get yesterday's date in the configured timezone
    const now = new Date()
    const localDateStr = now.toLocaleDateString('en-CA', { timeZone: timezone }) // en-CA gives YYYY-MM-DD format
    const [year, month, day] = localDateStr.split('-').map(Number)
    const yesterday = new Date(year, month - 1, day)
    yesterday.setDate(yesterday.getDate() - 1)
    targetDateStr = yesterday.toISOString().split('T')[0]
  }

  // Get meetings from that day (compare by date string to avoid timezone issues)
  const allMeetings = await airtable.getMeetings({ maxRecords: 50 })
  const yesterdayMeetings = allMeetings.filter(m => {
    const meetingDateStr = m.fields['Start Time']?.split('T')[0]
    return meetingDateStr === targetDateStr
  })

  const targetDate = new Date(targetDateStr)

  // Transform for email
  const meetingsForEmail = yesterdayMeetings.map(m => ({
    id: m.id,
    title: m.fields.Title || m.fields.Name || 'Untitled Meeting',
    startTime: m.fields['Start Time'],
    participants: m.fields.Participants ? (Array.isArray(m.fields.Participants) ? m.fields.Participants : [m.fields.Participants]) : [],
    summary: m.fields['Meeting Summary'],
    actionItems: m.fields['Action Items'],
    keyQuestions: Array.isArray(m.fields['Key Questions']) ? m.fields['Key Questions'].join(', ') : m.fields['Key Questions'],
    topics: Array.isArray(m.fields.Topics) ? m.fields.Topics.join(', ') : m.fields.Topics,
  }))

  await emailService.sendYesterdayRecapEmail(userEmail, meetingsForEmail, targetDate)

  res.json({
    success: true,
    data: {
      message: `Yesterday's recap email sent to ${userEmail}`,
      date: targetDate.toISOString().split('T')[0],
      meetingCount: meetingsForEmail.length,
      meetings: meetingsForEmail.map(m => m.title),
    },
  })
}))

/**
 * POST /api/email/prior-discussions
 * Send an email showing prior discussions for recurring meetings from yesterday
 */
router.post('/prior-discussions', asyncHandler(async (req: Request, res: Response) => {
  const { date } = req.body // Optional: specific date in ISO format

  const userEmail = process.env.DAILY_DIGEST_EMAIL
  if (!userEmail) {
    res.status(400).json({
      success: false,
      error: { message: 'DAILY_DIGEST_EMAIL not configured in environment' },
    })
    return
  }

  const airtable = getAirtableClient()

  // Calculate target date (yesterday by default) in local timezone
  const timezone = process.env.TIMEZONE || 'America/New_York'
  let targetDateStr: string
  if (date) {
    targetDateStr = date // Expected format: YYYY-MM-DD
  } else {
    // Get yesterday's date in the configured timezone
    const now = new Date()
    const localDateStr = now.toLocaleDateString('en-CA', { timeZone: timezone }) // en-CA gives YYYY-MM-DD format
    const [year, month, day] = localDateStr.split('-').map(Number)
    const yesterday = new Date(year, month - 1, day)
    yesterday.setDate(yesterday.getDate() - 1)
    targetDateStr = yesterday.toISOString().split('T')[0]
  }

  const targetDate = new Date(targetDateStr)

  // Get all meetings
  const allMeetings = await airtable.getMeetings({ maxRecords: 100 })

  // Find meetings from the target day (compare by date string)
  const targetDayMeetings = allMeetings.filter(m => {
    const meetingDateStr = m.fields['Start Time']?.split('T')[0]
    return meetingDateStr === targetDateStr
  })

  if (targetDayMeetings.length === 0) {
    res.json({
      success: true,
      data: {
        message: 'No meetings found for the specified date',
        date: targetDate.toISOString().split('T')[0],
        emailsSent: 0,
      },
    })
    return
  }

  // For each meeting from that day, find prior meetings with the same/similar name
  const emailsSent: string[] = []

  for (const meeting of targetDayMeetings) {
    const meetingTitle = meeting.fields.Title || meeting.fields.Name || ''
    if (!meetingTitle) continue

    // Find prior meetings with similar names (before the target date)
    const priorMeetings = allMeetings
      .filter(m => {
        const title = m.fields.Title || m.fields.Name || ''
        const meetingDateStr = m.fields['Start Time']?.split('T')[0] || ''
        // Match by similar title and before target date
        return title.toLowerCase().includes(meetingTitle.toLowerCase().split(' ')[0]) &&
               meetingDateStr < targetDateStr &&
               m.id !== meeting.id
      })
      .sort((a, b) => new Date(b.fields['Start Time']).getTime() - new Date(a.fields['Start Time']).getTime())
      .slice(0, 5) // Last 5 prior meetings

    if (priorMeetings.length === 0) continue

    // Transform for email
    const priorMeetingsForEmail = priorMeetings.map(m => ({
      id: m.id,
      title: m.fields.Title || m.fields.Name || 'Untitled Meeting',
      startTime: m.fields['Start Time'],
      summary: m.fields['Meeting Summary'],
      actionItems: m.fields['Action Items'],
      keyQuestions: Array.isArray(m.fields['Key Questions']) ? m.fields['Key Questions'].join(', ') : m.fields['Key Questions'],
    }))

    await emailService.sendPriorDiscussionsEmail(
      userEmail,
      meetingTitle,
      priorMeetingsForEmail,
      targetDate
    )

    emailsSent.push(meetingTitle)

    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 600))
  }

  res.json({
    success: true,
    data: {
      message: `Sent ${emailsSent.length} prior discussions email${emailsSent.length !== 1 ? 's' : ''} to ${userEmail}`,
      date: targetDate.toISOString().split('T')[0],
      emailsSent: emailsSent.length,
      meetings: emailsSent,
    },
  })
}))

/**
 * POST /api/email/todays-prep
 * Morning prep email - shows TODAY's meetings with AI-synthesized context from prior meetings
 * Sent at 6 AM to help you prepare for your day
 */
router.post('/todays-prep', asyncHandler(async (req: Request, res: Response) => {
  const { date } = req.body // Optional: specific date in ISO format

  const userEmail = process.env.DAILY_DIGEST_EMAIL
  if (!userEmail) {
    res.status(400).json({
      success: false,
      error: { message: 'DAILY_DIGEST_EMAIL not configured in environment' },
    })
    return
  }

  const airtable = getAirtableClient()
  const baseUrl = process.env.NEXT_PUBLIC_WEB_URL || process.env.WEB_URL || 'http://localhost:3000'

  // Calculate target date (today by default) in local timezone
  const timezone = process.env.TIMEZONE || 'America/New_York'
  let targetDateStr: string
  if (date) {
    targetDateStr = date // Expected format: YYYY-MM-DD
  } else {
    // Get today's date in the configured timezone
    const now = new Date()
    targetDateStr = now.toLocaleDateString('en-CA', { timeZone: timezone }) // YYYY-MM-DD format
  }

  // Parse the date string correctly to avoid timezone issues
  const [year, month, day] = targetDateStr.split('-').map(Number)
  const targetDate = new Date(year, month - 1, day)

  // Get all meetings
  const allMeetings = await airtable.getMeetings({ maxRecords: 200 })

  // Find meetings for today
  const todaysMeetings = allMeetings.filter(m => {
    const meetingDateStr = m.fields['Start Time']?.split('T')[0]
    return meetingDateStr === targetDateStr
  })

  if (todaysMeetings.length === 0) {
    // Send email even with no meetings
    await emailService.sendTodaysPrepEmail(userEmail, targetDate, [], baseUrl)
    res.json({
      success: true,
      data: {
        message: `Today's prep email sent to ${userEmail} (no meetings)`,
        date: targetDateStr,
        meetingCount: 0,
      },
    })
    return
  }

  // Get all action items for finding open items
  const allActionItems = await airtable.getActionItems({ maxRecords: 200 })

  // Get email preferences to filter out disabled assignees/tasks
  const emailPrefsMap = await airtable.getEmailPreferencesMap()

  // Filter action items: exclude completed, excluded from email, or disabled assignees
  const openActionItems = allActionItems.filter(item => {
    // Exclude completed items
    if (item.fields.Status === 'Complete') return false

    // Exclude items explicitly marked to not include in daily email
    if (item.fields['Include in Daily Email'] === false) return false

    // Exclude items for assignees who have email disabled
    const assignee = item.fields.Assignee
    if (assignee && emailPrefsMap.has(assignee) && emailPrefsMap.get(assignee) === false) {
      return false
    }

    return true
  })

  // Build the prep data for each meeting with detailed prior meeting summaries
  const meetingsWithContext: Array<{
    id: string
    title: string
    startTime: string
    participants?: string[]
    priorMeetings: Array<{
      id: string
      title: string
      startTime: string
      summary?: string
      actionItems?: string
      keyQuestions?: string
    }>
    openActionItems: Array<{
      id: string
      taskDescription: string
      assignee: string
      dueDate: string
      status: string
      priority: string
    }>
  }> = []

  for (const meeting of todaysMeetings) {
    const meetingTitle = meeting.fields.Title || meeting.fields.Name || ''
    if (!meetingTitle) continue

    // Find prior meetings with similar names (last 5)
    const firstWord = meetingTitle.toLowerCase().split(' ')[0]
    const priorMeetingsRaw = allMeetings
      .filter(m => {
        const title = m.fields.Title || m.fields.Name || ''
        const meetingDateStr = m.fields['Start Time']?.split('T')[0] || ''
        return title.toLowerCase().includes(firstWord) &&
               meetingDateStr < targetDateStr &&
               m.id !== meeting.id
      })
      .sort((a, b) => new Date(b.fields['Start Time']).getTime() - new Date(a.fields['Start Time']).getTime())
      .slice(0, 5) // Last 5 prior meetings

    // Transform prior meetings to include full details
    const priorMeetings = priorMeetingsRaw.map(m => ({
      id: m.id,
      title: m.fields.Title || m.fields.Name || 'Untitled Meeting',
      startTime: m.fields['Start Time'] || '',
      summary: m.fields['Meeting Summary'],
      actionItems: m.fields['Action Items'],
      keyQuestions: Array.isArray(m.fields['Key Questions'])
        ? m.fields['Key Questions'].join(', ')
        : m.fields['Key Questions'],
    }))

    // Find open action items related to this meeting series
    const relatedActionItems = openActionItems.filter(item => {
      if (item.fields['Source Meeting']?.[0]) {
        const sourceMeetingId = item.fields['Source Meeting'][0]
        const sourceMeeting = allMeetings.find(m => m.id === sourceMeetingId)
        if (sourceMeeting) {
          const sourceTitle = sourceMeeting.fields.Title || sourceMeeting.fields.Name || ''
          return sourceTitle.toLowerCase().includes(firstWord)
        }
      }
      if (item.fields.Title?.[0]) {
        return item.fields.Title[0].toLowerCase().includes(firstWord)
      }
      return false
    })

    meetingsWithContext.push({
      id: meeting.id,
      title: meetingTitle,
      startTime: meeting.fields['Start Time'] || '',
      participants: meeting.fields.Participants
        ? (Array.isArray(meeting.fields.Participants) ? meeting.fields.Participants : [meeting.fields.Participants])
        : [],
      priorMeetings,
      openActionItems: relatedActionItems.map(item => ({
        id: item.id,
        taskDescription: item.fields['Task Description'],
        assignee: item.fields.Assignee || 'Unassigned',
        dueDate: item.fields['Due Date'],
        status: item.fields.Status,
        priority: item.fields.Priority || 'Medium',
      })),
    })
  }

  // Sort by meeting time
  meetingsWithContext.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

  await emailService.sendTodaysPrepEmail(userEmail, targetDate, meetingsWithContext, baseUrl)

  res.json({
    success: true,
    data: {
      message: `Today's prep email sent to ${userEmail}`,
      date: targetDateStr,
      meetingCount: meetingsWithContext.length,
      meetings: meetingsWithContext.map(m => ({
        title: m.title,
        time: new Date(m.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        priorMeetingsCount: m.priorMeetings.length,
        openActionItems: m.openActionItems.length,
      })),
    },
  })
}))

/**
 * POST /api/email/tomorrows-prep
 * Send an email with tomorrow's meetings and ALL recent historical context for each
 * Includes: prior meeting summaries, action items from all recent meetings, open action items
 */
router.post('/tomorrows-prep', asyncHandler(async (req: Request, res: Response) => {
  const { date } = req.body // Optional: specific date in ISO format (for the "tomorrow" to prep for)

  const userEmail = process.env.DAILY_DIGEST_EMAIL
  if (!userEmail) {
    res.status(400).json({
      success: false,
      error: { message: 'DAILY_DIGEST_EMAIL not configured in environment' },
    })
    return
  }

  const airtable = getAirtableClient()

  // Calculate target date (tomorrow by default) in local timezone
  const timezone = process.env.TIMEZONE || 'America/New_York'
  let targetDateStr: string
  if (date) {
    targetDateStr = date // Expected format: YYYY-MM-DD
  } else {
    // Get tomorrow's date in the configured timezone
    const now = new Date()
    const localDateStr = now.toLocaleDateString('en-CA', { timeZone: timezone }) // en-CA gives YYYY-MM-DD format
    const [year, month, day] = localDateStr.split('-').map(Number)
    const tomorrow = new Date(year, month - 1, day)
    tomorrow.setDate(tomorrow.getDate() + 1)
    targetDateStr = tomorrow.toISOString().split('T')[0]
  }

  // Parse the date string correctly to avoid timezone issues
  // new Date('YYYY-MM-DD') parses as UTC, causing day-of-week errors
  const [year, month, day] = targetDateStr.split('-').map(Number)
  const targetDate = new Date(year, month - 1, day)

  // Determine lookback period - if Monday, look back to Friday (and weekend)
  // Otherwise look back to yesterday
  const dayOfWeek = targetDate.getDay() // 0 = Sunday, 1 = Monday, etc.
  let lookbackDays = 1 // Default: look back 1 day
  let lookbackLabel = 'yesterday'

  if (dayOfWeek === 1) {
    // Monday - look back to Friday (3 days) and include weekend
    lookbackDays = 3
    lookbackLabel = 'Friday & weekend'
  } else if (dayOfWeek === 0) {
    // Sunday - look back to Friday (2 days)
    lookbackDays = 2
    lookbackLabel = 'Friday & Saturday'
  }

  // Calculate the lookback date
  const lookbackDate = new Date(targetDate)
  lookbackDate.setDate(lookbackDate.getDate() - lookbackDays)
  const lookbackDateStr = lookbackDate.toISOString().split('T')[0]

  // Get all meetings
  const allMeetings = await airtable.getMeetings({ maxRecords: 200 })

  // Find meetings for the target day
  const tomorrowsMeetings = allMeetings.filter(m => {
    const meetingDateStr = m.fields['Start Time']?.split('T')[0]
    return meetingDateStr === targetDateStr
  })

  // Find ALL meetings from the lookback period (Friday through weekend for Monday)
  const recentMeetings = allMeetings.filter(m => {
    const meetingDateStr = m.fields['Start Time']?.split('T')[0] || ''
    return meetingDateStr >= lookbackDateStr && meetingDateStr < targetDateStr
  }).sort((a, b) => new Date(b.fields['Start Time']).getTime() - new Date(a.fields['Start Time']).getTime())

  if (tomorrowsMeetings.length === 0) {
    res.json({
      success: true,
      data: {
        message: 'No meetings found for the specified date',
        date: targetDateStr,
        emailsSent: 0,
      },
    })
    return
  }

  // Get all action items for finding open items
  const allActionItems = await airtable.getActionItems({ maxRecords: 200 })

  // Get email preferences to filter out disabled assignees/tasks
  const emailPrefsMap = await airtable.getEmailPreferencesMap()

  // Filter action items: exclude completed, excluded from email, or disabled assignees
  const openActionItems = allActionItems.filter(item => {
    // Exclude completed items
    if (item.fields.Status === 'Complete') return false

    // Exclude items explicitly marked to not include in daily email
    if (item.fields['Include in Daily Email'] === false) return false

    // Exclude items for assignees who have email disabled
    const assignee = item.fields.Assignee
    if (assignee && emailPrefsMap.has(assignee) && emailPrefsMap.get(assignee) === false) {
      return false
    }

    return true
  })

  // Build the prep data for each meeting
  const upcomingMeetings: Array<{
    id: string
    title: string
    startTime: string
    participants?: string[]
    priorMeetings: Array<{
      id: string
      title: string
      startTime: string
      summary?: string
      actionItems?: string
      keyQuestions?: string
    }>
    openActionItems: Array<{
      taskDescription: string
      assignee: string
      dueDate: string
      status: string
      priority: string
    }>
  }> = []

  for (const meeting of tomorrowsMeetings) {
    const meetingTitle = meeting.fields.Title || meeting.fields.Name || ''
    if (!meetingTitle) continue

    // Find ALL prior meetings with similar names (before the target date)
    // Use first word of title for matching recurring meetings
    const firstWord = meetingTitle.toLowerCase().split(' ')[0]
    const priorMeetings = allMeetings
      .filter(m => {
        const title = m.fields.Title || m.fields.Name || ''
        const meetingDateStr = m.fields['Start Time']?.split('T')[0] || ''
        // Match by similar title and before target date
        return title.toLowerCase().includes(firstWord) &&
               meetingDateStr < targetDateStr &&
               m.id !== meeting.id
      })
      .sort((a, b) => new Date(b.fields['Start Time']).getTime() - new Date(a.fields['Start Time']).getTime())
      .slice(0, 10) // Last 10 prior meetings for comprehensive history

    // Find open action items related to this meeting series
    const relatedActionItems = openActionItems.filter(item => {
      // Check if action item is from a meeting with similar name
      if (item.fields['Source Meeting']?.[0]) {
        const sourceMeetingId = item.fields['Source Meeting'][0]
        const sourceMeeting = allMeetings.find(m => m.id === sourceMeetingId)
        if (sourceMeeting) {
          const sourceTitle = sourceMeeting.fields.Title || sourceMeeting.fields.Name || ''
          return sourceTitle.toLowerCase().includes(firstWord)
        }
      }
      // Also check the Title lookup field
      if (item.fields.Title?.[0]) {
        return item.fields.Title[0].toLowerCase().includes(firstWord)
      }
      return false
    })

    upcomingMeetings.push({
      id: meeting.id,
      title: meetingTitle,
      startTime: meeting.fields['Start Time'],
      participants: meeting.fields.Participants
        ? (Array.isArray(meeting.fields.Participants) ? meeting.fields.Participants : [meeting.fields.Participants])
        : [],
      priorMeetings: priorMeetings.map(m => ({
        id: m.id,
        title: m.fields.Title || m.fields.Name || 'Untitled Meeting',
        startTime: m.fields['Start Time'],
        summary: m.fields['Meeting Summary'],
        actionItems: m.fields['Action Items'],
        keyQuestions: Array.isArray(m.fields['Key Questions']) ? m.fields['Key Questions'].join(', ') : m.fields['Key Questions'],
      })),
      openActionItems: relatedActionItems.map(item => ({
        taskDescription: item.fields['Task Description'],
        assignee: item.fields.Assignee || 'Unassigned',
        dueDate: item.fields['Due Date'],
        status: item.fields.Status,
        priority: item.fields.Priority || 'Medium',
      })),
    })
  }

  // Sort by meeting time
  upcomingMeetings.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

  // Transform recent meetings for the email
  const recentMeetingsForEmail = recentMeetings.map(m => ({
    id: m.id,
    title: m.fields.Title || m.fields.Name || 'Untitled Meeting',
    startTime: m.fields['Start Time'],
    summary: m.fields['Meeting Summary'],
    actionItems: m.fields['Action Items'],
    keyQuestions: Array.isArray(m.fields['Key Questions']) ? m.fields['Key Questions'].join(', ') : m.fields['Key Questions'],
  }))

  await emailService.sendTomorrowsPrepEmail(
    userEmail,
    targetDate,
    upcomingMeetings,
    recentMeetingsForEmail,
    lookbackLabel
  )

  res.json({
    success: true,
    data: {
      message: `Tomorrow's prep email sent to ${userEmail}`,
      date: targetDateStr,
      lookbackPeriod: lookbackLabel,
      recentMeetingsCount: recentMeetings.length,
      meetingCount: upcomingMeetings.length,
      meetings: upcomingMeetings.map(m => ({
        title: m.title,
        time: new Date(m.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        priorMeetings: m.priorMeetings.length,
        openActionItems: m.openActionItems.length,
      })),
    },
  })
}))

export default router
