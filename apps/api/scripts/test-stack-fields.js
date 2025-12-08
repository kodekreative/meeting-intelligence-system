import Airtable from 'airtable';
import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

async function testFields() {
  try {
    const records = await base('Tasks').select({ maxRecords: 1 }).firstPage();

    if (records.length === 0) {
      console.log('No tasks found');
      return;
    }

    const taskId = records[0].id;
    console.log('Testing with task:', taskId);

    // Test Stack ID
    try {
      await base('Tasks').update(taskId, { 'Stack ID': 'test-stack-123' });
      console.log('✓ Stack ID field exists');
      await base('Tasks').update(taskId, { 'Stack ID': '' });
    } catch (e) {
      console.log('✗ Stack ID field missing:', e.message);
    }

    // Test Stack Order
    try {
      await base('Tasks').update(taskId, { 'Stack Order': 1 });
      console.log('✓ Stack Order field exists');
      await base('Tasks').update(taskId, { 'Stack Order': null });
    } catch (e) {
      console.log('✗ Stack Order field missing:', e.message);
    }

    console.log('\nDone testing fields');
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testFields();
