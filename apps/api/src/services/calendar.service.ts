/**
 * Calendar Service
 * Handles syncing calendar events from Microsoft Outlook/Exchange
 */

import { Client } from '@microsoft/microsoft-graph-client'
import { Event as GraphEvent } from '@microsoft/microsoft-graph-types'
import { microsoftAuthService, TokenSet } from './microsoft-auth.service.js'
import { getAirtableClient } from '../lib/client.js'
import { logger } from '../utils/logger.js'

interface CalendarEvent {
  id: string
  subject: string
  startTime: Date
  endTime: Date
  location?: string
  attendees: string[]
  organizer: string
  body?: string
  isOnlineMeeting: boolean
  onlineMeetingUrl?: string
  calendarId: string
}

interface SyncResult {
  success: boolean
  eventsSynced: number
  eventsCreated: number
  eventsUpdated: number
  errors: string[]
}

class CalendarService {
  /**
   * Sync calendar events for a user
   */
  async syncCalendarEvents(
    userId: string,
    accessToken: string,
    daysAhead: number = 30
  ): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      eventsSynced: 0,
      eventsCreated: 0,
      eventsUpdated: 0,
      errors: [],
    }

    try {
      // Get Microsoft Graph client
      const graphClient = microsoftAuthService.getGraphClient(accessToken)

      // Fetch calendar events
      const events = await this.fetchCalendarEvents(graphClient, daysAhead)
      logger.info(`Fetched ${events.length} calendar events for user ${userId}`)

      // Process each event
      for (const event of events) {
        try {
          const calendarEvent = this.transformGraphEvent(event)
          const created = await this.saveCalendarEvent(userId, calendarEvent)

          if (created) {
            result.eventsCreated++
          } else {
            result.eventsUpdated++
          }
          result.eventsSynced++
        } catch (error) {
          const errorMsg = `Failed to process event ${event.subject}: ${error}`
          logger.error(errorMsg)
          result.errors.push(errorMsg)
        }
      }

      // Update user's last sync time
      await this.updateLastSyncTime(userId)

      result.success = true
      logger.info(`Calendar sync completed for user ${userId}: ${result.eventsSynced} events synced`)

      return result
    } catch (error) {
      const errorMsg = `Calendar sync failed for user ${userId}: ${error}`
      logger.error(errorMsg)
      result.errors.push(errorMsg)
      return result
    }
  }

  /**
   * Fetch calendar events from Microsoft Graph
   */
  private async fetchCalendarEvents(
    graphClient: Client,
    daysAhead: number
  ): Promise<GraphEvent[]> {
    const startDate = new Date()
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + daysAhead)

    try {
      const response = await graphClient
        .api('/me/calendar/events')
        .select([
          'id',
          'subject',
          'start',
          'end',
          'location',
          'attendees',
          'organizer',
          'bodyPreview',
          'isOnlineMeeting',
          'onlineMeetingUrl',
        ])
        .filter(
          `start/dateTime ge '${startDate.toISOString()}' and start/dateTime le '${endDate.toISOString()}'`
        )
        .orderby('start/dateTime')
        .top(100)
        .get()

      return response.value || []
    } catch (error) {
      logger.error(`Failed to fetch calendar events from Microsoft Graph: ${error}`)
      throw error
    }
  }

  /**
   * Transform Microsoft Graph event to our calendar event format
   */
  private transformGraphEvent(graphEvent: GraphEvent): CalendarEvent {
    return {
      id: graphEvent.id || '',
      subject: graphEvent.subject || 'Untitled Event',
      startTime: new Date(graphEvent.start?.dateTime || ''),
      endTime: new Date(graphEvent.end?.dateTime || ''),
      location: graphEvent.location?.displayName,
      attendees: (graphEvent.attendees || [])
        .map(a => a.emailAddress?.address || '')
        .filter(Boolean),
      organizer: graphEvent.organizer?.emailAddress?.address || '',
      body: graphEvent.bodyPreview,
      isOnlineMeeting: graphEvent.isOnlineMeeting || false,
      onlineMeetingUrl: graphEvent.onlineMeetingUrl,
      calendarId: graphEvent.id || '',
    }
  }

  /**
   * Save calendar event to Airtable
   */
  private async saveCalendarEvent(
    userId: string,
    event: CalendarEvent
  ): Promise<boolean> {
    try {
      // Check if event already exists
      const existingEvents = await airtableClient.findRecords('Calendar Events', {
        filterByFormula: `{Calendar Event ID} = '${event.id}'`,
      })

      const eventData = {
        'Calendar Event ID': event.id,
        'Subject': event.subject,
        'Start Time': event.startTime.toISOString(),
        'End Time': event.endTime.toISOString(),
        'Location': event.location,
        'Attendees': event.attendees.join(', '),
        'Organizer': event.organizer,
        'Description': event.body,
        'Is Online Meeting': event.isOnlineMeeting,
        'Meeting URL': event.onlineMeetingUrl,
        'User': [userId],
        'Last Synced': new Date().toISOString(),
      }

      if (existingEvents.length > 0) {
        // Update existing event
        await airtableClient.updateRecord('Calendar Events', existingEvents[0].id, eventData)
        return false
      } else {
        // Create new event
        await airtableClient.createRecord('Calendar Events', eventData)
        return true
      }
    } catch (error) {
      logger.error(`Failed to save calendar event ${event.id}: ${error}`)
      throw error
    }
  }

  /**
   * Get upcoming calendar events for a user
   */
  async getUpcomingEvents(userId: string, days: number = 7): Promise<CalendarEvent[]> {
    try {
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + days)

      const records = await airtableClient.findRecords('Calendar Events', {
        filterByFormula: `AND(
          FIND('${userId}', ARRAYJOIN({User})) > 0,
          IS_AFTER({Start Time}, NOW()),
          IS_BEFORE({Start Time}, '${endDate.toISOString()}')
        )`,
        sort: [{ field: 'Start Time', direction: 'asc' }],
      })

      return records.map(record => ({
        id: record.fields['Calendar Event ID'] as string,
        subject: record.fields['Subject'] as string,
        startTime: new Date(record.fields['Start Time'] as string),
        endTime: new Date(record.fields['End Time'] as string),
        location: record.fields['Location'] as string,
        attendees: (record.fields['Attendees'] as string)?.split(', ') || [],
        organizer: record.fields['Organizer'] as string,
        body: record.fields['Description'] as string,
        isOnlineMeeting: record.fields['Is Online Meeting'] as boolean,
        onlineMeetingUrl: record.fields['Meeting URL'] as string,
        calendarId: record.fields['Calendar Event ID'] as string,
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
      await airtableClient.updateRecord('Users', userId, {
        'Last Calendar Sync': new Date().toISOString(),
      })
    } catch (error) {
      logger.error(`Failed to update last sync time for user ${userId}: ${error}`)
    }
  }

  /**
   * Get user's access token and refresh if needed
   */
  async getUserAccessToken(userId: string): Promise<string | null> {
    try {
      const userRecord = await airtableClient.getRecord('Users', userId)

      if (!userRecord.fields['Microsoft Access Token']) {
        return null
      }

      // Decrypt token
      const encryptedToken = userRecord.fields['Microsoft Access Token'] as string
      const accessToken = microsoftAuthService.decryptToken(encryptedToken)

      // Check if token is expired
      const expiresAt = new Date(userRecord.fields['Microsoft Token Expires At'] as string)
      if (microsoftAuthService.isTokenExpired(expiresAt)) {
        // Refresh token
        const refreshToken = microsoftAuthService.decryptToken(
          userRecord.fields['Microsoft Refresh Token'] as string
        )
        const newTokens = await microsoftAuthService.refreshAccessToken(refreshToken)

        // Save new tokens
        await this.saveUserTokens(userId, newTokens)

        return newTokens.accessToken
      }

      return accessToken
    } catch (error) {
      logger.error(`Failed to get access token for user ${userId}: ${error}`)
      return null
    }
  }

  /**
   * Save user's Microsoft tokens to Airtable
   */
  async saveUserTokens(userId: string, tokens: TokenSet): Promise<void> {
    try {
      await airtableClient.updateRecord('Users', userId, {
        'Microsoft Access Token': microsoftAuthService.encryptToken(tokens.accessToken),
        'Microsoft Refresh Token': tokens.refreshToken
          ? microsoftAuthService.encryptToken(tokens.refreshToken)
          : undefined,
        'Microsoft Token Expires At': tokens.expiresAt.toISOString(),
        'Calendar Connected': true,
      })

      logger.info(`Saved Microsoft tokens for user ${userId}`)
    } catch (error) {
      logger.error(`Failed to save tokens for user ${userId}: ${error}`)
      throw error
    }
  }

  /**
   * Disconnect user's calendar
   */
  async disconnectCalendar(userId: string): Promise<void> {
    try {
      await airtableClient.updateRecord('Users', userId, {
        'Microsoft Access Token': null,
        'Microsoft Refresh Token': null,
        'Microsoft Token Expires At': null,
        'Calendar Connected': false,
      })

      logger.info(`Disconnected calendar for user ${userId}`)
    } catch (error) {
      logger.error(`Failed to disconnect calendar for user ${userId}: ${error}`)
      throw error
    }
  }
}

export const calendarService = new CalendarService()
export type { CalendarEvent, SyncResult }
