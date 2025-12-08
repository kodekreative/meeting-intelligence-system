/**
 * Email Service
 * Handles sending daily digest emails using nodemailer
 */

import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'

export interface EmailOptions {
  to: string
  subject: string
  html: string
  text: string
}

class EmailService {
  private transporter: Transporter | null = null

  constructor() {
    this.initializeTransporter()
  }

  private initializeTransporter() {
    // For development, use a test account or console logging
    // In production, this would use Microsoft Graph API or SMTP
    const smtpConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER && process.env.SMTP_PASS
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
    }

    if (smtpConfig.auth) {
      this.transporter = nodemailer.createTransporter(smtpConfig)
    } else {
      console.warn('No SMTP credentials configured. Emails will be logged to console.')
    }
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    if (!this.transporter) {
      console.log('📧 EMAIL (Console Mode):')
      console.log(`To: ${options.to}`)
      console.log(`Subject: ${options.subject}`)
      console.log(`\n${options.text}\n`)
      console.log('---')
      return
    }

    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@meetingintelligence.com',
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      })
      console.log(`✅ Email sent to ${options.to}: ${options.subject}`)
    } catch (error) {
      console.error(`❌ Failed to send email to ${options.to}:`, error)
      throw error
    }
  }

  async sendDailyDigest(
    userEmail: string,
    digestData: {
      todaysMeetings: any[]
      actionItems: any[]
      followUps: any[]
      businessIssues: any[]
      personalIntel: any[]
    }
  ): Promise<void> {
    const html = this.generateDailyDigestHTML(digestData)
    const text = this.generateDailyDigestText(digestData)

    await this.sendEmail({
      to: userEmail,
      subject: `Your Daily Brief - ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`,
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
}

export const emailService = new EmailService()
