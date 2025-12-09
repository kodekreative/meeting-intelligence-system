/**
 * Authentication Routes
 * OAuth flow with Microsoft Graph for calendar access
 */

import { Router, Request, Response } from 'express'
import { microsoftAuthService } from '../services/microsoft-auth.service.js'
import { calendarService } from '../services/calendar.service.js'
import { logger } from '../utils/logger.js'

const router: Router = Router()

/**
 * Initiate OAuth login flow
 * GET /api/v1/auth/login?userId=<userId>
 */
router.get('/login', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing userId parameter' },
      })
    }

    // Generate authorization URL
    const authUrl = await microsoftAuthService.getAuthUrl(userId)

    logger.info(`Generated auth URL for user ${userId}`)

    // Redirect to Microsoft login
    res.redirect(authUrl)
  } catch (error) {
    logger.error(`Failed to initiate OAuth login: ${error}`)
    res.status(500).json({
      success: false,
      error: { message: 'Failed to initiate login', details: String(error) },
    })
  }
})

/**
 * OAuth callback handler
 * GET /api/v1/auth/callback?code=<code>&state=<state>
 */
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error, error_description } = req.query

    // Check for OAuth errors
    if (error) {
      logger.error(`OAuth error: ${error} - ${error_description}`)
      return res.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings/calendar?error=${error}`
      )
    }

    if (!code || typeof code !== 'string' || !state || typeof state !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing code or state parameter' },
      })
    }

    // Exchange code for tokens
    const { tokens, userId } = await microsoftAuthService.getTokenFromCode(code, state)

    // Save tokens to database
    await calendarService.saveUserTokens(userId, tokens)

    // Trigger initial calendar sync
    const syncResult = await calendarService.syncCalendarEvents(
      userId,
      tokens.accessToken
    )

    logger.info(`Calendar connected for user ${userId}, synced ${syncResult.eventsSynced} events`)

    // Redirect to success page
    res.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings/calendar?success=true&synced=${syncResult.eventsSynced}`
    )
  } catch (error) {
    logger.error(`OAuth callback failed: ${error}`)
    res.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings/calendar?error=callback_failed`
    )
  }
})

/**
 * Refresh access token
 * POST /api/v1/auth/refresh
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing userId in request body' },
      })
    }

    // Get fresh access token
    const accessToken = await calendarService.getUserAccessToken(userId)

    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: { message: 'No valid tokens found. Please reconnect your calendar.' },
      })
    }

    logger.info(`Token refreshed for user ${userId}`)

    res.json({
      success: true,
      data: {
        message: 'Token refreshed successfully',
      },
    })
  } catch (error) {
    logger.error(`Failed to refresh token: ${error}`)
    res.status(500).json({
      success: false,
      error: { message: 'Failed to refresh token', details: String(error) },
    })
  }
})

/**
 * Get OAuth connection status
 * GET /api/v1/auth/status?userId=<userId>
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

    // Check if user has valid tokens
    const accessToken = await calendarService.getUserAccessToken(userId)

    res.json({
      success: true,
      data: {
        connected: !!accessToken,
        userId,
      },
    })
  } catch (error) {
    logger.error(`Failed to get auth status: ${error}`)
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get status', details: String(error) },
    })
  }
})

export default router
