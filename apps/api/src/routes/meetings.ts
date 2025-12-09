/**
 * Meetings Routes
 */

import { Router, Request, Response } from 'express'
import { getAirtableClient } from '../lib/client.js'
import { asyncHandler, AppError } from '../middleware/errorHandler.js'
import { cacheGet, cacheSet, cacheDelete } from '../utils/redis.js'
import { CACHE } from '../shared/constants.js'
import { analyzeMeetingForThemes } from '../services/ai-theme-analysis.service.js'

const router: Router = Router()

/**
 * GET /api/v1/meetings
 * Get all meetings with optional filtering
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { fromDate, toDate, companyId, status, limit = 20 } = req.query

    // Build cache key
    const cacheKey = `${CACHE.KEYS.MEETINGS}:${JSON.stringify(req.query)}`

    // Try cache first
    const cached = await cacheGet(cacheKey)
    if (cached) {
      res.json({
        success: true,
        data: cached,
        meta: { cached: true },
      })
      return
    }

    // Fetch from Airtable
    const airtable = getAirtableClient()
    const meetings = await airtable.getMeetings({
      fromDate: fromDate ? new Date(fromDate as string) : undefined,
      toDate: toDate ? new Date(toDate as string) : undefined,
      companyId: companyId as string | undefined,
      processingStatus: status as string | undefined,
      maxRecords: parseInt(limit as string, 10),
    })

    // Transform to API response format
    const transformedMeetings = meetings.map((meeting) => {
      return {
        id: meeting.id,
        startTime: meeting.fields['Start Time'],
        title: meeting.fields.Title || meeting.fields.Name,
        participants: meeting.fields.Participants?.split(',').map((p) => p.trim()) || [],
        ownerName: meeting.fields['Owner Name'],
        ownerEmail: meeting.fields['Owner Email'],
        sessionId: meeting.fields['Session ID'],
        summary: meeting.fields['Meeting Summary'],
        topics: Array.isArray(meeting.fields.Topics)
          ? meeting.fields.Topics.join(', ')
          : (typeof meeting.fields.Topics === 'string' ? meeting.fields.Topics : ''),
        keyQuestions: Array.isArray(meeting.fields['Key Questions'])
        ? meeting.fields['Key Questions'].join(', ')
        : (typeof meeting.fields['Key Questions'] === 'string' ? meeting.fields['Key Questions'] : ''),
        actionItems: meeting.fields['Action Items'],
        reportUrl: meeting.fields['Report URL'],
        chapterSummaries: meeting.fields['Chapter Summaries'],
        transcriptSpeakers: meeting.fields['Transcript Speakers'],
        speakerBlocks: meeting.fields['Speaker Blocks'],
      }
    })

    // Cache the result
    await cacheSet(cacheKey, transformedMeetings, CACHE.TTL.MEDIUM)

    res.json({
      success: true,
      data: transformedMeetings,
      meta: {
        count: transformedMeetings.length,
        cached: false,
      },
    })
  })
)

/**
 * GET /api/v1/meetings/:id
 * Get a single meeting by ID
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params

    // Try cache first
    const cacheKey = `${CACHE.KEYS.MEETINGS}:${id}`
    const cached = await cacheGet(cacheKey)
    if (cached) {
      res.json({
        success: true,
        data: cached,
        meta: { cached: true },
      })
      return
    }

    // Fetch from Airtable
    const airtable = getAirtableClient()
    const meeting = await airtable.getMeeting(id)

    if (!meeting) {
      throw new AppError('Meeting not found', 404, 'MEETING_NOT_FOUND')
    }

    // Transform to API response format
    const transformedMeeting = {
      id: meeting.id,
      startTime: meeting.fields['Start Time'],
      title: meeting.fields.Title || meeting.fields.Name,
      participants: meeting.fields.Participants?.split(',').map((p) => p.trim()) || [],
      ownerName: meeting.fields['Owner Name'],
      ownerEmail: meeting.fields['Owner Email'],
      sessionId: meeting.fields['Session ID'],
      summary: meeting.fields['Meeting Summary'],
      topics: Array.isArray(meeting.fields.Topics)
        ? meeting.fields.Topics.join(', ')
        : (typeof meeting.fields.Topics === 'string' ? meeting.fields.Topics : ''),
      keyQuestions: Array.isArray(meeting.fields['Key Questions'])
        ? meeting.fields['Key Questions'].join(', ')
        : (typeof meeting.fields['Key Questions'] === 'string' ? meeting.fields['Key Questions'] : ''),
      actionItems: meeting.fields['Action Items'],
      reportUrl: meeting.fields['Report URL'],
      chapterSummaries: meeting.fields['Chapter Summaries'],
      transcriptSpeakers: meeting.fields['Transcript Speakers'],
      speakerBlocks: meeting.fields['Speaker Blocks'],
    }

    // Cache the result
    await cacheSet(cacheKey, transformedMeeting, CACHE.TTL.MEDIUM)

    res.json({
      success: true,
      data: transformedMeeting,
    })
  })
)

/**
 * GET /api/v1/meetings/today
 * Get today's meetings
 */
router.get(
  '/filter/today',
  asyncHandler(async (req: Request, res: Response) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const airtable = getAirtableClient()
    const meetings = await airtable.getMeetings({
      fromDate: today,
      toDate: tomorrow,
    })

    const transformedMeetings = meetings.map((meeting) => {
      return {
        id: meeting.id,
      startTime: meeting.fields['Start Time'],
      title: meeting.fields.Title || meeting.fields.Name,
      participants: meeting.fields.Participants?.split(',').map((p) => p.trim()) || [],
      ownerName: meeting.fields['Owner Name'],
      ownerEmail: meeting.fields['Owner Email'],
      summary: meeting.fields['Meeting Summary'],
      topics: Array.isArray(meeting.fields.Topics)
        ? meeting.fields.Topics.join(', ')
        : (typeof meeting.fields.Topics === 'string' ? meeting.fields.Topics : ''),
      reportUrl: meeting.fields['Report URL'],
    }
    })

    res.json({
      success: true,
      data: transformedMeetings,
      meta: {
        date: today.toISOString(),
        count: transformedMeetings.length,
      },
    })
  })
)

/**
 * POST /api/v1/meetings/:id/analyze-themes
 * Analyze meeting transcript for all associated themes
 */
router.post(
  '/:id/analyze-themes',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params
    const airtable = getAirtableClient()

    // 1. Get the meeting
    const meeting = await airtable.getMeeting(id)
    if (!meeting) {
      throw new AppError('Meeting not found', 404)
    }

    // 2. Check if transcript exists
    const transcript = meeting.fields.Transcript
    if (!transcript) {
      throw new AppError('Meeting transcript not available', 400)
    }

    // 3. Get themes associated with this meeting
    const themes = await airtable.getThemesForMeeting(id)
    if (themes.length === 0) {
      throw new AppError('No themes associated with this meeting', 400)
    }

    // 4. Delete existing theme outputs for this meeting (for re-analysis)
    await airtable.deleteThemeOutputsForMeeting(id)

    // 5. Analyze the meeting for all themes
    const themesData = themes.map(t => ({
      id: t.id,
      name: t.fields.name,
      description: t.fields.description || '',
    }))

    const analysisResults = await analyzeMeetingForThemes(transcript, themesData)

    // 6. Store the results in theme_outputs table
    const createdOutputs: any[] = []

    for (const [themeId, analysis] of analysisResults.entries()) {
      // Skip themes with low confidence
      if (analysis.confidence < 0.6) {
        continue
      }

      // Create 4 records per theme: Summary, Action Items, Decisions, Questions
      const outputs = [
        {
          meeting_id: [id],
          theme_id: [themeId],
          output_type: 'Summary' as const,
          content: analysis.summary.map(s => `• ${s}`).join('\n'),
          confidence_score: analysis.confidence,
        },
        {
          meeting_id: [id],
          theme_id: [themeId],
          output_type: 'Action Items' as const,
          content: analysis.actionItems.map(a => `• ${a}`).join('\n'),
          confidence_score: analysis.confidence,
        },
        {
          meeting_id: [id],
          theme_id: [themeId],
          output_type: 'Decisions' as const,
          content: analysis.decisions.map(d => `• ${d}`).join('\n'),
          confidence_score: analysis.confidence,
        },
        {
          meeting_id: [id],
          theme_id: [themeId],
          output_type: 'Questions' as const,
          content: analysis.questions.map(q => `• ${q}`).join('\n'),
          confidence_score: analysis.confidence,
        },
      ]

      for (const output of outputs) {
        const created = await airtable.createThemeOutput(output)
        createdOutputs.push(created)
      }
    }

    // 7. Invalidate cache
    await cacheDelete(`${CACHE.KEYS.MEETINGS}:${id}:theme-summaries`)

    res.json({
      success: true,
      data: {
        meetingId: id,
        themesAnalyzed: analysisResults.size,
        outputsCreated: createdOutputs.length,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    })
  })
)

/**
 * GET /api/v1/meetings/:id/theme-summaries
 * Get all theme summaries for a meeting
 */
router.get(
  '/:id/theme-summaries',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params

    // Build cache key
    const cacheKey = `${CACHE.KEYS.MEETINGS}:${id}:theme-summaries`

    // Try cache first
    const cached = await cacheGet(cacheKey)
    if (cached) {
      res.json({
        success: true,
        data: cached,
        meta: { cached: true },
      })
      return
    }

    const airtable = getAirtableClient()

    // Get all theme outputs for this meeting
    const outputs = await airtable.getThemeOutputsForMeeting(id)

    // Group by theme
    const themeOutputsMap = new Map<string, any>()

    for (const output of outputs) {
      const themeId = output.fields.theme_id?.[0]
      if (!themeId) continue

      if (!themeOutputsMap.has(themeId)) {
        // Get theme details
        const theme = await airtable.getTheme(themeId)
        if (!theme) continue

        themeOutputsMap.set(themeId, {
          themeId,
          themeName: theme.fields.name,
          themeDescription: theme.fields.description,
          confidence: output.fields.confidence_score,
          summary: [],
          actionItems: [],
          decisions: [],
          questions: [],
        })
      }

      const themeData = themeOutputsMap.get(themeId)!
      const content = output.fields.content || ''

      // Parse bullet points (remove bullet markers)
      const bullets = content
        .split('\n')
        .map(line => line.replace(/^•\s*/, '').trim())
        .filter(line => line.length > 0)

      switch (output.fields.output_type) {
        case 'Summary':
          themeData.summary = bullets
          break
        case 'Action Items':
          themeData.actionItems = bullets
          break
        case 'Decisions':
          themeData.decisions = bullets
          break
        case 'Questions':
          themeData.questions = bullets
          break
      }
    }

    const result = Array.from(themeOutputsMap.values())

    // Cache for 1 hour
    await cacheSet(cacheKey, result, CACHE.TTL.MEDIUM)

    res.json({
      success: true,
      data: result,
      meta: {
        count: result.length,
        cached: false,
      },
    })
  })
)

export default router
