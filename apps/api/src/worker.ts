/**
 * Scheduler Worker Entrypoint
 * Runs automated jobs (cron) without starting the HTTP server
 */

import dotenv from 'dotenv'
import { logger } from './utils/logger.js'
import { initializeServices } from './startup/initializeServices.js'
import { schedulerService } from './services/scheduler.service.js'

dotenv.config({ path: '../../.env' })

async function startWorker(): Promise<void> {
  try {
    logger.info('Starting scheduler worker...')
    await initializeServices()
    schedulerService.initialize()
    logger.info('Scheduler worker initialized')

    const gracefulShutdown = (signal: string) => {
      logger.info(`${signal} received, shutting down scheduler worker...`)
      schedulerService.shutdown()
      setTimeout(() => process.exit(0), 2000)
    }

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
    process.on('SIGINT', () => gracefulShutdown('SIGINT'))
  } catch (error) {
    logger.error('Scheduler worker failed to start:', error)
    process.exit(1)
  }
}

startWorker()
