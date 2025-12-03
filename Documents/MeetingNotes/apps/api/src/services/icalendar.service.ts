/**
 * iCalendar Service
 * Handles syncing calendar events from Outlook.com iCalendar URL
 * NO OAuth required - just calendar URL
 */

import ical from 'ical'
import RRule from 'rrule'

import { getAirtableClient } from '../lib/client.js'
import { logger } from '../utils/logger.js'

interface ICalEvent {
  id: string
  subject: string
  startTime: Date
  endTime: Date
  location?: string
  description?: string
  organizer?: string
  attendees: string[]
}

interface SyncResult {
  success: boolean
  eventsSynced: number
  eventsCreated: number
  eventsUpdated: number
  errors: string[]
}

class ICalendarService {
  /**
   * Sync calendar events from iCalendar URL
   */
  async syncFromICalURL(userId: string, icalUrl: string): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      eventsSynced: 0,
      eventsCreated: 0,
      eventsUpdated: 0,
      errors: [],
    }

    try {
      // Fetch iCal data
      const response = await globalThis.fetch(icalUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch calendar: ${response.statusText}`)
      }

      const icalData = await response.text()
      const events = await this.parseICalData(icalData)

      logger.info(`Parsed ${events.length} events from iCalendar URL`)

      // Filter to only upcoming events (next 30 days)
      const now = new Date()
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(now.getDate() + 30)

      const upcomingEvents = events.filter(
        event => event.startTime >= now && event.startTime <= thirtyDaysFromNow
      )

      logger.info(`Found ${upcomingEvents.length} upcoming events`)

      // Save each event
      for (const event of upcomingEvents) {
        try {
          const created = await this.saveCalendarEvent(userId, event)
          if (created) {
            result.eventsCreated++
          } else {
            result.eventsUpdated++
          }
          result.eventsSynced++
        } catch (error) {
          const errorMsg = `Failed to save event ${event.subject}: ${error}`
          logger.error(errorMsg)
          result.errors.push(errorMsg)
        }
      }

      // Update user's last sync time
      await this.updateLastSyncTime(userId)

      result.success = true
      logger.info(`iCalendar sync completed for user ${userId}: ${result.eventsSynced} events synced`)

      return result
    } catch (error) {
      const errorMsg = `iCalendar sync failed for user ${userId}: ${error}`
      logger.error(errorMsg)
      result.errors.push(errorMsg)
      return result
    }
  }

  /**
   * Parse iCalendar data and expand recurring events
   */
  private async parseICalData(icalData: string): Promise<ICalEvent[]> {
    return new Promise((resolve, reject) => {
      try {
        const parsedData = ical.parseICS(icalData)
        const events: ICalEvent[] = []
        const now = new Date()
        const futureLimit = new Date()
        futureLimit.setDate(futureLimit.getDate() + 90) // Get 90 days of future events

        for (const k in parsedData) {
          const event = parsedData[k]

          if (event.type === 'VEVENT') {
            // Check if this is a recurring event
            if (event.rrule) {
              try {
                // Parse the recurrence rule string
                const rruleStr = event.rrule.toString()
                const rule = RRule.rrulestr(rruleStr)

                // Get occurrences between now and future limit
                const occurrences = rule.between(now, futureLimit, true)

                // Create an event for each occurrence
                occurrences.forEach((occurrence, index) => {
                  const duration = event.end.getTime() - event.start.getTime()
                  const occurrenceEnd = new Date(occurrence.getTime() + duration)

                  events.push({
                    id: `${event.uid || k}-${occurrence.getTime()}`,
                    subject: event.summary || 'Untitled Event',
                    startTime: occurrence,
                    endTime: occurrenceEnd,
                    location: event.location,
                    description: event.description,
                    organizer: event.organizer?.val || event.organizer,
                    attendees: event.attendee ?
                      (Array.isArray(event.attendee) ?
                        event.attendee.map(a => a.val || a) :
                        [event.attendee.val || event.attendee]
                      ) : [],
                  })
                })
              } catch (rruleError) {
                logger.warn(`Failed to parse RRULE for event ${event.summary}: ${rruleError}`)
                // Fall back to single event
                events.push({
                  id: event.uid || k,
                  subject: event.summary || 'Untitled Event',
                  startTime: new Date(event.start),
                  endTime: new Date(event.end),
                  location: event.location,
                  description: event.description,
                  organizer: event.organizer?.val || event.organizer,
                  attendees: event.attendee ?
                    (Array.isArray(event.attendee) ?
                      event.attendee.map(a => a.val || a) :
                      [event.attendee.val || event.attendee]
                    ) : [],
                })
              }
            } else {
              // Non-recurring event
              events.push({
                id: event.uid || k,
                subject: event.summary || 'Untitled Event',
                startTime: new Date(event.start),
                endTime: new Date(event.end),
                location: event.location,
                description: event.description,
                organizer: event.organizer?.val || event.organizer,
                attendees: event.attendee ?
                  (Array.isArray(event.attendee) ?
                    event.attendee.map(a => a.val || a) :
                    [event.attendee.val || event.attendee]
                  ) : [],
              })
            }
          }
        }

        logger.info(`Parsed ${events.length} total events (including recurring instances)`)
        resolve(events)
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Save calendar event to Airtable
   */
  private async saveCalendarEvent(userId: string, event: ICalEvent): Promise<boolean> {
    try {
      // Check if event already exists
      const existingEvents = await getAirtableClient().findRecords('Calendar Events', {
        filterByFormula: `{Calendar Event ID} = '${event.id}'`,
      })

      const eventData = {
        'Calendar Event ID': event.id,
        'Subject': event.subject,
        'Start Time': event.startTime.toISOString(),
        'End Time': event.endTime.toISOString(),
        'Location': event.location,
        'Attendees': event.attendees.join(', '),
        'Organizer': event.organizer || '',
        'Description': event.description,
        'Is Online Meeting': false,
        'Meeting URL': '',
        'User': [userId],
        'Last Synced': new Date().toISOString(),
      }

      if (existingEvents.length > 0) {
        // Update existing event
        await getAirtableClient().updateRecord('Calendar Events', existingEvents[0].id, eventData)
        return false
      } else {
        // Create new event
        await getAirtableClient().createRecord('Calendar Events', eventData)
        return true
      }
    } catch (error) {
      logger.error(`Failed to save calendar event ${event.id}: ${error}`)
      throw error
    }
  }

  /**
   * Get upcoming events for user
   */
  async getUpcomingEvents(userId: string, days: number = 7): Promise<ICalEvent[]> {
    try {
      const now = new Date()
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + days)

      // Get all events and filter in JavaScript
      const allRecords = await getAirtableClient().findRecords('Calendar Events', {})

      logger.info(`Found ${allRecords.length} total calendar events`)

      // Filter by user and date in JavaScript
      const records = allRecords.filter(record => {
        const userArray = record.fields['User'] as string[] || []
        const hasUser = userArray.includes(userId)
        const startTime = new Date(record.fields['Start Time'] as string)
        const inDateRange = startTime > now && startTime < endDate
        return hasUser && inDateRange
      })

      logger.info(`Found ${records.length} upcoming events for user ${userId} between ${now.toISOString()} and ${endDate.toISOString()}`)

      return records.map(record => ({
        id: record.fields['Calendar Event ID'] as string,
        subject: record.fields['Subject'] as string,
        startTime: new Date(record.fields['Start Time'] as string),
        endTime: new Date(record.fields['End Time'] as string),
        location: record.fields['Location'] as string,
        attendees: (record.fields['Attendees'] as string)?.split(', ') || [],
        organizer: record.fields['Organizer'] as string,
        description: record.fields['Description'] as string,
      }))
    } catch (error) {
      logger.error(`Failed to get upcoming events for user ${userId}: ${error}`)
      throw error
    }
  }

  /**
   * Update user's last sync time
   */
  private async updateLastSyncTime(userId: string): Promise<void> {
    try {
      await getAirtableClient().updateRecord('Users', userId, {
        'Last Calendar Sync': new Date().toISOString(),
      })
    } catch (error) {
      logger.error(`Failed to update last sync time for user ${userId}: ${error}`)
    }
  }

  /**
   * Save iCalendar URL for user
   */
  async saveICalURL(userId: string, icalUrl: string): Promise<void> {
    try {
      await getAirtableClient().updateRecord('Users', userId, {
        'iCalendar URL': icalUrl,
        'Calendar Connected': true,
      })
      logger.info(`Saved iCalendar URL for user ${userId}`)
    } catch (error) {
      logger.error(`Failed to save iCalendar URL for user ${userId}: ${error}`)
      throw error
    }
  }

  /**
   * Get user's iCalendar URL
   */
  async getUserICalURL(userId: string): Promise<string | null> {
    try {
      const userRecord = await getAirtableClient().getRecord('Users', userId)
      return userRecord.fields['iCalendar URL'] as string || null
    } catch (error) {
      logger.error(`Failed to get iCalendar URL for user ${userId}: ${error}`)
      return null
    }
  }

  /**
   * Disconnect calendar
   */
  async disconnectCalendar(userId: string): Promise<void> {
    try {
      await getAirtableClient().updateRecord('Users', userId, {
        'iCalendar URL': null,
        'Calendar Connected': false,
      })
      logger.info(`Disconnected calendar for user ${userId}`)
    } catch (error) {
      logger.error(`Failed to disconnect calendar for user ${userId}: ${error}`)
      throw error
    }
  }
}

export const icalendarService = new ICalendarService()
export type { ICalEvent, SyncResult }
