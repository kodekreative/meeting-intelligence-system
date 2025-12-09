/**
 * Redis Client Configuration
 */

import Redis from 'ioredis'
import { logger } from './logger'

export interface RedisConfig {
  host: string
  port: number
  password?: string
  tls?: boolean
}

let redisClient: Redis | null = null

export async function initializeRedis(config: RedisConfig): Promise<Redis> {
  try {
    redisClient = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000)
        return delay
      },
      maxRetriesPerRequest: 3,
    })

    redisClient.on('error', (error) => {
      logger.error('Redis error:', error)
    })

    redisClient.on('connect', () => {
      logger.info('Redis connected')
    })

    // Test connection
    await redisClient.ping()

    return redisClient
  } catch (error) {
    logger.error('Failed to initialize Redis:', error)
    throw error
  }
}

export function getRedisClient(): Redis {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call initializeRedis() first.')
  }
  return redisClient
}

/**
 * Cache helper functions
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const client = getRedisClient()
    const data = await client.get(key)
    return data ? JSON.parse(data) : null
  } catch (error) {
    logger.error(`Cache get error for key ${key}:`, error)
    return null
  }
}

export async function cacheSet(key: string, value: unknown, ttl: number = 300): Promise<void> {
  try {
    const client = getRedisClient()
    await client.setex(key, ttl, JSON.stringify(value))
  } catch (error) {
    logger.error(`Cache set error for key ${key}:`, error)
  }
}

export async function cacheDelete(key: string): Promise<void> {
  try {
    const client = getRedisClient()
    await client.del(key)
  } catch (error) {
    logger.error(`Cache delete error for key ${key}:`, error)
  }
}

export async function cacheDeletePattern(pattern: string): Promise<void> {
  try {
    const client = getRedisClient()
    const keys = await client.keys(pattern)
    if (keys.length > 0) {
      await client.del(...keys)
    }
  } catch (error) {
    logger.error(`Cache delete pattern error for ${pattern}:`, error)
  }
}
