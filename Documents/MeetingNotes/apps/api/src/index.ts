/**
 * Meeting Intelligence System - API Server
 * Main entry point for Express backend
 */

import express, { Express } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import dotenv from 'dotenv'
import { createServer } from 'http'
import { logger } from './utils/logger'
import { errorHandler } from './middleware/errorHandler'
import { requestLogger } from './middleware/requestLogger'
import { initializeAirtable } from 'airtable-client'
import { initializeRedis } from './utils/redis'

// Import routes
import healthRouter from './routes/health'
import authRouter from './routes/auth'
import meetingsRouter from './routes/meetings'
import companiesRouter from './routes/companies'
import contactsRouter from './routes/contacts'
import actionItemsRouter from './routes/actionItems'
import dashboardRouter from './routes/dashboard'

// Load environment variables
dotenv.config()

const app: Express = express()
const PORT = process.env.PORT || 3001
const NODE_ENV = process.env.NODE_ENV || 'development'

/**
 * Initialize external services
 */
async function initializeServices(): Promise<void> {
  try {
    // Initialize Airtable
    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      throw new Error('Missing required Airtable credentials')
    }

    initializeAirtable({
      apiKey: process.env.AIRTABLE_API_KEY,
      baseId: process.env.AIRTABLE_BASE_ID,
    })
    logger.info('✓ Airtable client initialized')

    // Initialize Redis
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

/**
 * Configure middleware
 */
function configureMiddleware(app: Express): void {
  // Security middleware
  app.use(helmet())

  // CORS configuration
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000']
  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    })
  )

  // Compression
  app.use(compression())

  // Body parsing
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true, limit: '10mb' }))

  // Request logging
  app.use(requestLogger)
}

/**
 * Configure routes
 */
function configureRoutes(app: Express): void {
  const API_PREFIX = '/api/v1'

  // Health check (no prefix)
  app.use('/health', healthRouter)

  // API routes
  app.use(`${API_PREFIX}/auth`, authRouter)
  app.use(`${API_PREFIX}/meetings`, meetingsRouter)
  app.use(`${API_PREFIX}/companies`, companiesRouter)
  app.use(`${API_PREFIX}/contacts`, contactsRouter)
  app.use(`${API_PREFIX}/action-items`, actionItemsRouter)
  app.use(`${API_PREFIX}/dashboard`, dashboardRouter)

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      error: {
        message: 'Route not found',
        code: 'ROUTE_NOT_FOUND',
      },
    })
  })

  // Error handler (must be last)
  app.use(errorHandler)
}

/**
 * Start server
 */
async function startServer(): Promise<void> {
  try {
    // Initialize services first
    await initializeServices()

    // Configure middleware
    configureMiddleware(app)

    // Configure routes
    configureRoutes(app)

    // Create HTTP server
    const server = createServer(app)

    // Start listening
    server.listen(PORT, () => {
      logger.info(`
🚀 Meeting Intelligence API Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Environment: ${NODE_ENV}
Port: ${PORT}
API Base: /api/v1
Health Check: http://localhost:${PORT}/health
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `)
    })

    // Graceful shutdown
    const gracefulShutdown = (signal: string): void => {
      logger.info(`${signal} received, starting graceful shutdown...`)
      server.close(() => {
        logger.info('HTTP server closed')
        process.exit(0)
      })

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout')
        process.exit(1)
      }, 10000)
    }

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
    process.on('SIGINT', () => gracefulShutdown('SIGINT'))
  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

// Start the server
startServer()

export default app
