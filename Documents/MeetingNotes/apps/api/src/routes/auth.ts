/**
 * Authentication Routes
 * Placeholder for OAuth flow with Microsoft Graph
 */

import { Router } from 'express'

const router = Router()

// TODO: Implement Microsoft OAuth flow
router.get('/login', (req, res) => {
  res.json({
    success: false,
    error: { message: 'Authentication not yet implemented' },
  })
})

router.get('/callback', (req, res) => {
  res.json({
    success: false,
    error: { message: 'Authentication not yet implemented' },
  })
})

router.post('/refresh', (req, res) => {
  res.json({
    success: false,
    error: { message: 'Authentication not yet implemented' },
  })
})

export default router
