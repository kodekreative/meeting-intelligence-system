/**
 * Calendar Routes
 * Endpoints for calendar synchronization and event management
 */

import { Router, Request, Response } from 'express'
import { calendarService } from '../services/calendar.service.js'
import { logger } from '../utils/logger.js'

const router = Router()

/**
 * Sync calendar events for a user
 * POST /api/v1/calendar/sync
 * Body: { userId: string, daysAhead?: number }
 */
router.post('/sync', async (req: Request, res: Response) => {
  try {
    const { userId, daysAhead = 30 } = req.body

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing userId in request body' },
      })
    }

    // Get user's access token
    const accessToken = await calendarService.getUserAccessToken(userId)

    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Calendar not connected. Please connect your calendar first.',
          code: 'CALENDAR_NOT_CONNECTED'
        },
      })
    }

    // Sync calendar events
    const result = await calendarService.syncCalendarEvents(userId, accessToken, daysAhead)

    res.json({
      success: result.success,
      data: {
        eventsSynced: result.eventsSynced,
        eventsCreated: result.eventsCreated,
        eventsUpdated: result.eventsUpdated,
        errors: result.errors,
      },
    })
  } catch (error) {
    logger.error(`Failed to sync calendar: ${error}`)
    res.status(500).json({
      success: false,
      error: { message: 'Failed to sync calendar', details: String(error) },
    })
  }
})

/**
 * Get upcoming calendar events
 * GET /api/v1/calendar/events?userId=<userId>&days=<days>
 */
router.get('/events', async (req: Request, res: Response) => {
  try {
    const { userId, days = '7' } = req.query

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing userId parameter' },
      })
    }

    const daysAhead = parseInt(days as string, 10)

    // Get upcoming events from database
    const events = await calendarService.getUpcomingEvents(userId, daysAhead)

    res.json({
      success: true,
      data: {
        events,
        count: events.length,
      },
    })
  } catch (error) {
    logger.error(`Failed to get calendar events: ${error}`)
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get events', details: String(error) },
    })
  }
})

/**
 * Disconnect user's calendar
 * DELETE /api/v1/calendar/disconnect
 * Body: { userId: string }
 */
router.delete('/disconnect', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing userId in request body' },
      })
    }

    await calendarService.disconnectCalendar(userId)

    res.json({
      success: true,
      data: {
        message: 'Calendar disconnected successfully',
      },
    })
  } catch (error) {
    logger.error(`Failed to disconnect calendar: ${error}`)
    res.status(500).json({
      success: false,
      error: { message: 'Failed to disconnect calendar', details: String(error) },
    })
  }
})

/**
 * Get calendar connection status
 * GET /api/v1/calendar/status?userId=<userId>
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing userId parameter' },
      })
    }

    const accessToken = await calendarService.getUserAccessToken(userId)

    res.json({
      success: true,
      data: {
        connected: !!accessToken,
        userId,
      },
    })
  } catch (error) {
    logger.error(`Failed to get calendar status: ${error}`)
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get status', details: String(error) },
    })
  }
})

export default router
