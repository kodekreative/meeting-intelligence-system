/**
 * Delete All Action Items
 *
 * This script deletes all existing action item records from the Action Items table.
 * Use this before re-running the parser to avoid duplicates.
 */

import { getAirtableClient, initializeAirtable } from '../src/lib/client.js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '../../.env' })

async function main() {
  console.log('🗑️  Starting action items deletion...\n')

  // Initialize Airtable client
  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    throw new Error('Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID in .env file')
  }

  initializeAirtable({
    apiKey: process.env.AIRTABLE_API_KEY,
    baseId: process.env.AIRTABLE_BASE_ID,
  })

  const airtable = getAirtableClient()

  // Fetch all action items
  console.log('📥 Fetching action items from Airtable...')
  const actionItems = await airtable.getActionItems({ maxRecords: 1000 })
  console.log(`✓ Found ${actionItems.length} action items\n`)

  if (actionItems.length === 0) {
    console.log('✅ No action items to delete.')
    return
  }

  console.log('🗑️  Deleting action items...\n')

  let deleted = 0
  let failed = 0

  for (const item of actionItems) {
    try {
      await airtable.deleteActionItem(item.id)
      deleted++
      if (deleted % 10 === 0) {
        console.log(`   Deleted ${deleted}/${actionItems.length}...`)
      }
    } catch (error) {
      failed++
      console.error(`✗ Failed to delete item ${item.id}`)
      console.error(`  Error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  console.log(`\n✅ Complete!`)
  console.log(`   Deleted: ${deleted} action items`)
  if (failed > 0) {
    console.log(`   Failed: ${failed} action items`)
  }
}

// Run the script
main().catch((error) => {
  console.error('❌ Script failed:', error)
  process.exit(1)
})
