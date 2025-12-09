/**
 * Standalone script to test daily digest email
 * Run with: node test-email.js
 */

import { Resend } from 'resend'
import Airtable from 'airtable'

// Initialize Airtable
const airtable = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
const base = airtable.base(process.env.AIRTABLE_BASE_ID)

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY)

async function sendTestDigest() {
  console.log('Fetching meeting data from Airtable...')

  // Get all meetings (no date filter)
  const meetingsTable = base(process.env.AIRTABLE_MEETINGS_TABLE || 'Meetings')
  const meetingRecords = await meetingsTable.select({
    maxRecords: 20,
    view: 'Grid view'
  }).all()

  console.log(`Found ${meetingRecords.length} meetings`)

  // Get action items
  const actionItemsTable = base('Action Items')
  const actionItemRecords = await actionItemsTable.select({
    maxRecords: 50,
    view: 'Grid view'
  }).all()

  console.log(`Found ${actionItemRecords.length} action items`)

  // Process meetings
  const meetings = meetingRecords.map(record => ({
    title: record.get('Title') || record.get('Name') || 'Untitled Meeting',
    startTime: record.get('Start Time'),
    participants: record.get('Participants'),
    summary: record.get('Meeting Summary') || record.get('Summary')
  }))

  // Process action items
  const now = new Date('2024-11-15') // Test date
  const weekFromNow = new Date(now)
  weekFromNow.setDate(weekFromNow.getDate() + 7)

  const processedActionItems = actionItemRecords.map(record => {
    const dueDate = record.get('Due Date') ? new Date(record.get('Due Date')) : null
    const isOverdue = dueDate && dueDate < now && record.get('Status') !== 'Complete'
    const isDueToday = dueDate && dueDate.toDateString() === now.toDateString()
    const isDueThisWeek = dueDate && dueDate > now && dueDate <= weekFromNow

    return {
      taskDescription: record.get('Task Description'),
      assignee: record.get('Assignee'),
      dueDate: record.get('Due Date'),
      status: record.get('Status'),
      priority: record.get('Priority'),
      sourceMeetingTitle: record.get('Title')?.[0],
      overdue: isOverdue,
      dueToday: isDueToday,
      dueThisWeek: isDueThisWeek && !isDueToday && !isOverdue,
    }
  }).filter(item => item.overdue || item.dueToday || item.dueThisWeek)

  console.log(`Processed ${processedActionItems.length} action items (due today, overdue, or due this week)`)

  // Get business issues (optional)
  let businessIssues = []
  try {
    const issuesTable = base('Business Issues')
    const issueRecords = await issuesTable.select({
      filterByFormula: "{Status} = 'Active'",
      maxRecords: 10
    }).all()

    businessIssues = issueRecords.map(record => ({
      issueDescription: record.get('Issue Description'),
      companyName: record.get('Company')?.[0],
      category: record.get('Category'),
      severity: record.get('Severity')
    }))

    console.log(`Found ${businessIssues.length} business issues`)
  } catch (error) {
    console.warn('Could not fetch business issues:', error.message)
  }

  // Generate email HTML
  const html = generateDailyDigestHTML({
    todaysMeetings: meetings,
    actionItems: processedActionItems,
    businessIssues
  })

  // Send email
  console.log(`\nSending email to ${process.env.DAILY_DIGEST_EMAIL}...`)

  const testDate = new Date('2024-11-15')

  const { data, error } = await resend.emails.send({
    from: `${process.env.EMAIL_FROM_NAME || 'Meeting Intelligence System'} <${process.env.EMAIL_FROM_ADDRESS || 'onboarding@resend.dev'}>`,
    to: process.env.DAILY_DIGEST_EMAIL,
    subject: `Your Daily Brief - ${testDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`,
    html
  })

  if (error) {
    console.error('Failed to send email:', error)
    process.exit(1)
  }

  console.log(`\n✓ Email sent successfully!`)
  console.log(`  Email ID: ${data.id}`)
  console.log(`  Summary:`)
  console.log(`    - ${meetings.length} meetings`)
  console.log(`    - ${processedActionItems.length} action items`)
  console.log(`    - ${businessIssues.length} business issues`)
}

function generateDailyDigestHTML(data) {
  const { todaysMeetings, actionItems, businessIssues } = data

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily Brief</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    h1 { color: #2563eb; font-size: 24px; margin-bottom: 10px; }
    h2 { color: #1e40af; font-size: 18px; margin-top: 30px; margin-bottom: 15px; border-bottom: 2px solid #dbeafe; padding-bottom: 5px; }
    h3 { color: #374151; font-size: 16px; margin-top: 20px; margin-bottom: 10px; }
    .meeting { background: #f9fafb; border-left: 4px solid #3b82f6; padding: 15px; margin-bottom: 15px; }
    .task { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin-bottom: 10px; }
    .task.overdue { background: #fee2e2; border-left-color: #ef4444; }
    .issue { background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px; margin-bottom: 10px; }
    .meta { font-size: 12px; color: #6b7280; margin-top: 5px; }
    .count { background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; }
  </style>
</head>
<body>
  <h1>📋 Your Daily Brief</h1>
  <p style="color: #6b7280; font-size: 14px;">Friday, November 15, 2024</p>

  <h2>📅 Today's Meetings <span class="count">${todaysMeetings.length}</span></h2>
  ${todaysMeetings.length === 0
    ? '<p style="color: #6b7280;">No meetings scheduled for today.</p>'
    : todaysMeetings.map(meeting => `
      <div class="meeting">
        <h3>${meeting.title}</h3>
        <div class="meta">
          ${meeting.startTime ? `🕒 ${new Date(meeting.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : ''}
          ${meeting.participants ? ` | 👥 ${meeting.participants}` : ''}
        </div>
        ${meeting.summary ? `<p>${meeting.summary}</p>` : ''}
      </div>
    `).join('')}

  <h2>✅ Your Action Items</h2>
  ${actionItems.length === 0
    ? '<p style="color: #6b7280;">No action items at this time.</p>'
    : `
    <h3>Due Today <span class="count">${actionItems.filter(t => t.dueToday).length}</span></h3>
    ${actionItems.filter(t => t.dueToday).map(task => `
      <div class="task">
        <strong>${task.taskDescription}</strong>
        <div class="meta">Priority: ${task.priority} | ${task.sourceMeetingTitle || 'No meeting linked'}</div>
      </div>
    `).join('') || '<p style="color: #6b7280; font-size: 14px;">None</p>'}

    <h3>Overdue <span class="count">${actionItems.filter(t => t.overdue).length}</span></h3>
    ${actionItems.filter(t => t.overdue).map(task => `
      <div class="task overdue">
        <strong>${task.taskDescription}</strong>
        <div class="meta">Due: ${new Date(task.dueDate).toLocaleDateString()} | Priority: ${task.priority}</div>
      </div>
    `).join('') || '<p style="color: #6b7280; font-size: 14px;">None</p>'}

    <h3>Due This Week <span class="count">${actionItems.filter(t => t.dueThisWeek).length}</span></h3>
    ${actionItems.filter(t => t.dueThisWeek).map(task => `
      <div class="task">
        <strong>${task.taskDescription}</strong>
        <div class="meta">Due: ${new Date(task.dueDate).toLocaleDateString()} | Priority: ${task.priority}</div>
      </div>
    `).join('') || '<p style="color: #6b7280; font-size: 14px;">None</p>'}
  `}

  ${businessIssues.length > 0 ? `
  <h2>⚠️ Active Business Issues <span class="count">${businessIssues.length}</span></h2>
  ${businessIssues.map(issue => `
    <div class="issue">
      <strong>${issue.issueDescription}</strong>
      <div class="meta">${issue.companyName || 'No company'} | ${issue.category} | Severity: ${issue.severity}</div>
    </div>
  `).join('')}
  ` : ''}

  <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
  <p style="color: #9ca3af; font-size: 12px; text-align: center;">
    Generated by Meeting Intelligence System
  </p>
</body>
</html>
  `.trim()
}

// Run the script
sendTestDigest().catch(error => {
  console.error('Error:', error)
  process.exit(1)
})
