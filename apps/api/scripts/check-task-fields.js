// Quick script to check what fields are available in the Tasks table
import Airtable from 'airtable'
import dotenv from 'dotenv'

dotenv.config()

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

async function main() {
  try {
    const records = await base('Tasks').select({ maxRecords: 3 }).all()

    console.log('=== Task Fields Available ===')
    if (records.length > 0) {
      const record = records[0]
      console.log('Record ID:', record.id)
      console.log('Fields:', Object.keys(record.fields))
      console.log('\nAll field values:')
      for (const [key, value] of Object.entries(record.fields)) {
        console.log(`  ${key}:`, value)
      }
    }
  } catch (error) {
    console.error('Error:', error)
  }
}

main()
