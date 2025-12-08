/**
 * Themes Routes
 * API endpoints for theme management and meeting tagging
 */

import { Router, Request, Response } from 'express'
import { getAirtableClient } from '../lib/client.js'
import { AIRTABLE_TABLES } from '../lib/schema.js'
import { asyncHandler, AppError } from '../middleware/errorHandler.js'
import { cacheGet, cacheSet, cacheDelete, cacheDeletePattern } from '../utils/redis.js'
import { CACHE } from '../shared/constants.js'
import {
  createThemeSchema,
  updateThemeSchema,
  tagMeetingSchema,
  untagMeetingSchema,
} from '../shared/schemas.js'

const router = Router()

/**
 * GET /api/v1/themes
 * Get all themes with optional filtering
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { companyId, isActive } = req.query

    // Build cache key
    const cacheKey = `${CACHE.KEYS.THEMES}:${JSON.stringify(req.query)}`

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
    const themes = await airtable.getThemes({
      companyId: companyId as string | undefined,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    })

    // Transform to API response format
    const transformedThemes = themes.map((theme) => ({
      id: theme.id,
      name: theme.fields.name,
      description: theme.fields.description,
      colorCode: theme.fields.color_code,
      icon: theme.fields.icon,
      companyId: theme.fields.company_id,
      isActive: theme.fields.is_active,
      createdAt: theme.fields.created_at,
      updatedAt: theme.fields.updated_at,
    }))

    // Cache the result
    await cacheSet(cacheKey, transformedThemes, CACHE.TTL.MEDIUM)

    res.json({
      success: true,
      data: transformedThemes,
      meta: {
        count: transformedThemes.length,
        cached: false,
      },
    })
  })
)

/**
 * GET /api/v1/themes/:id
 * Get a single theme by ID
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params

    // Try cache first
    const cacheKey = `${CACHE.KEYS.THEMES}:${id}`
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
    const theme = await airtable.getTheme(id)

    if (!theme) {
      throw new AppError('Theme not found', 404)
    }

    // Transform to API response format
    const transformedTheme = {
      id: theme.id,
      name: theme.fields.name,
      description: theme.fields.description,
      colorCode: theme.fields.color_code,
      icon: theme.fields.icon,
      companyId: theme.fields.company_id,
      isActive: theme.fields.is_active,
      createdAt: theme.fields.created_at,
      updatedAt: theme.fields.updated_at,
    }

    // Cache the result
    await cacheSet(cacheKey, transformedTheme, CACHE.TTL.MEDIUM)

    res.json({
      success: true,
      data: transformedTheme,
    })
  })
)

/**
 * POST /api/v1/themes
 * Create a new theme
 */
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const validatedData = createThemeSchema.parse(req.body)

    // Create theme in Airtable
    const airtable = getAirtableClient()
    const now = new Date().toISOString()

    const theme = await airtable.createTheme({
      name: validatedData.name,
      description: validatedData.description,
      color_code: validatedData.colorCode,
      icon: validatedData.icon,
      company_id: validatedData.companyId,
      is_active: true,
      created_at: now,
      updated_at: now,
    })

    // Invalidate themes cache
    await cacheDelete(`${CACHE.KEYS.THEMES}:*`)

    // Transform to API response format
    const transformedTheme = {
      id: theme.id,
      name: theme.fields.name,
      description: theme.fields.description,
      colorCode: theme.fields.color_code,
      icon: theme.fields.icon,
      companyId: theme.fields.company_id,
      isActive: theme.fields.is_active,
      createdAt: theme.fields.created_at,
      updatedAt: theme.fields.updated_at,
    }

    res.status(201).json({
      success: true,
      data: transformedTheme,
    })
  })
)

/**
 * PATCH /api/v1/themes/:id
 * Update a theme
 */
router.patch(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params

    // Validate request body
    const validatedData = updateThemeSchema.parse(req.body)

    // Build updates object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (validatedData.name !== undefined) {
      updates.name = validatedData.name
    }
    if (validatedData.description !== undefined) {
      updates.description = validatedData.description
    }
    if (validatedData.colorCode !== undefined) {
      updates.color_code = validatedData.colorCode
    }
    if (validatedData.icon !== undefined) {
      updates.icon = validatedData.icon
    }
    if (validatedData.isActive !== undefined) {
      updates.is_active = validatedData.isActive
    }

    // Update in Airtable
    const airtable = getAirtableClient()
    const theme = await airtable.updateTheme(id, updates as any)

    // Invalidate cache - use pattern deletion for wildcard
    await cacheDelete(`${CACHE.KEYS.THEMES}:${id}`)
    await cacheDeletePattern(`${CACHE.KEYS.THEMES}:*`)

    // Transform to API response format
    const transformedTheme = {
      id: theme.id,
      name: theme.fields.name,
      description: theme.fields.description,
      colorCode: theme.fields.color_code,
      icon: theme.fields.icon,
      companyId: theme.fields.company_id,
      isActive: theme.fields.is_active,
      createdAt: theme.fields.created_at,
      updatedAt: theme.fields.updated_at,
    }

    res.json({
      success: true,
      data: transformedTheme,
    })
  })
)

/**
 * DELETE /api/v1/themes/:id
 * Soft delete a theme (sets is_active to false)
 */
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params

    // Soft delete in Airtable
    const airtable = getAirtableClient()
    await airtable.deleteTheme(id)

    // Invalidate cache
    await cacheDelete(`${CACHE.KEYS.THEMES}:${id}`)
    await cacheDelete(`${CACHE.KEYS.THEMES}:*`)

    res.json({
      success: true,
      message: 'Theme deleted successfully',
    })
  })
)

/**
 * POST /api/v1/themes/tag
 * Tag a meeting with one or more themes
 */
router.post(
  '/tag',
  asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const validatedData = tagMeetingSchema.parse(req.body)

    // Tag meeting in Airtable
    const airtable = getAirtableClient()
    const meetingThemes = await airtable.tagMeeting(
      validatedData.meetingId,
      validatedData.themeIds,
      validatedData.createdBy,
      validatedData.notes
    )

    // Invalidate relevant caches
    await cacheDelete(`${CACHE.KEYS.MEETINGS}:${validatedData.meetingId}`)
    await cacheDelete(`${CACHE.KEYS.MEETING_THEMES}:*`)
    for (const themeId of validatedData.themeIds) {
      await cacheDelete(`${CACHE.KEYS.THEME_METRICS}:${themeId}`)
    }

    res.status(201).json({
      success: true,
      data: meetingThemes.map((mt) => ({
        id: mt.id,
        meetingId: mt.fields.meeting_id?.[0],
        themeId: mt.fields.theme_id?.[0],
        notes: mt.fields.notes,
        createdAt: mt.fields.created_at,
        createdBy: mt.fields.created_by,
      })),
    })
  })
)

/**
 * DELETE /api/v1/themes/untag
 * Remove a theme tag from a meeting
 */
router.delete(
  '/untag',
  asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const validatedData = untagMeetingSchema.parse(req.body)

    // Untag meeting in Airtable
    const airtable = getAirtableClient()
    await airtable.untagMeeting(validatedData.meetingId, validatedData.themeId)

    // Invalidate relevant caches
    await cacheDelete(`${CACHE.KEYS.MEETINGS}:${validatedData.meetingId}`)
    await cacheDelete(`${CACHE.KEYS.MEETING_THEMES}:*`)
    await cacheDelete(`${CACHE.KEYS.THEME_METRICS}:${validatedData.themeId}`)

    res.json({
      success: true,
      message: 'Theme tag removed successfully',
    })
  })
)

/**
 * POST /api/v1/themes/tag-company
 * Tag a company (meeting title) with themes
 */
router.post(
  '/tag-company',
  asyncHandler(async (req: Request, res: Response) => {
    const { companyId, themeIds } = req.body

    if (!companyId || !Array.isArray(themeIds) || themeIds.length === 0) {
      throw new AppError('Company ID and theme IDs are required', 400)
    }

    const airtable = getAirtableClient()

    // Get existing company
    const companies = await airtable.getCompanies()
    const company = companies.find(c => c.id === companyId)

    if (!company) {
      throw new AppError('Company not found', 404)
    }

    // Merge themes
    const currentThemes = company.fields.theme || []
    const updatedThemes = Array.from(new Set([...currentThemes, ...themeIds]))

    // Update via the base directly
    await airtable.base(AIRTABLE_TABLES.COMPANIES).update(companyId, {
      theme: updatedThemes,
    } as any)

    // Invalidate caches
    await cacheDelete(`${CACHE.KEYS.COMPANIES}:*`)
    for (const themeId of themeIds) {
      await cacheDelete(`${CACHE.KEYS.THEME_METRICS}:${themeId}`)
    }

    res.status(201).json({
      success: true,
      data: { companyId, themeIds: updatedThemes },
    })
  })
)

/**
 * DELETE /api/v1/themes/untag-company
 * Remove theme from a company
 */
router.delete(
  '/untag-company',
  asyncHandler(async (req: Request, res: Response) => {
    const { companyId, themeId } = req.body

    if (!companyId || !themeId) {
      throw new AppError('Company ID and theme ID are required', 400)
    }

    const airtable = getAirtableClient()

    // Get existing company
    const companies = await airtable.getCompanies()
    const company = companies.find(c => c.id === companyId)

    if (!company) {
      throw new AppError('Company not found', 404)
    }

    // Remove theme
    const currentThemes = company.fields.theme || []
    const updatedThemes = currentThemes.filter(id => id !== themeId)

    // Update
    await airtable.base(AIRTABLE_TABLES.COMPANIES).update(companyId, {
      theme: updatedThemes,
    } as any)

    // Invalidate caches
    await cacheDelete(`${CACHE.KEYS.COMPANIES}:*`)
    await cacheDelete(`${CACHE.KEYS.THEME_METRICS}:${themeId}`)

    res.json({
      success: true,
      message: 'Theme removed from company successfully',
    })
  })
)

/**
 * GET /api/v1/themes/:id/companies
 * Get all companies tagged with a specific theme
 */
router.get(
  '/:id/companies',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params

    const cacheKey = `${CACHE.KEYS.THEMES}:${id}:companies`
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
    const allCompanies = await airtable.getCompanies()

    // Filter companies that have this theme
    const companiesWithTheme = allCompanies.filter(company =>
      company.fields.theme?.includes(id)
    )

    // Transform to API response
    const transformedCompanies = companiesWithTheme.map(company => ({
      id: company.id,
      name: company.fields['Company Name'],
      type: company.fields.Type,
      relationshipStatus: company.fields['Relationship Status'],
      industry: company.fields.Industry,
      meetingCount: company.fields['Meeting Count'],
      firstMeetingDate: company.fields['First Meeting Date'],
      lastMeetingDate: company.fields['Last Meeting Date'],
    }))

    await cacheSet(cacheKey, transformedCompanies, CACHE.TTL.MEDIUM)

    res.json({
      success: true,
      data: transformedCompanies,
      meta: {
        count: transformedCompanies.length,
        cached: false,
      },
    })
  })
)

/**
 * GET /api/v1/themes/:id/meetings
 * Get all meetings tagged with a specific theme
 */
router.get(
  '/:id/meetings',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params

    // Try cache first
    const cacheKey = `${CACHE.KEYS.THEMES}:${id}:meetings`
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
    const meetings = await airtable.getMeetingsForTheme(id)

    // Transform to API response format
    const transformedMeetings = meetings.map((meeting) => ({
      id: meeting.id,
      name: meeting.fields.Name,
      sessionId: meeting.fields['Session ID'],
      title: meeting.fields.Title,
      startTime: meeting.fields['Start Time'],
      participants: meeting.fields.Participants,
      ownerName: meeting.fields['Owner Name'],
      ownerEmail: meeting.fields['Owner Email'],
      summary: meeting.fields['Meeting Summary'],
      reportUrl: meeting.fields['Report URL'],
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
 * GET /api/v1/themes/:id/metrics
 * Get metrics for a specific theme (meeting count, action items, etc.)
 */
router.get(
  '/:id/metrics',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params

    // Try cache first
    const cacheKey = `${CACHE.KEYS.THEME_METRICS}:${id}`
    const cached = await cacheGet(cacheKey)
    if (cached) {
      res.json({
        success: true,
        data: cached,
        meta: { cached: true },
      })
      return
    }

    // Fetch theme and related data
    const airtable = getAirtableClient()
    const theme = await airtable.getTheme(id)

    if (!theme) {
      throw new AppError('Theme not found', 404)
    }

    // Get meetings for this theme
    const meetings = await airtable.getMeetingsForTheme(id)

    // Get action items and business issues with this theme
    const allActionItems = await airtable.getActionItems()
    const allBusinessIssues = await airtable.getBusinessIssues()

    const actionItemsWithTheme = allActionItems.filter((item) =>
      item.fields.theme?.includes(id)
    )
    const issuesWithTheme = allBusinessIssues.filter((issue) =>
      issue.fields.theme?.includes(id)
    )

    // Find last discussed date
    const lastDiscussedAt = meetings.length > 0
      ? meetings.reduce((latest, meeting) => {
          const meetingDate = meeting.fields['Start Time']
          if (!meetingDate) return latest
          const date = new Date(meetingDate)
          return !latest || date > new Date(latest) ? meetingDate : latest
        }, meetings[0].fields['Start Time'])
      : undefined

    // Build metrics
    const metrics = {
      themeId: theme.id,
      themeName: theme.fields.name,
      colorCode: theme.fields.color_code,
      icon: theme.fields.icon,
      meetingCount: meetings.length,
      actionItemCount: actionItemsWithTheme.length,
      issueCount: issuesWithTheme.length,
      lastDiscussedAt,
      createdAt: theme.fields.created_at,
    }

    // Cache the result with 5-minute TTL
    await cacheSet(cacheKey, metrics, CACHE.TTL.MEDIUM)

    res.json({
      success: true,
      data: metrics,
      meta: { cached: false },
    })
  })
)

export default router
