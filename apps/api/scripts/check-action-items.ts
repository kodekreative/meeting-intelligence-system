import { getAirtableClient, initializeAirtable } from '../src/lib/client.js'
import dotenv from 'dotenv'

dotenv.config({ path: '../../.env' })

async function main() {
  initializeAirtable({
    apiKey: process.env.AIRTABLE_API_KEY!,
    baseId: process.env.AIRTABLE_BASE_ID!,
  })

  const airtable = getAirtableClient()
  const meetings = await airtable.getMeetings({ maxRecords: 5 })

  console.log('Sample Action Items from Meetings:\n')

  meetings.forEach(m => {
    const actionItems = m.fields['Action Items']
    if (actionItems) {
      console.log('Meeting:', m.fields.Title || m.fields.Name)
      console.log('Action Items Text:')
      console.log(actionItems)
      console.log('\n---\n')
    }
  })
}

main()
