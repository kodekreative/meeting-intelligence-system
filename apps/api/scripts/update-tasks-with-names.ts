/**
 * Update Tasks with Assignee Names and Meeting Titles
 *
 * This script updates existing tasks with assignee names and meeting titles
 * from their source action items and meetings.
 *
 * Run with: pnpm --filter=api exec tsx scripts/update-tasks-with-names.ts
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

async function updateTasks() {
  console.log('Fetching action items for assignee lookup...')
  const actionItems = await base('Action Items').select().all()
  const actionItemMap = new Map<string, { assignee?: string; meetingTitle?: string }>()

  actionItems.forEach(item => {
    const fields = item.fields as Record<string, unknown>
    actionItemMap.set(item.id, {
      assignee: fields['Assignee'] as string | undefined,
      meetingTitle: (fields['Title'] as string[] | undefined)?.[0],
    })
  })
  console.log(`Loaded ${actionItemMap.size} action items\n`)

  console.log('Fetching meetings for title lookup...')
  const meetings = await base('tbluMB1hHh3K5T9Ka').select().all()
  const meetingMap = new Map<string, string>()

  meetings.forEach(meeting => {
    const title = meeting.get('Title') as string
    if (title) {
      meetingMap.set(meeting.id, title)
    }
  })
  console.log(`Loaded ${meetingMap.size} meetings\n`)

  console.log('Fetching tasks...')
  const tasks = await base('Tasks').select().all()
  console.log(`Found ${tasks.length} tasks\n`)

  // Filter tasks that need updating
  const tasksToUpdate = tasks.filter(task => {
    const assigneeName = task.get('Assignee Name')
    const meetingTitle = task.get('Source Meeting Title')
    const sourceActionItemId = task.get('Source Action Item ID') as string
    const sourceMeetingId = task.get('Source Meeting ID') as string

    // Need to update if missing assignee or meeting title and we have source data
    return (!assigneeName && sourceActionItemId) || (!meetingTitle && sourceMeetingId)
  })

  console.log(`${tasksToUpdate.length} tasks need updating\n`)

  if (tasksToUpdate.length === 0) {
    console.log('All tasks are up to date!')
    return
  }

  // Update in batches of 10
  const BATCH_SIZE = 10
  let updated = 0
  let errors = 0

  for (let i = 0; i < tasksToUpdate.length; i += BATCH_SIZE) {
    const batch = tasksToUpdate.slice(i, i + BATCH_SIZE)

    const updates = batch.map(task => {
      const sourceActionItemId = task.get('Source Action Item ID') as string
      const sourceMeetingId = task.get('Source Meeting ID') as string

      const fields: Record<string, unknown> = {}

      // Get assignee from action item
      if (sourceActionItemId && actionItemMap.has(sourceActionItemId)) {
        const actionItem = actionItemMap.get(sourceActionItemId)!
        if (actionItem.assignee) {
          fields['Assignee Name'] = actionItem.assignee
        }
        // Also try to get meeting title from action item's linked meeting
        if (actionItem.meetingTitle && !task.get('Source Meeting Title')) {
          fields['Source Meeting Title'] = actionItem.meetingTitle
        }
      }

      // Get meeting title from meeting
      if (sourceMeetingId && meetingMap.has(sourceMeetingId)) {
        fields['Source Meeting Title'] = meetingMap.get(sourceMeetingId)
      }

      return {
        id: task.id,
        fields,
      }
    }).filter(update => Object.keys(update.fields).length > 0)

    if (updates.length === 0) continue

    try {
      await base('Tasks').update(updates)
      updated += updates.length
      console.log(`Updated ${updated}/${tasksToUpdate.length} tasks...`)
    } catch (error) {
      console.error(`Error updating batch:`, error)
      errors += updates.length
    }

    // Small delay to avoid rate limiting
    if (i + BATCH_SIZE < tasksToUpdate.length) {
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }

  console.log('\n=== Update Complete ===')
  console.log(`Successfully updated: ${updated}`)
  console.log(`Errors: ${errors}`)
}

updateTasks().catch(console.error)
