/**
 * Migration Script: Copy Action Items to Tasks table
 *
 * This script migrates all existing action items to the Tasks table.
 * Run with: pnpm --filter=api exec tsx scripts/migrate-action-items-to-tasks.ts
 */

import Airtable from 'airtable'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '../../.env' })

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID in environment')
  process.exit(1)
}

const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID)

// Map Action Item status to Task status
const mapStatus = (actionItemStatus: string): string => {
  switch (actionItemStatus) {
    case 'Complete':
      return 'Done'
    case 'In Progress':
      return 'In Progress'
    case 'Overdue':
      return 'Open' // Treat overdue as backlog, they can be filtered by due date
    case 'Open':
    default:
      return 'Open'
  }
}

async function migrate() {
  console.log('Starting migration of Action Items to Tasks...\n')

  // First, get existing tasks to check for duplicates
  console.log('Fetching existing tasks...')
  const existingTasks = await base('Tasks').select().all()
  const existingSourceIds = new Set(
    existingTasks
      .map(t => t.get('Source Action Item ID') as string)
      .filter(Boolean)
  )
  console.log(`Found ${existingTasks.length} existing tasks (${existingSourceIds.size} from action items)\n`)

  // Fetch all action items
  console.log('Fetching action items...')
  const actionItems = await base('Action Items').select().all()
  console.log(`Found ${actionItems.length} action items\n`)

  // Filter out already migrated items
  const itemsToMigrate = actionItems.filter(item => !existingSourceIds.has(item.id))
  console.log(`${itemsToMigrate.length} items to migrate (${actionItems.length - itemsToMigrate.length} already migrated)\n`)

  if (itemsToMigrate.length === 0) {
    console.log('No items to migrate. Done!')
    return
  }

  // Migrate in batches of 10 (Airtable limit)
  const BATCH_SIZE = 10
  let migrated = 0
  let errors = 0

  for (let i = 0; i < itemsToMigrate.length; i += BATCH_SIZE) {
    const batch = itemsToMigrate.slice(i, i + BATCH_SIZE)

    const tasksToCreate = batch.map(item => {
      const fields = item.fields as Record<string, unknown>

      const taskFields: Record<string, unknown> = {
        'Name': fields['Task Description'] || 'Untitled Task',
        'Description': fields['Notes'] || '',
        'Status': mapStatus(fields['Status'] as string || 'Open'),
        'Priority': fields['Priority'] || 'Medium',
        'Source': 'Action Item',
        'Source Action Item ID': item.id,
      }

      // Add due date if present
      if (fields['Due Date']) {
        taskFields['Due Date'] = fields['Due Date']
      }

      // Add company link if present
      if (fields['Company'] && Array.isArray(fields['Company']) && fields['Company'].length > 0) {
        taskFields['Company'] = fields['Company']
      }

      // Add source meeting ID if present
      if (fields['Source Meeting'] && Array.isArray(fields['Source Meeting']) && fields['Source Meeting'].length > 0) {
        taskFields['Source Meeting ID'] = fields['Source Meeting'][0]
      }

      // Add completed date if status is Complete
      if (fields['Status'] === 'Complete' && fields['Completed At']) {
        taskFields['Completed Date'] = (fields['Completed At'] as string).split('T')[0]
      }

      return { fields: taskFields }
    })

    try {
      await base('Tasks').create(tasksToCreate)
      migrated += batch.length
      console.log(`Migrated ${migrated}/${itemsToMigrate.length} items...`)
    } catch (error) {
      console.error(`Error migrating batch starting at index ${i}:`, error)
      errors += batch.length
    }

    // Small delay to avoid rate limiting
    if (i + BATCH_SIZE < itemsToMigrate.length) {
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }

  console.log('\n=== Migration Complete ===')
  console.log(`Successfully migrated: ${migrated}`)
  console.log(`Errors: ${errors}`)
  console.log(`Total action items: ${actionItems.length}`)
}

migrate().catch(console.error)
