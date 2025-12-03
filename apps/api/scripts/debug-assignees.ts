import { getAirtableClient, initializeAirtable } from '../src/lib/client.js'
import dotenv from 'dotenv'

dotenv.config({ path: '../../.env' })

async function main() {
  initializeAirtable({
    apiKey: process.env.AIRTABLE_API_KEY!,
    baseId: process.env.AIRTABLE_BASE_ID!,
  })

  const airtable = getAirtableClient()

  // Check action items
  console.log('📋 Checking Action Items...\n')
  const actionItems = await airtable.getActionItems({ maxRecords: 5 })

  for (const item of actionItems) {
    console.log(`Action Item: ${item.fields['Task Description']?.substring(0, 50)}`)
    console.log(`  Assignee field:`, item.fields.Assignee)
    console.log(`  Notes:`, item.fields.Notes)
    console.log('')
  }

  // Check contacts
  console.log('\n👥 Checking Contacts...\n')
  const contacts = await airtable.getContacts({})

  console.log(`Found ${contacts.length} total contacts`)
  for (const contact of contacts.slice(0, 10)) {
    console.log(`Contact ID: ${contact.id}`)
    console.log(`  Full Name:`, contact.fields['Full Name'])
    console.log(`  Email:`, contact.fields.Email)
    console.log('')
  }
}

main()
