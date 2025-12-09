/**
 * iCalendar Routes
 * Simple calendar sync using Outlook.com iCalendar URL (no OAuth needed)
 */

import { Router, Request, Response } from 'express'
import { icalendarService } from '../services/icalendar.service.js'
import { logger } from '../utils/logger.js'

const router: Router = Router()

/**
 * Connect calendar using iCalendar URL
 * POST /api/v1/icalendar/connect
 * Body: { userId: string, icalUrl: string }
 */
router.post('/connect', async (req: Request, res: Response) => {
  try {
    const { userId, icalUrl } = req.body

    if (!userId || !icalUrl) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing userId or icalUrl in request body' },
      })
    }

    // Save the URL
    await icalendarService.saveICalURL(userId, icalUrl)

    // Perform initial sync
    const syncResult = await icalendarService.syncFromICalURL(userId, icalUrl)

    res.json({
      success: true,
      data: {
        message: 'Calendar connected successfully',
        eventsSynced: syncResult.eventsSynced,
        eventsCreated: syncResult.eventsCreated,
        eventsUpdated: syncResult.eventsUpdated,
      },
    })
  } catch (error) {
    logger.error(`Failed to connect calendar: ${error}`)
    res.status(500).json({
      success: false,
      error: { message: 'Failed to connect calendar', details: String(error) },
    })
  }
})

/**
 * Sync calendar events
 * POST /api/v1/icalendar/sync
 * Body: { userId: string }
 */
router.post('/sync', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing userId in request body' },
      })
    }

    // Get user's iCal URL
    const icalUrl = await icalendarService.getUserICalURL(userId)

    if (!icalUrl) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Calendar not connected. Please connect your calendar first.',
          code: 'CALENDAR_NOT_CONNECTED'
        },
      })
    }

    // Sync calendar events
    const result = await icalendarService.syncFromICalURL(userId, icalUrl)

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
 * GET /api/v1/icalendar/events?userId=<userId>&days=<days>
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
    const events = await icalendarService.getUpcomingEvents(userId, daysAhead)

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
 * Disconnect calendar
 * DELETE /api/v1/icalendar/disconnect
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

    await icalendarService.disconnectCalendar(userId)

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
 * GET /api/v1/icalendar/status?userId=<userId>
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

    const icalUrl = await icalendarService.getUserICalURL(userId)

    res.json({
      success: true,
      data: {
        connected: !!icalUrl,
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
