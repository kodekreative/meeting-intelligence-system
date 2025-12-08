/**
 * Team Member Token Service
 *
 * Handles secure token generation and retrieval for team member task pages.
 * This service is used by the email system to generate secure links.
 */

import Airtable from 'airtable'
import { randomUUID } from 'crypto'
import { AIRTABLE_TABLES } from '../lib/schema.js'

// Name mapping for team members (partial name -> full name)
const NAME_MAPPING: Record<string, string> = {
  'schmitt': 'Peter Schmitt',
  'collopy': 'Tim Collopy',
  'lowry': 'Mike Lowry',
  'conzelman': 'John Conzelman',
  'yang': 'Xiaobing Yang',
  'mason': 'Jon Mason',
  'maso': 'Jon Mason',
  'shansky': 'Bill Shansky',
  'hecker': 'Mike Hecker',
  'lemley': 'Lemley',
  'phillips': 'Ellie Phillips',
  'martinez': 'Katy Martinez',
  'peter': 'Peter Schmitt',
  'tim': 'Tim Collopy',
  'jon': 'Jon Mason',
  'joe': 'Joe',
  'steve': 'Steve',
  'ellie': 'Ellie Phillips',
  'katy': 'Katy Martinez',
  'bill': 'Bill Shansky',
  'mike': 'Mike Hecker',
  'william': 'William',
}

/**
 * Resolve partial names to full names
 */
function resolveFullName(name: string): string {
  const nameLower = name.toLowerCase().trim()
  if (name.includes(' ')) return name
  return NAME_MAPPING[nameLower] || name
}

/**
 * Get the Airtable base
 */
function getBase() {
  const apiKey = process.env.AIRTABLE_API_KEY
  const baseId = process.env.AIRTABLE_BASE_ID
  if (!apiKey || !baseId) {
    throw new Error('Airtable configuration missing')
  }
  return new Airtable({ apiKey }).base(baseId)
}

/**
 * Get or create a secure token for a team member
 *
 * @param assigneeName - The name of the team member
 * @param email - Optional email address
 * @returns The secure token for this team member
 */
export async function getOrCreateToken(assigneeName: string, email?: string): Promise<string> {
  const resolvedName = resolveFullName(assigneeName)
  const base = getBase()

  try {
    // Check if token already exists for this assignee
    const existingTokens = await base(AIRTABLE_TABLES.TEAM_MEMBER_TOKENS)
      .select({
        filterByFormula: `OR({Assignee Name} = "${assigneeName}", {Assignee Name} = "${resolvedName}")`,
        maxRecords: 1,
      })
      .all()

    if (existingTokens.length > 0) {
      const existing = existingTokens[0]
      const token = existing.get('Token') as string
      const isActive = existing.get('Is Active') as boolean

      // If token exists but is inactive, reactivate it with a new token
      if (!isActive) {
        const newToken = randomUUID()
        await base(AIRTABLE_TABLES.TEAM_MEMBER_TOKENS).update(existing.id, {
          'Token': newToken,
          'Is Active': true,
          'Email': email || existing.get('Email'),
        })
        return newToken
      }

      // Update email if provided and different
      if (email && email !== existing.get('Email')) {
        await base(AIRTABLE_TABLES.TEAM_MEMBER_TOKENS).update(existing.id, {
          'Email': email,
        })
      }

      return token
    }

    // Create new token
    const newToken = randomUUID()
    await base(AIRTABLE_TABLES.TEAM_MEMBER_TOKENS).create({
      'Assignee Name': resolvedName,
      'Token': newToken,
      'Email': email || '',
      'Is Active': true,
      'Access Count': 0,
    })

    return newToken
  } catch (error) {
    console.error('Failed to get or create token for', assigneeName, error)
    throw error
  }
}

/**
 * Generate the secure My Tasks URL for a team member
 *
 * @param assigneeName - The name of the team member
 * @param email - Optional email address
 * @returns The full URL to the secure task page
 */
export async function getSecureTasksUrl(assigneeName: string, email?: string): Promise<string> {
  const token = await getOrCreateToken(assigneeName, email)
  const baseUrl = process.env.NEXT_PUBLIC_WEB_URL || process.env.WEB_URL || 'http://localhost:3000'
  return `${baseUrl}/team-tasks/${token}`
}

/**
 * Get the legacy (non-secure) My Tasks URL
 * This is kept for backwards compatibility but should be phased out
 *
 * @deprecated Use getSecureTasksUrl instead
 */
export function getLegacyTasksUrl(assigneeName: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_WEB_URL || process.env.WEB_URL || 'http://localhost:3000'
  return `${baseUrl}/my-tasks?assignee=${encodeURIComponent(assigneeName)}`
}
