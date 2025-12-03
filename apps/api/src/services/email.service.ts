import { Resend } from 'resend'

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

// Helper to generate My Tasks URL
function getMyTasksUrl(assigneeName: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_WEB_URL || process.env.WEB_URL || 'http://localhost:3000'
  return `${baseUrl}/my-tasks?assignee=${encodeURIComponent(assigneeName)}`
}

class EmailService {
  private resend: Resend | null = null

  private getResendClient(): Resend {
    if (this.resend) {
      return this.resend
    }

    const apiKey = process.env.RESEND_API_KEY

    if (!apiKey) {
      throw new Error(
        'Resend API key not configured. Please set RESEND_API_KEY in .env'
      )
    }

    this.resend = new Resend(apiKey)
    console.log('✓ Resend email client initialized')

    return this.resend
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    const resend = this.getResendClient()

    const fromAddress = process.env.EMAIL_FROM_ADDRESS || 'onboarding@resend.dev'
    const fromName = process.env.EMAIL_FROM_NAME || 'Meeting Intelligence System'

    try {
      const { data, error } = await resend.emails.send({
        from: `${fromName} <${fromAddress}>`,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
      })

      if (error) {
        console.error('✗ Failed to send email:', error)
        throw new Error(error.message)
      }

      console.log('✓ Email sent:', data?.id)
      console.log('  To:', options.to)
      console.log('  Subject:', options.subject)
    } catch (error) {
      console.error('✗ Failed to send email:', error)
      throw error
    }
  }

  async sendMeetingPrepEmail(
    to: string,
    meetings: any[],
    date: string
  ): Promise<void> {
    const subject = `Your Meeting Prep for ${date}`

    // Simple HTML template (we'll improve this later with React Email)
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #7c3aed; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
            .content { background: #f9fafb; padding: 20px; }
            .meeting { background: white; padding: 15px; margin-bottom: 15px; border-left: 4px solid #7c3aed; }
            .meeting-title { font-size: 16px; font-weight: bold; margin-bottom: 5px; }
            .meeting-meta { font-size: 13px; color: #6b7280; margin-bottom: 10px; }
            .meeting-participants { font-size: 13px; margin-top: 10px; }
            .footer { font-size: 12px; color: #9ca3af; text-align: center; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 24px;">Meeting Prep for ${date}</h1>
            </div>
            <div class="content">
              ${
                meetings.length === 0
                  ? '<p>No meetings scheduled for today. Enjoy your clear calendar!</p>'
                  : `
                <p>You have ${meetings.length} meeting${meetings.length !== 1 ? 's' : ''} today:</p>
                ${meetings
                  .map(
                    (meeting) => `
                  <div class="meeting">
                    <div class="meeting-title">${meeting.title || 'Team Discussion'}</div>
                    <div class="meeting-meta">
                      ${meeting.startTime ? `Time: ${new Date(meeting.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : ''}
                    </div>
                    ${
                      meeting.participants && meeting.participants.length > 0
                        ? `
                      <div class="meeting-participants">
                        <strong>Participants:</strong> ${meeting.participants.slice(0, 5).join(', ')}${meeting.participants.length > 5 ? ` +${meeting.participants.length - 5} more` : ''}
                      </div>
                    `
                        : ''
                    }
                    ${
                      meeting.topics
                        ? `
                      <div class="meeting-participants">
                        <strong>Topics:</strong> ${meeting.topics}
                      </div>
                    `
                        : ''
                    }
                  </div>
                `
                  )
                  .join('')}
              `
              }
            </div>
            <div class="footer">
              <p>Meeting Intelligence System</p>
            </div>
          </div>
        </body>
      </html>
    `

    const text = `
Meeting Prep for ${date}

You have ${meetings.length} meeting${meetings.length !== 1 ? 's' : ''} today:

${meetings
  .map(
    (meeting) => `
${meeting.title || 'Team Discussion'}
${meeting.startTime ? `Time: ${new Date(meeting.startTime).toLocaleTimeString()}` : ''}
${meeting.participants ? `Participants: ${meeting.participants.join(', ')}` : ''}
${meeting.topics ? `Topics: ${meeting.topics}` : ''}
---
`
  )
  .join('\n')}

Meeting Intelligence System
    `.trim()

    await this.sendEmail({ to, subject, html, text })
  }

  async sendDailyDigest(
    userEmail: string,
    digestData: {
      todaysMeetings: any[]
      actionItems: any[]
      followUps: any[]
      businessIssues: any[]
      personalIntel: any[]
    },
    date?: Date
  ): Promise<void> {
    const html = this.generateDailyDigestHTML(digestData)
    const text = this.generateDailyDigestText(digestData)

    const displayDate = date || new Date()

    await this.sendEmail({
      to: userEmail,
      subject: `Your Daily Brief - ${displayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`,
      html,
      text,
    })
  }

  private generateDailyDigestHTML(data: any): string {
    const { todaysMeetings, actionItems, followUps, businessIssues } = data

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
    ul { margin: 10px 0; padding-left: 20px; }
    li { margin: 5px 0; }
  </style>
</head>
<body>
  <h1>📋 Your Daily Brief</h1>
  <p style="color: #6b7280; font-size: 14px;">${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>

  <h2>📅 Today's Meetings <span class="count">${todaysMeetings.length}</span></h2>
  ${todaysMeetings.length === 0
    ? '<p style="color: #6b7280;">No meetings scheduled for today.</p>'
    : todaysMeetings.map(meeting => `
      <div class="meeting">
        <h3>${meeting.title || 'Untitled Meeting'}</h3>
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

/**
   * Send follow-up status request emails for each assignee
   * All emails are sent to the user (you) for forwarding
   * Rate limited to avoid Resend API limits (2 req/sec)
   */
  async sendFollowUpEmails(
    userEmail: string,
    actionItemsByAssignee: Map<string, {
      assigneeName: string
      items: Array<{
        taskDescription: string
        dueDate: string
        status: string
        priority: string
        meetingTitle: string
        meetingDate: string
        notes?: string
      }>
    }>,
    senderName: string = 'Peter'
  ): Promise<{ emailsSent: number; assignees: string[] }> {
    const assignees: string[] = []
    let emailsSent = 0

    for (const [assigneeName, data] of actionItemsByAssignee.entries()) {
      const html = this.generateFollowUpEmailHTML(assigneeName, data.items, senderName)
      const text = this.generateFollowUpEmailText(assigneeName, data.items, senderName)

      await this.sendEmail({
        to: userEmail,
        subject: `Follow-up for ${assigneeName} - ${data.items.length} Action Item${data.items.length !== 1 ? 's' : ''}`,
        html,
        text,
      })

      assignees.push(assigneeName)
      emailsSent++

      // Rate limit: wait 600ms between emails to stay under Resend's 2 req/sec limit
      await new Promise(resolve => setTimeout(resolve, 600))
    }

    return { emailsSent, assignees }
  }

  private generateFollowUpEmailHTML(
    assigneeName: string,
    items: Array<{
      taskDescription: string
      dueDate: string
      status: string
      priority: string
      meetingTitle: string
      meetingDate: string
      notes?: string
    }>,
    senderName: string
  ): string {
    const firstName = assigneeName.split(' ')[0]

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Follow-up for ${assigneeName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f3f4f6; padding: 15px 20px; border-radius: 8px; margin-bottom: 20px; }
    .header-title { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }
    .header-name { font-size: 20px; font-weight: 600; color: #111827; }
    .greeting { font-size: 15px; margin-bottom: 20px; }
    .task { background: #fefce8; border-left: 4px solid #eab308; padding: 15px; margin-bottom: 15px; border-radius: 0 8px 8px 0; }
    .task.overdue { background: #fef2f2; border-left-color: #ef4444; }
    .task.high { border-left-color: #f97316; }
    .task-title { font-weight: 600; font-size: 15px; color: #111827; margin-bottom: 8px; }
    .task-context { font-size: 13px; color: #4b5563; background: #f9fafb; padding: 10px; border-radius: 4px; margin-bottom: 8px; }
    .task-context strong { color: #374151; }
    .task-meta { font-size: 12px; color: #6b7280; display: flex; gap: 15px; flex-wrap: wrap; }
    .task-meta span { display: inline-flex; align-items: center; gap: 4px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; }
    .badge-overdue { background: #fee2e2; color: #dc2626; }
    .badge-high { background: #ffedd5; color: #c2410c; }
    .badge-medium { background: #fef3c7; color: #b45309; }
    .badge-open { background: #dbeafe; color: #1d4ed8; }
    .closing { margin-top: 25px; font-size: 15px; }
    .signature { margin-top: 20px; color: #374151; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-title">Follow-up Request For</div>
    <div class="header-name">${assigneeName}</div>
  </div>

  <div class="greeting">
    Hi ${firstName},<br><br>
    I wanted to follow up on the status of the following item${items.length !== 1 ? 's' : ''} from our recent meeting${items.length !== 1 ? 's' : ''}:
  </div>

  ${items.map((item, index) => {
    const dueDate = new Date(item.dueDate)
    const isOverdue = dueDate < new Date() && item.status !== 'Complete'
    const isHighPriority = item.priority === 'High' || item.priority === 'Critical'
    const meetingDate = item.meetingDate ? new Date(item.meetingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''

    return `
    <div class="task ${isOverdue ? 'overdue' : ''} ${isHighPriority ? 'high' : ''}">
      <div class="task-title">${index + 1}. ${item.taskDescription}</div>
      <div class="task-context">
        <strong>From:</strong> ${item.meetingTitle || 'Meeting'}${meetingDate ? ` (${meetingDate})` : ''}
        ${item.notes ? `<br><strong>As discussed:</strong> ${item.notes}` : ''}
      </div>
      <div class="task-meta">
        <span>📅 Due: ${dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        <span class="badge ${isOverdue ? 'badge-overdue' : 'badge-open'}">${isOverdue ? 'Overdue' : item.status}</span>
        <span class="badge badge-${item.priority.toLowerCase()}">${item.priority}</span>
      </div>
    </div>
  `}).join('')}

  <div style="margin: 25px 0; text-align: center;">
    <a href="${getMyTasksUrl(assigneeName)}"
       style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
      📋 View & Update My Tasks
    </a>
  </div>

  <div class="closing">
    Click the button above to view all your tasks and update their status, or reply to let me know where things stand.
  </div>

  <div class="signature">
    Thanks,<br>
    ${senderName}
  </div>

  <div class="footer">
    This email was generated by Meeting Intelligence System<br>
    Ready for you to review and forward to ${firstName}
  </div>
</body>
</html>
    `.trim()
  }

  private generateFollowUpEmailText(
    assigneeName: string,
    items: Array<{
      taskDescription: string
      dueDate: string
      status: string
      priority: string
      meetingTitle: string
      meetingDate: string
      notes?: string
    }>,
    senderName: string
  ): string {
    const firstName = assigneeName.split(' ')[0]

    let text = `FOLLOW-UP FOR: ${assigneeName}\n${'='.repeat(50)}\n\n`
    text += `Hi ${firstName},\n\n`
    text += `I wanted to follow up on the status of the following item${items.length !== 1 ? 's' : ''} from our recent meeting${items.length !== 1 ? 's' : ''}:\n\n`

    items.forEach((item, index) => {
      const dueDate = new Date(item.dueDate)
      const isOverdue = dueDate < new Date() && item.status !== 'Complete'
      const meetingDate = item.meetingDate ? new Date(item.meetingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''

      text += `${index + 1}. ${item.taskDescription}\n`
      text += `   From: ${item.meetingTitle || 'Meeting'}${meetingDate ? ` (${meetingDate})` : ''}\n`
      if (item.notes) {
        text += `   As discussed: ${item.notes}\n`
      }
      text += `   Due: ${dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} | ${isOverdue ? 'OVERDUE' : item.status} | ${item.priority} Priority\n\n`
    })

    text += `VIEW & UPDATE YOUR TASKS:\n${getMyTasksUrl(assigneeName)}\n\n`
    text += `Click the link above to view all your tasks and update their status, or reply to let me know where things stand.\n\n`
    text += `Thanks,\n${senderName}\n\n`
    text += `${'-'.repeat(50)}\nGenerated by Meeting Intelligence System\n`

    return text
  }

  private generateDailyDigestText(data: any): string {
    const { todaysMeetings, actionItems, followUps, businessIssues } = data
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

    let text = `YOUR DAILY BRIEF - ${today}\n${'='.repeat(50)}\n\n`

    // Today's Meetings
    text += `📅 TODAY'S MEETINGS (${todaysMeetings.length})\n${'-'.repeat(50)}\n`
    if (todaysMeetings.length === 0) {
      text += 'No meetings scheduled for today.\n'
    } else {
      todaysMeetings.forEach((meeting: any) => {
        text += `\n${meeting.title || 'Untitled Meeting'}\n`
        if (meeting.startTime) {
          text += `Time: ${new Date(meeting.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}\n`
        }
        if (meeting.participants) {
          text += `Participants: ${meeting.participants}\n`
        }
        if (meeting.summary) {
          text += `${meeting.summary}\n`
        }
      })
    }

    // Action Items
    text += `\n\n✅ YOUR ACTION ITEMS\n${'-'.repeat(50)}\n`
    const dueToday = actionItems.filter((t: any) => t.dueToday)
    const overdue = actionItems.filter((t: any) => t.overdue)
    const dueThisWeek = actionItems.filter((t: any) => t.dueThisWeek)

    text += `\nDue Today (${dueToday.length}):\n`
    dueToday.forEach((task: any) => {
      text += `  • ${task.taskDescription} [${task.priority}]\n`
    })

    text += `\nOverdue (${overdue.length}):\n`
    overdue.forEach((task: any) => {
      text += `  • ${task.taskDescription} - Due: ${new Date(task.dueDate).toLocaleDateString()}\n`
    })

    text += `\nDue This Week (${dueThisWeek.length}):\n`
    dueThisWeek.forEach((task: any) => {
      text += `  • ${task.taskDescription} - Due: ${new Date(task.dueDate).toLocaleDateString()}\n`
    })

    // Business Issues
    if (businessIssues.length > 0) {
      text += `\n\n⚠️ ACTIVE BUSINESS ISSUES (${businessIssues.length})\n${'-'.repeat(50)}\n`
      businessIssues.forEach((issue: any) => {
        text += `\n• ${issue.issueDescription}\n`
        text += `  ${issue.companyName || 'No company'} | ${issue.category} | ${issue.severity}\n`
      })
    }

    text += `\n${'-'.repeat(50)}\nGenerated by Meeting Intelligence System\n`

    return text
  }

  /**
   * Send Yesterday's Recap email - summarizes all meetings from the previous day
   */
  async sendYesterdayRecapEmail(
    userEmail: string,
    meetings: Array<{
      id: string
      title: string
      startTime: string
      participants?: string[]
      summary?: string
      actionItems?: string
      keyQuestions?: string
      topics?: string
    }>,
    targetDate: Date
  ): Promise<void> {
    const dateStr = targetDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })

    const html = this.generateYesterdayRecapHTML(meetings, dateStr)
    const text = this.generateYesterdayRecapText(meetings, dateStr)

    await this.sendEmail({
      to: userEmail,
      subject: `Yesterday's Recap - ${dateStr} (${meetings.length} meeting${meetings.length !== 1 ? 's' : ''})`,
      html,
      text,
    })
  }

  private generateYesterdayRecapHTML(
    meetings: Array<{
      id: string
      title: string
      startTime: string
      participants?: string[]
      summary?: string
      actionItems?: string
      keyQuestions?: string
      topics?: string
    }>,
    dateStr: string
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Yesterday's Recap - ${dateStr}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 25px; border-radius: 12px; margin-bottom: 25px; }
    .header h1 { margin: 0 0 5px 0; font-size: 24px; }
    .header .date { opacity: 0.9; font-size: 14px; }
    .header .count { background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 13px; margin-top: 10px; display: inline-block; }
    .meeting { background: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 20px; border: 1px solid #e5e7eb; }
    .meeting-title { font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 8px; }
    .meeting-time { font-size: 13px; color: #6b7280; margin-bottom: 12px; }
    .meeting-participants { font-size: 13px; color: #6b7280; margin-bottom: 15px; padding: 10px; background: #f3f4f6; border-radius: 6px; }
    .section { margin-top: 15px; }
    .section-title { font-size: 12px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
    .section-content { font-size: 14px; color: #4b5563; padding-left: 20px; }
    .section-content ul { margin: 0; padding-left: 20px; }
    .section-content li { margin-bottom: 6px; }
    .summary-box { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 15px; border-radius: 0 8px 8px 0; font-size: 14px; color: #1e40af; }
    .action-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 15px; border-radius: 0 8px 8px 0; }
    .questions-box { background: #fce7f3; border-left: 4px solid #ec4899; padding: 12px 15px; border-radius: 0 8px 8px 0; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📋 Yesterday's Recap</h1>
    <div class="date">${dateStr}</div>
    <div class="count">${meetings.length} meeting${meetings.length !== 1 ? 's' : ''}</div>
  </div>

  ${meetings.length === 0
    ? '<p style="text-align: center; color: #6b7280; padding: 40px;">No meetings recorded for this day.</p>'
    : meetings.map(meeting => {
        const time = meeting.startTime
          ? new Date(meeting.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
          : ''
        const participants = meeting.participants?.slice(0, 6).join(', ') || 'No participants listed'
        const moreParticipants = (meeting.participants?.length || 0) > 6
          ? ` +${(meeting.participants?.length || 0) - 6} more`
          : ''

        return `
        <div class="meeting">
          <div class="meeting-title">${meeting.title || 'Untitled Meeting'}</div>
          <div class="meeting-time">🕐 ${time}</div>
          <div class="meeting-participants">👥 ${participants}${moreParticipants}</div>

          ${meeting.summary ? `
          <div class="section">
            <div class="section-title">📝 Summary</div>
            <div class="summary-box">
              <ul style="margin: 0; padding-left: 20px;">
                ${meeting.summary.split(/(?<=[.!?])\s+/).filter(s => s.trim()).map(sentence => `<li>${sentence.trim()}</li>`).join('')}
              </ul>
            </div>
          </div>
          ` : ''}

          ${meeting.actionItems ? `
          <div class="section">
            <div class="section-title">✅ Action Items</div>
            <div class="action-box section-content">
              <ul>
                ${meeting.actionItems.split(/[,\n]/).filter(i => i.trim()).map(item => `<li>${item.trim()}</li>`).join('')}
              </ul>
            </div>
          </div>
          ` : ''}

          ${meeting.keyQuestions ? `
          <div class="section">
            <div class="section-title">❓ Key Questions</div>
            <div class="questions-box section-content">${meeting.keyQuestions}</div>
          </div>
          ` : ''}
        </div>
      `}).join('')}

  <div class="footer">
    Generated by Meeting Intelligence System<br>
    ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
  </div>
</body>
</html>
    `.trim()
  }

  private generateYesterdayRecapText(
    meetings: Array<{
      id: string
      title: string
      startTime: string
      participants?: string[]
      summary?: string
      actionItems?: string
      keyQuestions?: string
      topics?: string
    }>,
    dateStr: string
  ): string {
    let text = `YESTERDAY'S RECAP - ${dateStr}\n${'='.repeat(60)}\n\n`
    text += `${meetings.length} meeting${meetings.length !== 1 ? 's' : ''}\n\n`

    if (meetings.length === 0) {
      text += 'No meetings recorded for this day.\n'
    } else {
      meetings.forEach((meeting, index) => {
        const time = meeting.startTime
          ? new Date(meeting.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
          : ''

        text += `${'-'.repeat(60)}\n`
        text += `${index + 1}. ${meeting.title || 'Untitled Meeting'}\n`
        text += `   Time: ${time}\n`
        if (meeting.participants?.length) {
          text += `   Participants: ${meeting.participants.slice(0, 6).join(', ')}${meeting.participants.length > 6 ? ` +${meeting.participants.length - 6} more` : ''}\n`
        }
        text += '\n'

        if (meeting.summary) {
          text += `   SUMMARY:\n`
          meeting.summary.split(/(?<=[.!?])\s+/).filter(s => s.trim()).forEach(sentence => {
            text += `   • ${sentence.trim()}\n`
          })
          text += '\n'
        }
        if (meeting.actionItems) {
          text += `   ACTION ITEMS:\n`
          meeting.actionItems.split(/[,\n]/).filter(i => i.trim()).forEach(item => {
            text += `   • ${item.trim()}\n`
          })
          text += '\n'
        }
        if (meeting.keyQuestions) {
          text += `   KEY QUESTIONS:\n   ${meeting.keyQuestions}\n\n`
        }
      })
    }

    text += `${'-'.repeat(60)}\nGenerated by Meeting Intelligence System\n`
    return text
  }

  /**
   * Send Prior Discussions email - shows historical context for recurring meetings
   */
  async sendPriorDiscussionsEmail(
    userEmail: string,
    meetingName: string,
    priorMeetings: Array<{
      id: string
      title: string
      startTime: string
      summary?: string
      actionItems?: string
      keyQuestions?: string
    }>,
    currentMeetingDate: Date
  ): Promise<void> {
    const dateStr = currentMeetingDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })

    const html = this.generatePriorDiscussionsHTML(meetingName, priorMeetings, dateStr)
    const text = this.generatePriorDiscussionsText(meetingName, priorMeetings, dateStr)

    await this.sendEmail({
      to: userEmail,
      subject: `Prior Discussions: ${meetingName} (${priorMeetings.length} previous meeting${priorMeetings.length !== 1 ? 's' : ''})`,
      html,
      text,
    })
  }

  private generatePriorDiscussionsHTML(
    meetingName: string,
    priorMeetings: Array<{
      id: string
      title: string
      startTime: string
      summary?: string
      actionItems?: string
      keyQuestions?: string
    }>,
    currentDateStr: string
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prior Discussions: ${meetingName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #8b5cf6, #6d28d9); color: white; padding: 25px; border-radius: 12px; margin-bottom: 25px; }
    .header h1 { margin: 0 0 5px 0; font-size: 22px; }
    .header .meeting-name { font-size: 16px; opacity: 0.95; margin-bottom: 10px; }
    .header .context { font-size: 13px; opacity: 0.85; }
    .timeline { position: relative; padding-left: 30px; }
    .timeline::before { content: ''; position: absolute; left: 10px; top: 0; bottom: 0; width: 2px; background: #e5e7eb; }
    .meeting { position: relative; background: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 20px; border: 1px solid #e5e7eb; }
    .meeting::before { content: ''; position: absolute; left: -24px; top: 25px; width: 10px; height: 10px; background: #8b5cf6; border-radius: 50%; border: 2px solid white; }
    .meeting-date { font-size: 12px; color: #8b5cf6; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
    .meeting-title { font-size: 16px; font-weight: 600; color: #111827; margin-bottom: 12px; }
    .summary { font-size: 14px; color: #4b5563; background: #f3e8ff; border-left: 4px solid #8b5cf6; padding: 12px 15px; border-radius: 0 8px 8px 0; margin-bottom: 12px; }
    .action-items { font-size: 13px; background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 15px; border-radius: 0 8px 8px 0; }
    .action-items ul { margin: 5px 0 0 0; padding-left: 20px; }
    .action-items li { margin-bottom: 4px; }
    .key-questions { font-size: 13px; color: #be185d; background: #fce7f3; padding: 10px 15px; border-radius: 6px; margin-top: 10px; }
    .no-history { text-align: center; color: #6b7280; padding: 40px; background: #f9fafb; border-radius: 12px; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔄 Prior Discussions</h1>
    <div class="meeting-name">${meetingName}</div>
    <div class="context">Historical context from ${priorMeetings.length} previous meeting${priorMeetings.length !== 1 ? 's' : ''}</div>
  </div>

  ${priorMeetings.length === 0
    ? '<div class="no-history">No prior meetings found with this name.</div>'
    : `<div class="timeline">
        ${priorMeetings.map(meeting => {
          const date = meeting.startTime
            ? new Date(meeting.startTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
            : 'Unknown date'

          return `
          <div class="meeting">
            <div class="meeting-date">${date}</div>
            <div class="meeting-title">${meeting.title}</div>

            ${meeting.summary ? `
            <div class="summary">
              <ul style="margin: 0; padding-left: 20px;">
                ${meeting.summary.split(/(?<=[.!?])\s+/).filter(s => s.trim()).map(sentence => `<li>${sentence.trim()}</li>`).join('')}
              </ul>
            </div>
            ` : ''}

            ${meeting.actionItems ? `
            <div class="action-items">
              <strong>Action Items:</strong>
              <ul>
                ${meeting.actionItems.split(/[,\n]/).filter(i => i.trim()).slice(0, 5).map(item => `<li>${item.trim()}</li>`).join('')}
              </ul>
            </div>
            ` : ''}

            ${meeting.keyQuestions ? `
            <div class="key-questions">❓ ${meeting.keyQuestions}</div>
            ` : ''}
          </div>
        `}).join('')}
      </div>`}

  <div class="footer">
    Generated by Meeting Intelligence System<br>
    Use this context to prepare for your next "${meetingName}" discussion
  </div>
</body>
</html>
    `.trim()
  }

  private generatePriorDiscussionsText(
    meetingName: string,
    priorMeetings: Array<{
      id: string
      title: string
      startTime: string
      summary?: string
      actionItems?: string
      keyQuestions?: string
    }>,
    currentDateStr: string
  ): string {
    let text = `PRIOR DISCUSSIONS: ${meetingName}\n${'='.repeat(60)}\n\n`
    text += `Historical context from ${priorMeetings.length} previous meeting${priorMeetings.length !== 1 ? 's' : ''}\n\n`

    if (priorMeetings.length === 0) {
      text += 'No prior meetings found with this name.\n'
    } else {
      priorMeetings.forEach((meeting, index) => {
        const date = meeting.startTime
          ? new Date(meeting.startTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
          : 'Unknown date'

        text += `${'-'.repeat(60)}\n`
        text += `[${date}] ${meeting.title}\n\n`

        if (meeting.summary) {
          text += `SUMMARY:\n`
          meeting.summary.split(/(?<=[.!?])\s+/).filter(s => s.trim()).forEach(sentence => {
            text += `• ${sentence.trim()}\n`
          })
          text += '\n'
        }
        if (meeting.actionItems) {
          text += `ACTION ITEMS:\n`
          meeting.actionItems.split(/[,\n]/).filter(i => i.trim()).slice(0, 5).forEach(item => {
            text += `• ${item.trim()}\n`
          })
          text += '\n'
        }
        if (meeting.keyQuestions) {
          text += `KEY QUESTIONS: ${meeting.keyQuestions}\n\n`
        }
      })
    }

    text += `${'-'.repeat(60)}\nGenerated by Meeting Intelligence System\n`
    text += `Use this context to prepare for your next "${meetingName}" discussion\n`
    return text
  }

  /**
   * Send Tomorrow's Prep email - shows upcoming meetings with all recent historical context
   */
  async sendTomorrowsPrepEmail(
    userEmail: string,
    tomorrowDate: Date,
    upcomingMeetings: Array<{
      id: string
      title: string
      startTime: string
      participants?: string[]
      priorMeetings: Array<{
        id: string
        title: string
        startTime: string
        summary?: string
        actionItems?: string
        keyQuestions?: string
      }>
      openActionItems: Array<{
        taskDescription: string
        assignee: string
        dueDate: string
        status: string
        priority: string
      }>
    }>,
    recentMeetings: Array<{
      id: string
      title: string
      startTime: string
      summary?: string
      actionItems?: string
      keyQuestions?: string
    }> = [],
    lookbackLabel: string = 'yesterday'
  ): Promise<void> {
    const dateStr = tomorrowDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })

    const html = this.generateTomorrowsPrepHTML(upcomingMeetings, dateStr, recentMeetings, lookbackLabel)
    const text = this.generateTomorrowsPrepText(upcomingMeetings, dateStr, recentMeetings, lookbackLabel)

    await this.sendEmail({
      to: userEmail,
      subject: `Tomorrow's Prep - ${dateStr} (${upcomingMeetings.length} meeting${upcomingMeetings.length !== 1 ? 's' : ''})`,
      html,
      text,
    })
  }

  private generateTomorrowsPrepHTML(
    meetings: Array<{
      id: string
      title: string
      startTime: string
      participants?: string[]
      priorMeetings: Array<{
        id: string
        title: string
        startTime: string
        summary?: string
        actionItems?: string
        keyQuestions?: string
      }>
      openActionItems: Array<{
        taskDescription: string
        assignee: string
        dueDate: string
        status: string
        priority: string
      }>
    }>,
    dateStr: string,
    recentMeetings: Array<{
      id: string
      title: string
      startTime: string
      summary?: string
      actionItems?: string
      keyQuestions?: string
    }> = [],
    lookbackLabel: string = 'yesterday'
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tomorrow's Prep - ${dateStr}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 25px; border-radius: 12px; margin-bottom: 25px; }
    .header h1 { margin: 0 0 5px 0; font-size: 24px; }
    .header .date { opacity: 0.9; font-size: 14px; }
    .header .count { background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 13px; margin-top: 10px; display: inline-block; }
    .meeting { background: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 25px; border: 1px solid #e5e7eb; }
    .meeting-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; }
    .meeting-title { font-size: 18px; font-weight: 600; color: #111827; }
    .meeting-time { font-size: 14px; color: #10b981; font-weight: 500; background: #d1fae5; padding: 4px 10px; border-radius: 6px; }
    .meeting-participants { font-size: 13px; color: #6b7280; margin-bottom: 15px; padding: 10px; background: #f3f4f6; border-radius: 6px; }
    .section { margin-top: 20px; }
    .section-title { font-size: 13px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px; }
    .prior-meeting { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 12px; }
    .prior-meeting-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
    .prior-meeting-title { font-weight: 600; font-size: 14px; color: #374151; }
    .prior-meeting-date { font-size: 12px; color: #8b5cf6; font-weight: 500; }
    .summary-box { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 10px 12px; border-radius: 0 6px 6px 0; font-size: 13px; color: #1e40af; margin-bottom: 10px; }
    .summary-box ul { margin: 0; padding-left: 18px; }
    .summary-box li { margin-bottom: 4px; }
    .action-items-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 10px 12px; border-radius: 0 6px 6px 0; font-size: 13px; }
    .action-items-box ul { margin: 0; padding-left: 18px; }
    .action-items-box li { margin-bottom: 4px; }
    .open-items { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px; }
    .open-items-title { font-weight: 600; color: #dc2626; font-size: 13px; margin-bottom: 10px; }
    .open-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #fecaca; }
    .open-item:last-child { border-bottom: none; }
    .open-item-task { font-size: 13px; color: #374151; flex: 1; }
    .open-item-meta { font-size: 11px; color: #6b7280; text-align: right; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 500; margin-left: 5px; }
    .badge-overdue { background: #fee2e2; color: #dc2626; }
    .badge-high { background: #ffedd5; color: #c2410c; }
    .no-history { color: #9ca3af; font-style: italic; font-size: 13px; padding: 10px; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📅 Tomorrow's Prep</h1>
    <div class="date">${dateStr}</div>
    <div class="count">${meetings.length} meeting${meetings.length !== 1 ? 's' : ''} scheduled</div>
  </div>

  ${meetings.length === 0
    ? '<p style="text-align: center; color: #6b7280; padding: 40px;">No meetings scheduled for tomorrow.</p>'
    : meetings.map(meeting => {
        const time = meeting.startTime
          ? new Date(meeting.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
          : ''
        const participants = meeting.participants?.slice(0, 6).join(', ') || 'No participants listed'
        const moreParticipants = (meeting.participants?.length || 0) > 6
          ? ` +${(meeting.participants?.length || 0) - 6} more`
          : ''

        return `
        <div class="meeting">
          <div class="meeting-header">
            <div class="meeting-title">${meeting.title || 'Untitled Meeting'}</div>
            <div class="meeting-time">🕐 ${time}</div>
          </div>
          <div class="meeting-participants">👥 ${participants}${moreParticipants}</div>

          ${meeting.openActionItems.length > 0 ? `
          <div class="open-items">
            <div class="open-items-title">⚠️ ${meeting.openActionItems.length} Open Action Item${meeting.openActionItems.length !== 1 ? 's' : ''} to Follow Up</div>
            ${meeting.openActionItems.map(item => {
              const dueDate = new Date(item.dueDate)
              const isOverdue = dueDate < new Date()
              const isHighPriority = item.priority === 'High' || item.priority === 'Critical'
              return `
              <div class="open-item">
                <div class="open-item-task">
                  ${item.taskDescription}
                  ${isOverdue ? '<span class="badge badge-overdue">Overdue</span>' : ''}
                  ${isHighPriority ? '<span class="badge badge-high">High</span>' : ''}
                </div>
                <div class="open-item-meta">${item.assignee}<br>Due: ${dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
              </div>
            `}).join('')}
          </div>
          ` : ''}

          <div class="section">
            <div class="section-title">📚 Recent History (${meeting.priorMeetings.length} previous meeting${meeting.priorMeetings.length !== 1 ? 's' : ''})</div>
            ${meeting.priorMeetings.length === 0
              ? '<div class="no-history">No prior meetings found with this name.</div>'
              : meeting.priorMeetings.map(prior => {
                  const priorDate = prior.startTime
                    ? new Date(prior.startTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                    : 'Unknown date'
                  return `
                  <div class="prior-meeting">
                    <div class="prior-meeting-header">
                      <div class="prior-meeting-title">${prior.title}</div>
                      <div class="prior-meeting-date">${priorDate}</div>
                    </div>
                    ${prior.summary ? `
                    <div class="summary-box">
                      <ul>
                        ${prior.summary.split(/(?<=[.!?])\s+/).filter(s => s.trim()).slice(0, 5).map(sentence => `<li>${sentence.trim()}</li>`).join('')}
                      </ul>
                    </div>
                    ` : ''}
                    ${prior.actionItems ? `
                    <div class="action-items-box">
                      <strong>Action Items:</strong>
                      <ul>
                        ${prior.actionItems.split(/[,\n]/).filter(i => i.trim()).slice(0, 5).map(item => `<li>${item.trim()}</li>`).join('')}
                      </ul>
                    </div>
                    ` : ''}
                  </div>
                `}).join('')}
          </div>
        </div>
      `}).join('')}

  ${recentMeetings.length > 0 ? `
  <div style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
    <div style="font-size: 16px; font-weight: 600; color: #92400e; margin-bottom: 15px;">📋 What Happened ${lookbackLabel.charAt(0).toUpperCase() + lookbackLabel.slice(1)} (${recentMeetings.length} meeting${recentMeetings.length !== 1 ? 's' : ''})</div>
    ${recentMeetings.map(meeting => {
      const meetingDate = meeting.startTime
        ? new Date(meeting.startTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        : ''
      const meetingTime = meeting.startTime
        ? new Date(meeting.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        : ''
      return `
      <div style="background: white; border-radius: 8px; padding: 15px; margin-bottom: 12px; border: 1px solid #fcd34d;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <div style="font-weight: 600; color: #374151;">${meeting.title}</div>
          <div style="font-size: 12px; color: #92400e;">${meetingDate} ${meetingTime}</div>
        </div>
        ${meeting.summary ? `
        <div style="background: #fffbeb; border-left: 3px solid #f59e0b; padding: 10px; border-radius: 0 6px 6px 0; font-size: 13px; color: #78350f;">
          <ul style="margin: 0; padding-left: 18px;">
            ${meeting.summary.split(/(?<=[.!?])\s+/).filter(s => s.trim()).slice(0, 4).map(sentence => `<li>${sentence.trim()}</li>`).join('')}
          </ul>
        </div>
        ` : ''}
        ${meeting.actionItems ? `
        <div style="margin-top: 8px; font-size: 12px; color: #6b7280;">
          <strong>Action Items:</strong> ${meeting.actionItems.split(/[,\n]/).filter(i => i.trim()).slice(0, 3).map(i => i.trim()).join(' | ')}
        </div>
        ` : ''}
      </div>
    `}).join('')}
  </div>
  ` : ''}

  <div class="footer">
    Generated by Meeting Intelligence System<br>
    Use this to prepare for your meetings tomorrow
  </div>
</body>
</html>
    `.trim()
  }

  private generateTomorrowsPrepText(
    meetings: Array<{
      id: string
      title: string
      startTime: string
      participants?: string[]
      priorMeetings: Array<{
        id: string
        title: string
        startTime: string
        summary?: string
        actionItems?: string
        keyQuestions?: string
      }>
      openActionItems: Array<{
        taskDescription: string
        assignee: string
        dueDate: string
        status: string
        priority: string
      }>
    }>,
    dateStr: string,
    recentMeetings: Array<{
      id: string
      title: string
      startTime: string
      summary?: string
      actionItems?: string
      keyQuestions?: string
    }> = [],
    lookbackLabel: string = 'yesterday'
  ): string {
    let text = `TOMORROW'S PREP - ${dateStr}\n${'='.repeat(60)}\n\n`
    text += `${meetings.length} meeting${meetings.length !== 1 ? 's' : ''} scheduled\n\n`

    if (meetings.length === 0) {
      text += 'No meetings scheduled for tomorrow.\n'
    } else {
      meetings.forEach((meeting, index) => {
        const time = meeting.startTime
          ? new Date(meeting.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
          : ''

        text += `${'='.repeat(60)}\n`
        text += `${index + 1}. ${meeting.title || 'Untitled Meeting'}\n`
        text += `   Time: ${time}\n`
        if (meeting.participants?.length) {
          text += `   Participants: ${meeting.participants.slice(0, 6).join(', ')}${meeting.participants.length > 6 ? ` +${meeting.participants.length - 6} more` : ''}\n`
        }
        text += '\n'

        // Open action items
        if (meeting.openActionItems.length > 0) {
          text += `   ⚠️ OPEN ACTION ITEMS (${meeting.openActionItems.length}):\n`
          meeting.openActionItems.forEach(item => {
            const dueDate = new Date(item.dueDate)
            const isOverdue = dueDate < new Date()
            text += `   • ${item.taskDescription} [${item.assignee}]${isOverdue ? ' OVERDUE' : ''}\n`
            text += `     Due: ${dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}\n`
          })
          text += '\n'
        }

        // Prior meetings
        text += `   📚 RECENT HISTORY (${meeting.priorMeetings.length} previous meetings):\n`
        if (meeting.priorMeetings.length === 0) {
          text += `   No prior meetings found.\n\n`
        } else {
          meeting.priorMeetings.forEach(prior => {
            const priorDate = prior.startTime
              ? new Date(prior.startTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
              : 'Unknown date'
            text += `\n   [${priorDate}] ${prior.title}\n`
            if (prior.summary) {
              text += `   Summary:\n`
              prior.summary.split(/(?<=[.!?])\s+/).filter(s => s.trim()).slice(0, 5).forEach(sentence => {
                text += `   • ${sentence.trim()}\n`
              })
            }
            if (prior.actionItems) {
              text += `   Action Items:\n`
              prior.actionItems.split(/[,\n]/).filter(i => i.trim()).slice(0, 5).forEach(item => {
                text += `   • ${item.trim()}\n`
              })
            }
          })
        }
        text += '\n'
      })
    }

    // Add recent meetings section (Friday/weekend for Monday prep)
    if (recentMeetings.length > 0) {
      text += `\n${'='.repeat(60)}\n`
      text += `📋 WHAT HAPPENED ${lookbackLabel.toUpperCase()} (${recentMeetings.length} meeting${recentMeetings.length !== 1 ? 's' : ''})\n`
      text += `${'='.repeat(60)}\n\n`

      recentMeetings.forEach(meeting => {
        const meetingDate = meeting.startTime
          ? new Date(meeting.startTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
          : ''
        const meetingTime = meeting.startTime
          ? new Date(meeting.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
          : ''

        text += `[${meetingDate} ${meetingTime}] ${meeting.title}\n`
        if (meeting.summary) {
          text += `Summary:\n`
          meeting.summary.split(/(?<=[.!?])\s+/).filter(s => s.trim()).slice(0, 4).forEach(sentence => {
            text += `• ${sentence.trim()}\n`
          })
        }
        if (meeting.actionItems) {
          text += `Action Items: ${meeting.actionItems.split(/[,\n]/).filter(i => i.trim()).slice(0, 3).map(i => i.trim()).join(' | ')}\n`
        }
        text += '\n'
      })
    }

    text += `${'-'.repeat(60)}\nGenerated by Meeting Intelligence System\n`
    return text
  }

  /**
   * Send Today's Prep email - clean, professional morning briefing
   * Shows today's meetings with detailed prior meeting summaries and action items
   */
  async sendTodaysPrepEmail(
    userEmail: string,
    todayDate: Date,
    meetings: Array<{
      id: string
      title: string
      startTime: string
      participants?: string[]
      priorMeetings: Array<{
        id: string
        title: string
        startTime: string
        summary?: string
        actionItems?: string
        keyQuestions?: string
      }>
      openActionItems: Array<{
        id: string
        taskDescription: string
        assignee: string
        dueDate: string
        status: string
        priority: string
      }>
    }>,
    baseUrl: string
  ): Promise<void> {
    const dateStr = todayDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })

    const html = this.generateTodaysPrepHTML(meetings, dateStr, baseUrl)
    const text = this.generateTodaysPrepText(meetings, dateStr, baseUrl)

    await this.sendEmail({
      to: userEmail,
      subject: `Daily Prep: ${dateStr} - ${meetings.length} meeting${meetings.length !== 1 ? 's' : ''}`,
      html,
      text,
    })
  }

  private generateTodaysPrepHTML(
    meetings: Array<{
      id: string
      title: string
      startTime: string
      participants?: string[]
      priorMeetings: Array<{
        id: string
        title: string
        startTime: string
        summary?: string
        actionItems?: string
        keyQuestions?: string
      }>
      openActionItems: Array<{
        id: string
        taskDescription: string
        assignee: string
        dueDate: string
        status: string
        priority: string
      }>
    }>,
    dateStr: string,
    baseUrl: string
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily Prep - ${dateStr}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; line-height: 1.5; color: #333; max-width: 750px; margin: 0 auto; padding: 15px; background: #f8f9fa; }
    .container { background: white; border-radius: 6px; padding: 20px; }
    h1 { font-size: 16px; font-weight: 600; color: #1a1a1a; margin: 0 0 4px 0; }
    .date { font-size: 12px; color: #666; margin-bottom: 15px; }
    .meeting { border-bottom: 2px solid #e5e7eb; padding: 20px 0; margin-bottom: 10px; }
    .meeting:last-child { border-bottom: none; }
    .meeting-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; }
    .meeting-title { font-size: 15px; font-weight: 600; color: #1a1a1a; }
    .meeting-title a { color: #1a1a1a; text-decoration: none; }
    .meeting-title a:hover { text-decoration: underline; }
    .meeting-time { font-size: 12px; color: #059669; font-weight: 500; }
    .section { margin: 12px 0; }
    .section-label { font-size: 11px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
    .prior-meeting { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; margin-bottom: 10px; }
    .prior-meeting-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
    .prior-meeting-title { font-weight: 600; font-size: 13px; color: #374151; }
    .prior-meeting-date { font-size: 11px; color: #6366f1; font-weight: 500; }
    .summary-box { background: #eff6ff; border-left: 3px solid #3b82f6; padding: 10px 12px; border-radius: 0 4px 4px 0; margin-bottom: 8px; }
    .summary-box ul { margin: 0; padding-left: 16px; }
    .summary-box li { font-size: 12px; color: #1e40af; margin-bottom: 4px; line-height: 1.5; }
    .action-items-box { background: #fef3c7; border-left: 3px solid #f59e0b; padding: 10px 12px; border-radius: 0 4px 4px 0; }
    .action-items-box ul { margin: 0; padding-left: 16px; }
    .action-items-box li { font-size: 12px; color: #92400e; margin-bottom: 4px; line-height: 1.5; }
    .open-action-item { font-size: 12px; color: #444; margin: 4px 0; padding: 6px 10px; background: #fef2f2; border-left: 3px solid #ef4444; border-radius: 0 4px 4px 0; }
    .open-action-item a { color: #333; text-decoration: none; }
    .open-action-item a:hover { text-decoration: underline; }
    .action-meta { font-size: 10px; color: #888; margin-top: 2px; }
    .overdue-badge { font-size: 10px; color: #dc2626; font-weight: 600; }
    .no-meetings { text-align: center; color: #888; padding: 30px; }
    .no-history { font-size: 11px; color: #999; font-style: italic; padding: 10px; }
    .footer { margin-top: 15px; padding-top: 12px; border-top: 1px solid #eee; font-size: 10px; color: #999; text-align: center; }
    .footer a { color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Daily Prep</h1>
    <div class="date">${dateStr} - ${meetings.length} meeting${meetings.length !== 1 ? 's' : ''}</div>

    ${meetings.length === 0
      ? '<div class="no-meetings">No meetings scheduled for today.</div>'
      : meetings.map(meeting => {
          const time = meeting.startTime
            ? new Date(meeting.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
            : ''
          const meetingUrl = `${baseUrl}/meetings/${meeting.id}`
          const priorMeeting = meeting.priorMeetings[0] // Only the most recent prior meeting

          return `
          <div class="meeting">
            <div class="meeting-header">
              <div class="meeting-title"><a href="${meetingUrl}">${meeting.title}</a></div>
              <div class="meeting-time">${time}</div>
            </div>

            ${priorMeeting ? `
            <div class="section">
              <div class="section-label">Last Meeting (${priorMeeting.startTime ? new Date(priorMeeting.startTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Unknown date'})</div>
              ${priorMeeting.summary ? `
              <div class="summary-box">
                <ul>
                  ${priorMeeting.summary.split(/(?<=[.!?])\s+/).filter((s: string) => s.trim()).map((sentence: string) => `<li>${sentence.trim()}</li>`).join('')}
                </ul>
              </div>
              ` : '<div class="no-history">No summary available.</div>'}
              ${priorMeeting.actionItems ? `
              <div class="action-items-box" style="margin-top: 10px;">
                <strong style="font-size: 11px;">Action Items from that meeting:</strong>
                <ul>
                  ${priorMeeting.actionItems.split(/[,\n]/).filter((i: string) => i.trim()).map((item: string) => `<li>${item.trim()}</li>`).join('')}
                </ul>
              </div>
              ` : ''}
            </div>
            ` : '<div class="no-history">No prior meetings found for this series.</div>'}
          </div>
        `}).join('')}

    <div class="footer">
      <a href="${baseUrl}/dashboard">Open Dashboard</a> | <a href="${baseUrl}/action-items">View All Tasks</a>
    </div>
  </div>
</body>
</html>
    `.trim()
  }

  private generateTodaysPrepText(
    meetings: Array<{
      id: string
      title: string
      startTime: string
      participants?: string[]
      priorMeetings: Array<{
        id: string
        title: string
        startTime: string
        summary?: string
        actionItems?: string
        keyQuestions?: string
      }>
      openActionItems: Array<{
        id: string
        taskDescription: string
        assignee: string
        dueDate: string
        status: string
        priority: string
      }>
    }>,
    dateStr: string,
    baseUrl: string
  ): string {
    let text = `DAILY PREP\n${dateStr}\n${'='.repeat(50)}\n\n`
    text += `${meetings.length} meeting${meetings.length !== 1 ? 's' : ''}\n\n`

    if (meetings.length === 0) {
      text += 'No meetings scheduled for today.\n'
    } else {
      meetings.forEach((meeting) => {
        const time = meeting.startTime
          ? new Date(meeting.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
          : ''

        text += `${'-'.repeat(50)}\n`
        text += `${meeting.title} @ ${time}\n`
        text += `${baseUrl}/meetings/${meeting.id}\n\n`

        // Prior meeting summary (most recent only)
        const priorMeeting = meeting.priorMeetings[0]
        if (priorMeeting) {
          const priorDate = priorMeeting.startTime
            ? new Date(priorMeeting.startTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
            : 'Unknown date'
          text += `LAST MEETING (${priorDate}):\n`
          if (priorMeeting.summary) {
            text += `Summary:\n`
            priorMeeting.summary.split(/(?<=[.!?])\s+/).filter(s => s.trim()).forEach(sentence => {
              text += `  • ${sentence.trim()}\n`
            })
          }
          if (priorMeeting.actionItems) {
            text += `Action Items from that meeting:\n`
            priorMeeting.actionItems.split(/[,\n]/).filter(i => i.trim()).forEach(item => {
              text += `  • ${item.trim()}\n`
            })
          }
          text += '\n'
        } else {
          text += `No prior meetings found for this series.\n\n`
        }
      })
    }

    text += `${'-'.repeat(50)}\n`
    text += `Dashboard: ${baseUrl}/dashboard\n`
    text += `All Tasks: ${baseUrl}/action-items\n`
    return text
  }
}

export const emailService = new EmailService()
