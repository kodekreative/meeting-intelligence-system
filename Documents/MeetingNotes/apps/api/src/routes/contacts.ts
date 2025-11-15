/**
 * Contacts Routes
 */

import { Router, Request, Response } from 'express'
import { getAirtableClient } from 'airtable-client'
import { asyncHandler } from '../middleware/errorHandler'
import { cacheGet, cacheSet } from '../utils/redis'
import { CACHE } from 'shared/constants'

const router = Router()

/**
 * GET /api/v1/contacts
 * Get all contacts with optional filtering
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { companyId, email } = req.query

    // Build cache key
    const cacheKey = `${CACHE.KEYS.CONTACTS}:${JSON.stringify(req.query)}`

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
    const contacts = await airtable.getContacts({
      companyId: companyId as string | undefined,
      email: email as string | undefined,
    })

    // Transform to API response format
    const transformedContacts = contacts.map((contact) => ({
      id: contact.id,
      fullName: contact.fields['Full Name'],
      email: contact.fields.Email,
      companyId: contact.fields.Company?.[0],
      role: contact.fields.Role,
      firstMet: contact.fields['First Met'],
      lastContact: contact.fields['Last Contact'],
      meetingCount: contact.fields['Meeting Count'] || 0,
      relationshipScore: contact.fields['Relationship Score'],
    }))

    // Cache the result
    await cacheSet(cacheKey, transformedContacts, CACHE.TTL.MEDIUM)

    res.json({
      success: true,
      data: transformedContacts,
      meta: {
        count: transformedContacts.length,
        cached: false,
      },
    })
  })
)

export default router
