/**
 * Meeting Intelligence Routes
 *
 * API endpoints for meeting series intelligence features:
 * - POST /api/v1/meeting-series/:name/generate-themes - Generate theme suggestions
 * - POST /api/v1/meeting-series/:name/research - Ask research questions
 */

import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { generateThemeSuggestions, processResearchQuestion } from '../services/meeting-intelligence.service.js'
import { logger } from '../utils/logger.js'

const router = Router()

/**
 * POST /api/v1/meeting-series/:name/generate-themes
 * Generate AI-suggested themes for a meeting series
 */
router.post('/:name/generate-themes', async (req: Request, res: Response) => {
  try {
    const seriesName = decodeURIComponent(req.params.name)

    if (!seriesName) {
      return res.status(400).json({
        success: false,
        error: 'Meeting series name is required',
      })
    }

    logger.info(`Generating themes for series: ${seriesName}`)

    const suggestions = await generateThemeSuggestions(seriesName)

    return res.json({
      success: true,
      data: {
        seriesName,
        suggestions,
        generatedAt: new Date().toISOString(),
      },
    })

  } catch (error) {
    logger.error('Error generating themes:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to generate theme suggestions',
    })
  }
})

/**
 * POST /api/v1/meeting-series/:name/research
 * Ask a research question about a meeting series
 */
const researchSchema = z.object({
  question: z.string().min(5).max(1000),
})

router.post('/:name/research', async (req: Request, res: Response) => {
  try {
    const seriesName = decodeURIComponent(req.params.name)

    const validation = researchSchema.safeParse(req.body)
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        details: validation.error.errors,
      })
    }

    const { question } = validation.data

    logger.info(`Processing research question for series: ${seriesName}`)

    const response = await processResearchQuestion(seriesName, question)

    return res.json({
      success: true,
      data: response,
    })

  } catch (error) {
    logger.error('Error processing research question:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to process research question',
    })
  }
})

export default router
