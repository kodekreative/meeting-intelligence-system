/**
 * Scheduler Service
 * Manages scheduled jobs for daily digest emails and other recurring tasks
 */

import cron from 'node-cron'
import { emailService } from './email.service.js'
import { calendarService } from './calendar.service.js'
import { icalendarService } from './icalendar.service.js'
import { getAirtableClient } from '../lib/client.js'
import { logger } from '../utils/logger.js'

interface ScheduledJob {
  name: string
  schedule: string
  task: cron.ScheduledTask
}

class SchedulerService {
  private jobs: Map<string, ScheduledJob> = new Map()

  /**
   * Initialize all scheduled jobs
   */
  initialize(): void {
    logger.info('Initializing scheduled jobs...')

    // Daily digest email at 6:00 AM (Monday-Friday)
    this.scheduleDailyDigest()

    // Per-person task emails at 6:30 AM (Monday-Friday)
    this.schedulePerPersonTaskEmails()

    // iCalendar sync every morning at 7:00 AM
    this.scheduleICalendarSync()

    logger.info(`✓ Scheduled ${this.jobs.size} jobs`)
  }

  /**
   * Schedule daily prep email
   * Runs at 6:00 AM every weekday - morning briefing with today's meetings
   */
  private scheduleDailyDigest(): void {
    const schedule = process.env.DAILY_DIGEST_SCHEDULE || '0 6 * * 1-5' // 6 AM Mon-Fri
    const timezone = process.env.TIMEZONE || 'America/New_York'

    const task = cron.schedule(
      schedule,
      async () => {
        try {
          logger.info('Running daily prep job...')
          await this.sendTodaysPrep()
          logger.info('✓ Daily prep job completed')
        } catch (error) {
          logger.error('✗ Daily prep job failed:', error)
        }
      },
      {
        scheduled: true,
        timezone,
      }
    )

    this.jobs.set('daily-digest', {
      name: 'Daily Prep Email',
      schedule,
      task,
    })

    logger.info(`✓ Scheduled daily prep: ${schedule} (${timezone})`)
  }

  /**
   * Send today's prep email - clean morning briefing with meetings and context
   * Uses AI to combine prior meeting summaries into actionable insights
   */
  private async sendTodaysPrep(): Promise<void> {
    const airtable = getAirtableClient()
    const baseUrl = process.env.NEXT_PUBLIC_WEB_URL || process.env.WEB_URL || 'http://localhost:3000'

    // Get current date in configured timezone
    const timezone = process.env.TIMEZONE || 'America/New_York'
    const now = new Date()
    const localDateStr = now.toLocaleDateString('en-CA', { timeZone: timezone }) // YYYY-MM-DD format
    const [year, month, day] = localDateStr.split('-').map(Number)
    const today = new Date(year, month - 1, day)

    // Get recipient email from environment variable
    const recipientEmail = process.env.DAILY_DIGEST_EMAIL
    if (!recipientEmail) {
      throw new Error('DAILY_DIGEST_EMAIL not configured')
    }

    // Get all meetings
    const allMeetings = await airtable.getMeetings({ maxRecords: 200 })

    // Find today's meetings
    const todaysMeetings = allMeetings.filter(m => {
      const meetingDateStr = m.fields['Start Time']?.split('T')[0]
      return meetingDateStr === localDateStr
    })

    // Get all action items for finding open items
    const allActionItems = await airtable.getActionItems({ maxRecords: 200 })
    const openActionItems = allActionItems.filter(item => item.fields.Status !== 'Complete')

    // Build the prep data for each meeting
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
                 meetingDateStr < localDateStr &&
                 m.id !== meeting.id
        })
        .sort((a, b) => new Date(b.fields['Start Time']).getTime() - new Date(a.fields['Start Time']).getTime())
        .slice(0, 5)

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

    // Send the prep email
    await emailService.sendTodaysPrepEmail(recipientEmail, today, meetingsWithContext, baseUrl)

    logger.info(`Daily prep sent to ${recipientEmail}`, {
      meetings: meetingsWithContext.length,
    })
  }

  /**
   * Schedule per-person task emails
   * Runs at 6:30 AM every weekday - sends separate email for each person with their outstanding tasks
   */
  private schedulePerPersonTaskEmails(): void {
    const schedule = process.env.TASK_EMAIL_SCHEDULE || '30 6 * * 1-5' // 6:30 AM Mon-Fri
    const timezone = process.env.TIMEZONE || 'America/New_York'

    const task = cron.schedule(
      schedule,
      async () => {
        try {
          logger.info('Running per-person task emails job...')
          await this.sendPerPersonTaskEmails()
          logger.info('✓ Per-person task emails job completed')
        } catch (error) {
          logger.error('✗ Per-person task emails job failed:', error)
        }
      },
      {
        scheduled: true,
        timezone,
      }
    )

    this.jobs.set('per-person-tasks', {
      name: 'Per-Person Task Emails',
      schedule,
      task,
    })

    logger.info(`✓ Scheduled per-person task emails: ${schedule} (${timezone})`)
  }

  /**
   * Send per-person task emails - separate email for each assignee with their outstanding tasks
   * Uses the Tasks table for task data
   */
  private async sendPerPersonTaskEmails(): Promise<void> {
    const airtable = getAirtableClient()

    // Get recipient email from environment variable
    const recipientEmail = process.env.DAILY_DIGEST_EMAIL
    if (!recipientEmail) {
      throw new Error('DAILY_DIGEST_EMAIL not configured')
    }

    const senderName = process.env.SENDER_NAME || 'Peter'

    // Get all tasks from Airtable Tasks table
    const tasks = await airtable.findRecords('Tasks', {
      filterByFormula: `AND({Status} != "Done", LEN({Assignee Name}) > 0)`,
    })

    if (tasks.length === 0) {
      logger.info('No outstanding tasks found, skipping per-person emails')
      return
    }

    // Get email preferences to filter out disabled assignees
    const emailPrefsMap = await airtable.getEmailPreferencesMap()

    // Group tasks by assignee
    const tasksByAssignee = new Map<string, {
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

    // Get all meetings for context lookup
    const allMeetings = await airtable.getMeetings({ maxRecords: 200 })
    const meetingMap = new Map(allMeetings.map(m => [m.id, m]))

    for (const task of tasks) {
      const assigneeName = task.fields['Assignee Name'] as string
      if (!assigneeName) continue

      // Skip assignees who have email disabled
      if (emailPrefsMap.has(assigneeName) && emailPrefsMap.get(assigneeName) === false) {
        continue
      }

      if (!tasksByAssignee.has(assigneeName)) {
        tasksByAssignee.set(assigneeName, {
          assigneeName,
          items: [],
        })
      }

      // Get meeting context if available
      let meetingTitle = task.fields['Source Meeting Title'] as string || ''
      let meetingDate = ''

      const sourceMeetingId = task.fields['Source Meeting ID'] as string
      if (sourceMeetingId && meetingMap.has(sourceMeetingId)) {
        const meeting = meetingMap.get(sourceMeetingId)!
        if (!meetingTitle) {
          meetingTitle = meeting.fields.Title || meeting.fields.Name || ''
        }
        meetingDate = meeting.fields['Start Time'] || ''
      }

      tasksByAssignee.get(assigneeName)!.items.push({
        taskDescription: task.fields.Name as string,
        dueDate: task.fields['Due Date'] as string || '',
        status: task.fields.Status as string,
        priority: task.fields.Priority as string || 'Medium',
        meetingTitle,
        meetingDate,
        notes: task.fields.Description as string,
      })
    }

    if (tasksByAssignee.size === 0) {
      logger.info('No assignees with tasks to email (all filtered out)')
      return
    }

    // Send emails using the email service
    const result = await emailService.sendFollowUpEmails(
      recipientEmail,
      tasksByAssignee,
      senderName
    )

    logger.info(`Per-person task emails sent: ${result.emailsSent} emails to ${recipientEmail}`, {
      assignees: result.assignees,
    })
  }

  /**
   * Manually trigger per-person task emails (for testing)
   */
  async triggerPerPersonTaskEmails(): Promise<{ emailsSent: number; assignees: string[] }> {
    logger.info('Manually triggering per-person task emails...')
    await this.sendPerPersonTaskEmails()
    return { emailsSent: 0, assignees: [] } // Return value handled inside
  }

  /**
   * Schedule calendar sync
   * Runs every hour to keep calendars up-to-date
   */
  private scheduleCalendarSync(): void {
    const schedule = process.env.CALENDAR_SYNC_SCHEDULE || '0 * * * *' // Every hour
    const timezone = process.env.TIMEZONE || 'America/Los_Angeles'

    const task = cron.schedule(
      schedule,
      async () => {
        try {
          logger.info('Running calendar sync job...')
          await this.syncAllUserCalendars()
          logger.info('✓ Calendar sync job completed')
        } catch (error) {
          logger.error('✗ Calendar sync job failed:', error)
        }
      },
      {
        scheduled: true,
        timezone,
      }
    )

    this.jobs.set('calendar-sync', {
      name: 'Calendar Sync',
      schedule,
      task,
    })

    logger.info(`✓ Scheduled calendar sync: ${schedule} (${timezone})`)
  }

  /**
   * Schedule iCalendar sync
   * Runs every morning at 7:00 AM to keep calendars up-to-date
   */
  private scheduleICalendarSync(): void {
    const schedule = process.env.ICALENDAR_SYNC_SCHEDULE || '0 7 * * *' // 7 AM daily
    const timezone = process.env.TIMEZONE || 'America/New_York'

    const task = cron.schedule(
      schedule,
      async () => {
        try {
          logger.info('Running iCalendar sync job...')
          await this.syncAllICalendarUsers()
          logger.info('✓ iCalendar sync job completed')
        } catch (error) {
          logger.error('✗ iCalendar sync job failed:', error)
        }
      },
      {
        scheduled: true,
        timezone,
      }
    )

    this.jobs.set('icalendar-sync', {
      name: 'iCalendar Sync',
      schedule,
      task,
    })

    logger.info(`✓ Scheduled iCalendar sync: ${schedule} (${timezone})`)
  }

  /**
   * Sync iCalendar for all users with connected calendars
   */
  private async syncAllICalendarUsers(): Promise<void> {
    const airtable = getAirtableClient()

    try {
      // Get all users with iCalendar URL configured
      const users = await airtable.findRecords('Users', {
        filterByFormula: `AND({Calendar Connected} = TRUE(), LEN({iCalendar URL}) > 0)`,
      })

      logger.info(`Found ${users.length} users with iCalendar configured`)

      let successCount = 0
      let failCount = 0
      let totalEventsSynced = 0

      for (const user of users) {
        try {
          const userId = user.id
          const icalUrl = user.fields['iCalendar URL'] as string

          if (icalUrl) {
            const result = await icalendarService.syncFromICalURL(userId, icalUrl)
            if (result.success) {
              successCount++
              totalEventsSynced += result.eventsSynced
              logger.info(`Synced iCalendar for user ${userId}: ${result.eventsSynced} events (${result.eventsCreated} created, ${result.eventsUpdated} updated)`)
            } else {
              failCount++
              logger.warn(`iCalendar sync had errors for user ${userId}:`, result.errors)
            }
          } else {
            logger.warn(`No iCalendar URL for user ${userId}, skipping`)
          }
        } catch (error) {
          failCount++
          logger.error(`Failed to sync iCalendar for user ${user.id}:`, error)
        }
      }

      logger.info(`iCalendar sync completed: ${successCount} succeeded, ${failCount} failed, ${totalEventsSynced} total events synced`)
    } catch (error) {
      logger.error('Failed to sync iCalendars:', error)
      throw error
    }
  }

  /**
   * Sync calendars for all users with connected calendars (OAuth-based - deprecated)
   */
  private async syncAllUserCalendars(): Promise<void> {
    const airtable = getAirtableClient()

    try {
      // Get all active users with calendar connected
      const users = await airtable.findRecords('Users', {
        filterByFormula: `AND({Is Active} = TRUE(), {Calendar Connected} = TRUE())`,
      })

      logger.info(`Found ${users.length} users with connected calendars`)

      let successCount = 0
      let failCount = 0

      for (const user of users) {
        try {
          const userId = user.id
          const accessToken = await calendarService.getUserAccessToken(userId)

          if (accessToken) {
            const result = await calendarService.syncCalendarEvents(userId, accessToken)
            if (result.success) {
              successCount++
              logger.info(`Synced calendar for user ${userId}: ${result.eventsSynced} events`)
            } else {
              failCount++
              logger.warn(`Calendar sync had errors for user ${userId}:`, result.errors)
            }
          } else {
            logger.warn(`No valid access token for user ${userId}, skipping`)
          }
        } catch (error) {
          failCount++
          logger.error(`Failed to sync calendar for user ${user.id}:`, error)
        }
      }

      logger.info(`Calendar sync completed: ${successCount} succeeded, ${failCount} failed`)
    } catch (error) {
      logger.error('Failed to sync user calendars:', error)
      throw error
    }
  }

  /**
   * Manually trigger daily digest (for testing)
   */
  async triggerDailyDigest(): Promise<void> {
    logger.info('Manually triggering daily prep...')
    await this.sendTodaysPrep()
  }

  /**
   * Manually trigger calendar sync for a specific user
   */
  async triggerCalendarSync(userId: string): Promise<void> {
    logger.info(`Manually triggering calendar sync for user ${userId}...`)
    const accessToken = await calendarService.getUserAccessToken(userId)

    if (!accessToken) {
      throw new Error('No valid access token found. Please reconnect your calendar.')
    }

    const result = await calendarService.syncCalendarEvents(userId, accessToken)
    logger.info(`Calendar sync result:`, result)
  }

  /**
   * Stop all scheduled jobs
   */
  shutdown(): void {
    logger.info('Stopping scheduled jobs...')
    this.jobs.forEach((job) => {
      job.task.stop()
    })
    this.jobs.clear()
    logger.info('✓ All scheduled jobs stopped')
  }

  /**
   * Get status of all scheduled jobs
   */
  getStatus(): Array<{ name: string; schedule: string; running: boolean }> {
    return Array.from(this.jobs.values()).map((job) => ({
      name: job.name,
      schedule: job.schedule,
      running: true, // Cron tasks are running if they're in the map
    }))
  }
}

export const schedulerService = new SchedulerService()
