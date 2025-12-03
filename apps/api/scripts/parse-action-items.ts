/**
 * Parse Action Items from Meetings
 *
 * This script reads all meetings from Airtable, parses the "Action Items" text field,
 * and creates individual action item records in the Action Items table.
 */

import { getAirtableClient, initializeAirtable } from '../src/lib/client.js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '../../.env' })

interface ParsedActionItem {
  assigneeName: string
  taskDescription: string
  sourceMeetingId: string
  sourceMeetingTitle: string
}

/**
 * Parse action items text into individual items
 * Format: "Name will do something., Another Name will do something else."
 * or "Name will do something, Name will do something else"
 */
function parseActionItems(actionItemsText: string, meetingId: string, meetingTitle: string): ParsedActionItem[] {
  if (!actionItemsText || actionItemsText.trim() === '') {
    return []
  }

  const items: ParsedActionItem[] = []

  // First, split by ", " followed by a capital letter (comma-separated items)
  // Then also handle ". " separated items
  // This regex splits on either ", Name" or ". Name" patterns
  const segments = actionItemsText.split(/,\s+(?=[A-Z][a-z]+\s+will)|\.?\s+(?=[A-Z][a-z]+\s+will)/)

  for (const segment of segments) {
    let trimmed = segment.trim()
    if (!trimmed) continue

    // Remove trailing period or comma if present
    trimmed = trimmed.replace(/[,.]$/, '')

    // Extract assignee name (everything before "will")
    const willMatch = trimmed.match(/^(.+?)\s+will\s+(.+)$/i)

    if (willMatch) {
      const assigneeName = willMatch[1].trim()
      let taskDescription = willMatch[2].trim()

      // Remove trailing period if present
      if (taskDescription.endsWith('.')) {
        taskDescription = taskDescription.slice(0, -1)
      }

      items.push({
        assigneeName,
        taskDescription,
        sourceMeetingId: meetingId,
        sourceMeetingTitle: meetingTitle,
      })
    }
  }

  return items
}

async function main() {
  console.log('🚀 Starting action items parser...\n')

  // Initialize Airtable client
  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    throw new Error('Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID in .env file')
  }

  initializeAirtable({
    apiKey: process.env.AIRTABLE_API_KEY,
    baseId: process.env.AIRTABLE_BASE_ID,
  })

  const airtable = getAirtableClient()

  // Fetch all meetings
  console.log('📥 Fetching meetings from Airtable...')
  const meetings = await airtable.getMeetings({ maxRecords: 100 })
  console.log(`✓ Found ${meetings.length} meetings\n`)

  let totalActionItems = 0
  let processedMeetings = 0
  const allParsedItems: ParsedActionItem[] = []

  // Parse action items from each meeting
  for (const meeting of meetings) {
    const actionItemsText = meeting.fields['Action Items']
    const meetingTitle = meeting.fields.Title || meeting.fields.Name || 'Untitled Meeting'

    if (!actionItemsText) {
      continue
    }

    const parsedItems = parseActionItems(actionItemsText, meeting.id, meetingTitle)

    if (parsedItems.length > 0) {
      processedMeetings++
      totalActionItems += parsedItems.length

      console.log(`📋 ${meetingTitle}`)
      console.log(`   Found ${parsedItems.length} action items:`)

      for (const item of parsedItems) {
        console.log(`   - ${item.assigneeName}: ${item.taskDescription}`)
        allParsedItems.push(item)
      }
      console.log('')
    }
  }

  console.log(`\n📊 Summary:`)
  console.log(`   Meetings processed: ${processedMeetings}`)
  console.log(`   Total action items found: ${totalActionItems}\n`)

  // Create action items with assignee text
  console.log('💾 Creating action items in Airtable...\n')

  let created = 0
  let failed = 0

  for (const item of allParsedItems) {
    try {
      await airtable.createActionItem({
        'Task Description': item.taskDescription,
        'Assignee': item.assigneeName,
        'Source Meeting': [item.sourceMeetingId],
        'Status': 'Open',
        'Priority': 'Medium',
        'Notes': `From: ${item.sourceMeetingTitle}`,
      })
      created++
      console.log(`✓ Created: ${item.assigneeName} - ${item.taskDescription.substring(0, 60)}${item.taskDescription.length > 60 ? '...' : ''}`)
    } catch (error) {
      failed++
      console.error(`✗ Failed: ${item.assigneeName} - ${item.taskDescription.substring(0, 60)}`)
      console.error(`  Error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  console.log(`\n✅ Complete!`)
  console.log(`   Created: ${created} action items`)
  if (failed > 0) {
    console.log(`   Failed: ${failed} action items`)
  }
}

// Run the script
main().catch((error) => {
  console.error('❌ Script failed:', error)
  process.exit(1)
})
