import { Router, Request, Response } from 'express'
import { emailService } from '../services/email.service.js'
import { getAirtableClient } from '../lib/client.js'

const router: Router = Router()

/**
 * POST /api/email/test
 * Send a test email to verify Gmail SMTP configuration
 */
router.post('/test', async (req: Request, res: Response) => {
  try {
    const { to } = req.body

    if (!to) {
      return res.status(400).json({
        success: false,
        error: { message: 'Email recipient (to) is required' },
      })
    }

    await emailService.sendEmail({
      to,
      subject: 'Test Email from Meeting Intelligence System',
      html: '<h1>Success!</h1><p>Your Gmail SMTP configuration is working correctly.</p>',
      text: 'Success! Your Gmail SMTP configuration is working correctly.',
    })

    return res.json({
      success: true,
      data: { message: 'Test email sent successfully' },
    })
  } catch (error: any) {
    console.error('Error sending test email:', error)
    return res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to send test email',
        code: 'EMAIL_SEND_ERROR',
      },
    })
  }
})

/**
 * POST /api/email/meeting-prep
 * Send meeting prep email for a specific date
 */
router.post('/meeting-prep', async (req: Request, res: Response) => {
  try {
    const { to, date } = req.body

    if (!to) {
      return res.status(400).json({
        success: false,
        error: { message: 'Email recipient (to) is required' },
      })
    }

    // Default to today if no date provided
    const targetDate = date || new Date().toISOString().split('T')[0]

    // Get Airtable client and fetch meetings
    const client = getAirtableClient()
    const meetings = await client.getMeetings()

    // Filter meetings by date
    const todaysMeetings = meetings.filter((meeting: any) => {
      if (!meeting.startTime) return false
      const meetingDate = new Date(meeting.startTime).toISOString().split('T')[0]
      return meetingDate === targetDate
    })

    // Send the meeting prep email
    await emailService.sendMeetingPrepEmail(to, todaysMeetings, targetDate)

    return res.json({
      success: true,
      data: {
        message: 'Meeting prep email sent successfully',
        date: targetDate,
        meetingsCount: meetings.length,
      },
    })
  } catch (error: any) {
    console.error('Error sending meeting prep email:', error)
    return res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to send meeting prep email',
        code: 'EMAIL_SEND_ERROR',
      },
    })
  }
})

export default router
