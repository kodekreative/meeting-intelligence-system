/**
 * Create Contact Records for Assignees
 *
 * This script creates contact records for all unique assignee names
 * found in the action items, so they can be properly linked.
 */

import { getAirtableClient, initializeAirtable } from '../src/lib/client.js'
import dotenv from 'dotenv'

dotenv.config({ path: '../../.env' })

async function main() {
  console.log('🚀 Creating contacts for assignees...\n')

  initializeAirtable({
    apiKey: process.env.AIRTABLE_API_KEY!,
    baseId: process.env.AIRTABLE_BASE_ID!,
  })

  const airtable = getAirtableClient()

  // Get all action items
  const actionItems = await airtable.getActionItems({ maxRecords: 1000 })

  // Extract unique assignee names from Notes field
  const assigneeNames = new Set<string>()

  for (const item of actionItems) {
    const notes = item.fields.Notes
    if (notes) {
      const match = notes.match(/Assignee: (.+?)(\n|$)/)
      if (match) {
        assigneeNames.add(match[1].trim())
      }
    }
  }

  console.log(`Found ${assigneeNames.size} unique assignees\n`)

  // Get existing contacts
  const existingContacts = await airtable.getContacts({})
  console.log(`Found ${existingContacts.length} existing contacts\n`)

  // Create contacts for each assignee
  let created = 0
  for (const name of Array.from(assigneeNames)) {
    try {
      // Try creating with just the name as the primary field
      // Airtable will use the first text field as the primary field
      const contact = await airtable.base('Contacts').create({
        'Name': name,
      })
      console.log(`✓ Created contact: ${name} (ID: ${contact.id})`)
      created++
    } catch (error) {
      console.error(`✗ Failed to create contact: ${name}`)
      console.error(`  Error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  console.log(`\n✅ Created ${created} contacts`)
}

main()
