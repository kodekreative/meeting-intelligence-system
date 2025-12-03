/**
 * Script to add calendar URL to Users table
 * Run with: pnpm exec tsx scripts/add-calendar-url.ts
 */

import { getAirtableClient, initializeAirtable } from '../src/lib/client.js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

const CALENDAR_URL = 'https://outlook.office365.com/owa/calendar/de8758eb07184c479bd1b4940a8e9f9f@converselyai.com/f87c6f4b4aa3436c9b6da392774b57cd1206383154240992100/calendar.ics'

async function addCalendarUrl() {
  console.log('🔍 Looking for Users table...\n')

  // Initialize Airtable
  initializeAirtable({
    apiKey: process.env.AIRTABLE_API_KEY!,
    baseId: process.env.AIRTABLE_BASE_ID!,
  })

  const airtable = getAirtableClient()

  try {
    // Try to get all users
    const users = await airtable.findRecords('Users', {
      maxRecords: 10,
    })

    console.log(`✅ Found ${users.length} user(s)\n`)

    if (users.length === 0) {
      console.log('❌ No users found. Please create a user record first.')
      console.log('\nCreate a record in the Users table with:')
      console.log('  - Full Name: Peter Schmitt')
      console.log('  - Email: peter@converselyai.com')
      console.log('  - Is Active: checked')
      console.log('\nThen run this script again.')
      return
    }

    // Use the first user
    const user = users[0]
    console.log(`📝 Updating user: ${user.fields['Full Name'] || user.fields['Email'] || user.id}`)
    console.log(`   Record ID: ${user.id}`)

    // Update with calendar URL
    await airtable.updateRecord('Users', user.id, {
      'iCalendar URL': CALENDAR_URL,
      'Calendar Connected': true,
    })

    console.log('\n✅ Calendar URL added successfully!')
    console.log(`\n📅 Calendar URL: ${CALENDAR_URL}`)
    console.log(`\n🎯 Your User Record ID: ${user.id}`)
    console.log('\nNow update line 24 in apps/web/app/(dashboard)/settings/calendar-simple/page.tsx:')
    console.log(`   const demoUserId = '${user.id}'`)

  } catch (error: any) {
    console.error('\n❌ Error:', error.message)

    if (error.message?.includes('NOT_FOUND') || error.message?.includes('Could not find table')) {
      console.log('\n📋 The Users table does not exist yet. Creating it...')
      console.log('\nPlease create a table called "Users" in Airtable with these fields:')
      console.log('  1. Full Name (Single line text)')
      console.log('  2. Email (Email)')
      console.log('  3. Is Active (Checkbox)')
      console.log('  4. iCalendar URL (Long text)')
      console.log('  5. Calendar Connected (Checkbox)')
      console.log('  6. Last Calendar Sync (Date with time)')
      console.log('\nThen create one record with your information and run this script again.')
    }
  }
}

addCalendarUrl()
