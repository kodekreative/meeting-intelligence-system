/**
 * Meetings Routes
 */

import { Router, Request, Response } from 'express'
import { getAirtableClient } from '../lib/client.js'
import { asyncHandler, AppError } from '../middleware/errorHandler.js'
import { cacheGet, cacheSet } from '../utils/redis.js'
import { CACHE } from '../shared/constants.js'

const router = Router()

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
    const transformedMeetings = meetings.map((meeting) => ({
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
    }))

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

    const transformedMeetings = meetings.map((meeting) => ({
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
    }))

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

export default router
