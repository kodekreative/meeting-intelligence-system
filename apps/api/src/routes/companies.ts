/**
 * Companies Routes
 */

import { Router, Request, Response } from 'express'
import { getAirtableClient } from '../lib/client.js'
import { asyncHandler, AppError } from '../middleware/errorHandler.js'
import { cacheGet, cacheSet } from '../utils/redis.js'
import { CACHE } from '../shared/constants.js'

const router: Router = Router()

/**
 * GET /api/v1/companies
 * Get all companies with optional filtering
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { type, relationshipStatus } = req.query

    // Build cache key
    const cacheKey = `${CACHE.KEYS.COMPANIES}:${JSON.stringify(req.query)}`

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
    const companies = await airtable.getCompanies({
      type: type as string | undefined,
      relationshipStatus: relationshipStatus as string | undefined,
    })

    // Transform to API response format
    const transformedCompanies = companies.map((company) => ({
      id: company.id,
      name: company.fields['Company Name'],
      type: company.fields.Type,
      relationshipStatus: company.fields['Relationship Status'],
      industry: company.fields.Industry,
      ownerId: company.fields.Owner?.[0],
      firstMeetingDate: company.fields['First Meeting Date'],
      lastMeetingDate: company.fields['Last Meeting Date'],
      meetingCount: company.fields['Meeting Count'] || 0,
    }))

    // Cache the result
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

export default router
