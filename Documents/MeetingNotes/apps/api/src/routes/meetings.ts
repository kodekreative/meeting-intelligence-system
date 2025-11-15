/**
 * Meetings Routes
 */

import { Router, Request, Response } from 'express'
import { getAirtableClient } from 'airtable-client'
import { asyncHandler, AppError } from '../middleware/errorHandler'
import { cacheGet, cacheSet } from '../utils/redis'
import { CACHE } from 'shared/constants'

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
      meetingDate: meeting.fields['Meeting Date'],
      title: meeting.fields.Name,
      participants: meeting.fields.Participants?.split(',').map((p) => p.trim()) || [],
      companyId: meeting.fields.Company?.[0],
      summary: meeting.fields.Summary,
      topics: meeting.fields.Topics || [],
      keyQuestions: meeting.fields['Key Questions'] || [],
      reportUrl: meeting.fields['Report URL'],
      processingStatus: meeting.fields['Processing Status'],
      processedAt: meeting.fields['Processed At'],
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
      meetingDate: meeting.fields['Meeting Date'],
      title: meeting.fields.Name,
      participants: meeting.fields.Participants?.split(',').map((p) => p.trim()) || [],
      companyId: meeting.fields.Company?.[0],
      summary: meeting.fields.Summary,
      transcript: meeting.fields.Transcript,
      topics: meeting.fields.Topics || [],
      keyQuestions: meeting.fields['Key Questions'] || [],
      reportUrl: meeting.fields['Report URL'],
      processingStatus: meeting.fields['Processing Status'],
      processedAt: meeting.fields['Processed At'],
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
      meetingDate: meeting.fields['Meeting Date'],
      title: meeting.fields.Name,
      participants: meeting.fields.Participants?.split(',').map((p) => p.trim()) || [],
      companyId: meeting.fields.Company?.[0],
      summary: meeting.fields.Summary,
      topics: meeting.fields.Topics || [],
      processingStatus: meeting.fields['Processing Status'],
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
