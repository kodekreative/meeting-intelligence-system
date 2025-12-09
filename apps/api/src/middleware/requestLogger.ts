/**
 * Request Logger Middleware
 */

import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger.js'

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now()

  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - start
    const { method, originalUrl, ip } = req
    const { statusCode } = res

    logger.info(`${method} ${originalUrl} ${statusCode} - ${duration}ms - ${ip}`)
  })

  next()
}
