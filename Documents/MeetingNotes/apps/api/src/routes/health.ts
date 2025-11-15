/**
 * Health Check Route
 */

import { Router, Request, Response } from 'express'
import { getRedisClient } from '../utils/redis.js'
import { getAirtableClient } from '../lib/client.js'

const router = Router()

router.get('/', async (req: Request, res: Response) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    services: {
      redis: 'unknown',
      airtable: 'unknown',
    },
  }

  try {
    // Check Redis
    const redis = getRedisClient()
    await redis.ping()
    health.services.redis = 'ok'
  } catch (error) {
    health.services.redis = 'error'
    health.status = 'degraded'
  }

  try {
    // Check Airtable
    const airtable = getAirtableClient()
    // Simple check - client exists
    if (airtable) {
      health.services.airtable = 'ok'
    }
  } catch (error) {
    health.services.airtable = 'error'
    health.status = 'degraded'
  }

  const statusCode = health.status === 'ok' ? 200 : 503
  res.status(statusCode).json(health)
})

export default router
