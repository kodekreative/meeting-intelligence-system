import { initializeAirtable } from '../lib/client.js'
import { initializeRedis } from '../utils/redis.js'
import { logger } from '../utils/logger.js'

export async function initializeServices(): Promise<void> {
  try {
    if (process.env.AIRTABLE_API_KEY && process.env.AIRTABLE_BASE_ID &&
        !process.env.AIRTABLE_API_KEY.includes('placeholder')) {
      initializeAirtable({
        apiKey: process.env.AIRTABLE_API_KEY,
        baseId: process.env.AIRTABLE_BASE_ID,
      })
      logger.info('✓ Airtable client initialized')
    } else {
      logger.warn('⚠ Airtable credentials not configured - running in demo mode')
    }

    await initializeRedis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
    })
    logger.info('✓ Redis connection established')
  } catch (error) {
    logger.error('Failed to initialize services:', error)
    throw error
  }
}
