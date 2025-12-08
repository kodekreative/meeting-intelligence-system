'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, CheckCircle2, XCircle, RefreshCw, Loader2, ExternalLink, Copy } from 'lucide-react'

interface CalendarEvent {
  id: string
  subject: string
  startTime: string
  endTime: string
  location?: string
  attendees: string[]
  organizer?: string
  description?: string
}

export default function SimpleCalendarPage() {
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([])
  const [userId, setUserId] = useState<string>('')
  const [icalUrl, setIcalUrl] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [showInstructions, setShowInstructions] = useState(false)

  useEffect(() => {
    // For demo purposes, using a hardcoded user ID
    // In production, this would come from authentication context
    const demoUserId = 'recJns5edTqex92I8' // Your Airtable User Record ID
    setUserId(demoUserId)

    checkConnectionStatus(demoUserId)
  }, [])

  const checkConnectionStatus = async (uid: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/icalendar/status?userId=${uid}`)
      const data = await response.json()

      if (data.success) {
        setIsConnected(data.data.connected)
        if (data.data.connected) {
          await fetchUpcomingEvents(uid)
        }
      }
    } catch (err) {
      console.error('Failed to check connection status:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchUpcomingEvents = async (uid: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/icalendar/events?userId=${uid}&days=7`)
      const data = await response.json()

      if (data.success) {
        setUpcomingEvents(data.data.events)
      }
    } catch (err) {
      console.error('Failed to fetch calendar events:', err)
    }
  }

  const handleConnect = async () => {
    if (!icalUrl.trim()) {
      setError('Please enter your iCalendar URL')
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/icalendar/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, icalUrl: icalUrl.trim() }),
      })

      const data = await response.json()

      if (data.success) {
        setIsConnected(true)
        setSuccessMessage(`Calendar connected! Synced ${data.data.eventsSynced} events.`)
        setIcalUrl('')
        await fetchUpcomingEvents(userId)
      } else {
        setError(data.error?.message || 'Failed to connect calendar')
      }
    } catch (err) {
      setError('Failed to connect calendar. Please check your URL and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSync = async () => {
    setIsSyncing(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/icalendar/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccessMessage(`Synced ${data.data.eventsSynced} calendar events successfully!`)
        await fetchUpcomingEvents(userId)
      } else {
        setError(data.error?.message || 'Failed to sync calendar')
      }
    } catch (err) {
      setError('Failed to sync calendar. Please try again.')
    } finally {
      setIsSyncing(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your calendar?')) {
      return
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/icalendar/disconnect`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      })

      const data = await response.json()

      if (data.success) {
        setIsConnected(false)
        setUpcomingEvents([])
        setSuccessMessage('Calendar disconnected successfully')
      } else {
        setError('Failed to disconnect calendar')
      }
    } catch (err) {
      setError('Failed to disconnect calendar. Please try again.')
    }
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setSuccessMessage('Copied to clipboard!')
    setTimeout(() => setSuccessMessage(null), 2000)
  }

  if (isLoading && !isSyncing) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Simple Calendar Setup</h1>
        <p className="text-gray-600">Connect your Outlook calendar - No Azure, No OAuth, Super Easy!</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <p className="text-green-800">{successMessage}</p>
        </div>
      )}

      {!isConnected ? (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Connect Your Outlook Calendar
            </CardTitle>
            <CardDescription>
              Paste your Outlook iCalendar URL below. No Azure setup required!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="icalUrl" className="block text-sm font-medium text-gray-700 mb-2">
                iCalendar URL
              </label>
              <input
                type="text"
                id="icalUrl"
                value={icalUrl}
                onChange={(e) => setIcalUrl(e.target.value)}
                placeholder="https://outlook.live.com/owa/calendar/..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-2 text-sm text-gray-500">
                Paste your Outlook.com iCalendar (ICS) URL here
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleConnect} disabled={!icalUrl.trim()}>
                Connect Calendar
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowInstructions(!showInstructions)}
              >
                {showInstructions ? 'Hide' : 'Show'} Instructions
              </Button>
            </div>

            {showInstructions && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  How to Get Your iCalendar URL
                </h3>
                <ol className="space-y-2 text-sm">
                  <li className="flex gap-2">
                    <span className="font-semibold">1.</span>
                    <span>
                      Go to{' '}
                      <a
                        href="https://outlook.live.com/calendar"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        outlook.live.com/calendar
                      </a>
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold">2.</span>
                    <span>Click the Settings gear icon (top right)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold">3.</span>
                    <span>Click "View all Outlook settings"</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold">4.</span>
                    <span>Go to Calendar → Shared calendars</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold">5.</span>
                    <span>Under "Publish a calendar", select your calendar</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold">6.</span>
                    <span>Click "Publish"</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold">7.</span>
                    <span>Under "ICS", click "Can view all details"</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold">8.</span>
                    <span>Copy the ICS link and paste it above</span>
                  </li>
                </ol>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Outlook Calendar
              </CardTitle>
              <CardDescription>
                Your calendar is connected via iCalendar URL
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <div>
                    <p className="font-medium">Connected</p>
                    <p className="text-sm text-gray-500">
                      Your calendar is synced and up to date
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleSync}
                    disabled={isSyncing}
                    variant="outline"
                  >
                    {isSyncing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Sync Now
                      </>
                    )}
                  </Button>
                  <Button onClick={handleDisconnect} variant="destructive">
                    Disconnect
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {upcomingEvents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Meetings (Next 7 Days)</CardTitle>
                <CardDescription>
                  {upcomingEvents.length} meeting{upcomingEvents.length !== 1 ? 's' : ''} scheduled
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {upcomingEvents.map((event) => (
                    <div
                      key={event.id}
                      className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-lg">{event.subject}</h3>
                      </div>

                      <div className="space-y-1 text-sm text-gray-600">
                        <p>
                          <span className="font-medium">When:</span>{' '}
                          {formatDateTime(event.startTime)}
                        </p>

                        {event.location && (
                          <p>
                            <span className="font-medium">Where:</span> {event.location}
                          </p>
                        )}

                        {event.organizer && (
                          <p>
                            <span className="font-medium">Organizer:</span> {event.organizer}
                          </p>
                        )}

                        {event.attendees.length > 0 && (
                          <p>
                            <span className="font-medium">Attendees:</span>{' '}
                            {event.attendees.slice(0, 3).join(', ')}
                            {event.attendees.length > 3 && ` +${event.attendees.length - 3} more`}
                          </p>
                        )}

                        {event.description && (
                          <p className="mt-2 text-gray-500 line-clamp-2">
                            {event.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {upcomingEvents.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No upcoming meetings in the next 7 days</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
