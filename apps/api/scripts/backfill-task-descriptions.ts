/**
 * Backfill Task Descriptions from Meeting Transcripts
 *
 * This script updates existing tasks that have empty or redundant descriptions
 * by extracting context from their source meeting transcripts.
 *
 * Usage: pnpm --filter=api exec tsx scripts/backfill-task-descriptions.ts
 */

import Airtable from 'airtable'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID environment variables')
  process.exit(1)
}

Airtable.configure({ apiKey: AIRTABLE_API_KEY })
const base = Airtable.base(AIRTABLE_BASE_ID)

// Table names
const TASKS_TABLE = 'Tasks'
const MEETINGS_TABLE = 'Table 1' // This is the Meetings table

interface Task {
  id: string
  name: string
  description?: string
  sourceMeetingId?: string
}

interface Meeting {
  id: string
  transcript?: string
}

/**
 * Extract relevant context from a meeting transcript for a given action item
 * Finds the exact phrase in the transcript and highlights it with == markers
 */
function extractContextFromTranscript(transcript: string, actionItem: string): string {
  if (!transcript || !actionItem) return ''

  // Extract key phrases from action item (looking for the longest matching phrase)
  const actionLower = actionItem.toLowerCase()
  const words = actionLower.split(/\s+/).filter(w => w.length > 2)
  const transcriptLower = transcript.toLowerCase()

  // Find the best matching phrase and its position in the transcript
  let bestPhrase = ''
  let bestPhrasePos = -1

  // Try progressively smaller phrases from the action item
  for (let phraseLen = Math.min(6, words.length); phraseLen >= 3; phraseLen--) {
    for (let start = 0; start <= words.length - phraseLen; start++) {
      const phrase = words.slice(start, start + phraseLen).join(' ')
      const pos = transcriptLower.indexOf(phrase)
      if (pos !== -1 && phrase.length > bestPhrase.length) {
        bestPhrase = phrase
        bestPhrasePos = pos
      }
    }
    // If we found a good match, stop looking for shorter phrases
    if (bestPhrase.length >= 20) break
  }

  // If no phrase match, try to find 2+ key words close together
  if (bestPhrasePos === -1) {
    const keyWords = words.filter(w => w.length > 4)
    for (const word of keyWords) {
      const pos = transcriptLower.indexOf(word)
      if (pos !== -1) {
        bestPhrasePos = pos
        bestPhrase = word
        break
      }
    }
  }

  if (bestPhrasePos === -1) return ''

  // Extract context around the match (300 chars before, 200 chars after)
  const contextStart = Math.max(0, bestPhrasePos - 300)
  const contextEnd = Math.min(transcript.length, bestPhrasePos + bestPhrase.length + 200)

  // Find the actual phrase in the original transcript (preserve case)
  const matchStart = bestPhrasePos - contextStart
  const matchEnd = matchStart + bestPhrase.length

  let context = transcript.substring(contextStart, contextEnd)

  // Find the actual text that matches (preserving original case)
  const actualMatchText = context.substring(matchStart, matchEnd)

  // Insert highlight markers around the matching phrase
  context =
    context.substring(0, matchStart) +
    '==' + actualMatchText + '==' +
    context.substring(matchEnd)

  // Clean up: add ellipsis if we truncated
  if (contextStart > 0) {
    // Find first sentence/phrase boundary
    const firstBreak = context.indexOf('. ')
    if (firstBreak > 0 && firstBreak < 50) {
      context = context.substring(firstBreak + 2)
    }
    context = '...' + context
  }
  if (contextEnd < transcript.length) {
    // Find last sentence/phrase boundary
    const lastBreak = context.lastIndexOf('. ')
    if (lastBreak > context.length - 50 && lastBreak > 0) {
      context = context.substring(0, lastBreak + 1)
    }
    context = context + '...'
  }

  // Truncate if still too long
  if (context.length > 800) {
    context = context.substring(0, 797) + '...'
  }

  return context.trim()
}

/**
 * Check if a description is redundant (empty or just "From: Meeting Title")
 */
function isRedundantDescription(description?: string): boolean {
  if (!description?.trim()) return true
  const lower = description.toLowerCase()
  return lower.startsWith('from:') || lower.startsWith('from ')
}

async function main() {
  console.log('🚀 Starting task description backfill...\n')

  // Step 1: Fetch all tasks
  console.log('📋 Fetching tasks...')
  const taskRecords = await base(TASKS_TABLE).select().all()
  console.log(`   Found ${taskRecords.length} tasks\n`)

  // Filter tasks that need updating (have source meeting - re-extract all to get more context)
  const tasksToUpdate: Task[] = []
  for (const record of taskRecords) {
    const sourceMeetingId = record.get('Source Meeting ID') as string | undefined
    const description = record.get('Description') as string | undefined
    const name = record.get('Name') as string

    // Update all tasks with source meetings to get expanded context
    if (sourceMeetingId) {
      tasksToUpdate.push({
        id: record.id,
        name,
        description,
        sourceMeetingId,
      })
    }
  }

  console.log(`📝 Found ${tasksToUpdate.length} tasks that need description updates\n`)

  if (tasksToUpdate.length === 0) {
    console.log('✅ No tasks need updating. Done!')
    return
  }

  // Step 2: Get unique meeting IDs
  const meetingIds = [...new Set(tasksToUpdate.map(t => t.sourceMeetingId!))]
  console.log(`📅 Fetching ${meetingIds.length} meetings for transcripts...\n`)

  // Step 3: Fetch meetings and cache transcripts
  const meetingTranscripts = new Map<string, string>()

  for (const meetingId of meetingIds) {
    try {
      const meeting = await base(MEETINGS_TABLE).find(meetingId)
      const transcript = meeting.get('Transcript Speakers') as string | undefined
      if (transcript) {
        meetingTranscripts.set(meetingId, transcript)
        console.log(`   ✓ Loaded transcript for meeting ${meetingId} (${transcript.length} chars)`)
      } else {
        console.log(`   ⚠ No transcript for meeting ${meetingId}`)
      }
    } catch (error) {
      console.log(`   ✗ Failed to fetch meeting ${meetingId}:`, error)
    }
  }

  console.log(`\n📄 Loaded ${meetingTranscripts.size} transcripts\n`)

  // Step 4: Update tasks with extracted context
  let updated = 0
  let skipped = 0
  let failed = 0

  for (const task of tasksToUpdate) {
    const transcript = meetingTranscripts.get(task.sourceMeetingId!)

    if (!transcript) {
      console.log(`⚠ Skipping "${task.name.substring(0, 50)}..." - no transcript available`)
      skipped++
      continue
    }

    const context = extractContextFromTranscript(transcript, task.name)

    if (!context) {
      console.log(`⚠ Skipping "${task.name.substring(0, 50)}..." - no matching context found`)
      skipped++
      continue
    }

    try {
      await base(TASKS_TABLE).update(task.id, {
        'Description': context,
      })
      console.log(`✓ Updated "${task.name.substring(0, 50)}..."`)
      console.log(`  Context: "${context.substring(0, 100)}..."\n`)
      updated++
    } catch (error) {
      console.log(`✗ Failed to update "${task.name.substring(0, 50)}...":`, error)
      failed++
    }

    // Rate limiting - Airtable allows 5 requests per second
    await new Promise(resolve => setTimeout(resolve, 250))
  }

  console.log('\n' + '='.repeat(50))
  console.log('📊 Summary:')
  console.log(`   ✓ Updated: ${updated}`)
  console.log(`   ⚠ Skipped: ${skipped}`)
  console.log(`   ✗ Failed: ${failed}`)
  console.log('='.repeat(50))
  console.log('\n✅ Backfill complete!')
}

main().catch(console.error)
