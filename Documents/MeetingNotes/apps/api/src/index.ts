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
import { logger } from './utils/logger.js'
import { errorHandler } from './middleware/errorHandler.js'
import { requestLogger } from './middleware/requestLogger.js'
import { initializeAirtable } from './lib/client.js'
import { initializeRedis } from './utils/redis.js'
import { schedulerService } from './services/scheduler.service.js'

// Import routes
import healthRouter from './routes/health.js'
import authRouter from './routes/auth.js'
import calendarRouter from './routes/calendar.routes.js'
import icalendarRouter from './routes/icalendar.routes.js'
import meetingsRouter from './routes/meetings.js'
import companiesRouter from './routes/companies.js'
import contactsRouter from './routes/contacts.js'
import actionItemsRouter from './routes/actionItems.js'
import dashboardRouter from './routes/dashboard.js'
import emailRouter from './routes/email.routes.js'
import themesRouter from './routes/themes.js'
import tasksRouter from './routes/tasks.js'
import stacksRouter from './routes/stacks.js'
import boardsRouter from './routes/boards.js'

// Load environment variables from root
dotenv.config({ path: '../../.env' })

const app: Express = express()
const PORT = process.env.PORT || 3001
const NODE_ENV = process.env.NODE_ENV || 'development'

/**
 * Initialize external services
 */
async function initializeServices(): Promise<void> {
  try {
    // Initialize Airtable (optional for development)
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
  // CORS configuration - must be before helmet
  app.use(
    cors({
      origin: true, // Allow all origins in development
      credentials: true,
    })
  )

  // Security middleware - configure to allow cross-origin requests
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }))

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
  app.use(`${API_PREFIX}/calendar`, calendarRouter)
  app.use(`${API_PREFIX}/icalendar`, icalendarRouter)
  app.use(`${API_PREFIX}/meetings`, meetingsRouter)
  app.use(`${API_PREFIX}/companies`, companiesRouter)
  app.use(`${API_PREFIX}/contacts`, contactsRouter)
  app.use(`${API_PREFIX}/action-items`, actionItemsRouter)
  app.use(`${API_PREFIX}/dashboard`, dashboardRouter)
  app.use(`${API_PREFIX}/email`, emailRouter)
  app.use(`${API_PREFIX}/themes`, themesRouter)
  app.use(`${API_PREFIX}/tasks`, tasksRouter)
  app.use(`${API_PREFIX}/stacks`, stacksRouter)
  app.use(`${API_PREFIX}/boards`, boardsRouter)

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

      // Initialize scheduled jobs
      if (process.env.ENABLE_SCHEDULED_JOBS !== 'false') {
        schedulerService.initialize()
      }
    })

    // Graceful shutdown
    const gracefulShutdown = (signal: string): void => {
      logger.info(`${signal} received, starting graceful shutdown...`)

      // Stop scheduled jobs
      schedulerService.shutdown()

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
