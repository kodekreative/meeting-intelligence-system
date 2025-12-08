// Quick test to check Airtable connection
import Airtable from 'airtable';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from root
dotenv.config({ path: join(__dirname, '../../.env') });

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

console.log('Testing Airtable connection...');
console.log('API Key:', apiKey?.substring(0, 20) + '...');
console.log('Base ID:', baseId);

Airtable.configure({ apiKey });
const base = Airtable.base(baseId);

// Try to list tables/bases accessible to this token
console.log('\n--- Testing table access ---');

// Test 1: Try with table name
console.log('\nTest 1: Using table name "Meetings"');
try {
  const records = await base('Meetings').select({ maxRecords: 1 }).all();
  console.log('✅ SUCCESS! Retrieved', records.length, 'record(s)');
  if (records.length > 0) {
    console.log('First record ID:', records[0].id);
    console.log('Fields:', Object.keys(records[0].fields));
  }
} catch (error) {
  console.log('❌ ERROR:', error.message);
  console.log('Error type:', error.error);
  console.log('Status code:', error.statusCode);
}

// Test 2: Try with table ID
console.log('\nTest 2: Using table ID "tbluMB1hHh3K5T9Ka"');
try {
  const records = await base('tbluMB1hHh3K5T9Ka').select({ maxRecords: 1 }).all();
  console.log('✅ SUCCESS! Retrieved', records.length, 'record(s)');
  if (records.length > 0) {
    console.log('First record ID:', records[0].id);
    console.log('Fields:', Object.keys(records[0].fields));
  }
} catch (error) {
  console.log('❌ ERROR:', error.message);
  console.log('Error type:', error.error);
  console.log('Status code:', error.statusCode);
}
