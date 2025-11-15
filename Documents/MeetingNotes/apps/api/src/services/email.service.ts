import { Resend } from 'resend'

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
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
}

export const emailService = new EmailService()
