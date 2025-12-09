'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, CheckCircle2, XCircle, RefreshCw, Loader2 } from 'lucide-react'

interface CalendarEvent {
  id: string
  subject: string
  startTime: string
  endTime: string
  location?: string
  attendees: string[]
  organizer: string
  isOnlineMeeting: boolean
  onlineMeetingUrl?: string
}

function CalendarSettingsPage() {
  const searchParams = useSearchParams()
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([])
  const [userId, setUserId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    // For demo purposes, using a hardcoded user ID
    // In production, this would come from authentication context
    const demoUserId = 'rec123456789' // Replace with actual user ID from auth
    setUserId(demoUserId)

    checkConnectionStatus(demoUserId)

    // Check for OAuth callback status
    const callbackSuccess = searchParams.get('success')
    const callbackError = searchParams.get('error')
    const syncedCount = searchParams.get('synced')

    if (callbackSuccess === 'true') {
      setSuccessMessage(`Calendar connected successfully! Synced ${syncedCount || 0} events.`)
      setIsConnected(true)
      fetchUpcomingEvents(demoUserId)
    } else if (callbackError) {
      setError(`Failed to connect calendar: ${callbackError}`)
    }
  }, [searchParams])

  const checkConnectionStatus = async (uid: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/calendar/status?userId=${uid}`)
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/calendar/events?userId=${uid}&days=7`)
      const data = await response.json()

      if (data.success) {
        setUpcomingEvents(data.data.events)
      }
    } catch (err) {
      console.error('Failed to fetch calendar events:', err)
    }
  }

  const handleConnect = () => {
    // Redirect to OAuth login
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/login?userId=${userId}`
  }

  const handleSync = async () => {
    setIsSyncing(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/calendar/sync`, {
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/calendar/disconnect`, {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Calendar Settings</h1>
        <p className="text-gray-600">Connect your Outlook/Exchange calendar to see upcoming meetings</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
          <p className="text-green-800">{successMessage}</p>
        </div>
      )}

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Microsoft Outlook/Exchange
          </CardTitle>
          <CardDescription>
            Connect your Microsoft calendar to automatically sync meetings and events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-300'}`}
              />
              <div>
                <p className="font-medium">
                  {isConnected ? 'Connected' : 'Not Connected'}
                </p>
                <p className="text-sm text-gray-500">
                  {isConnected
                    ? 'Your calendar is synced and up to date'
                    : 'Connect your calendar to see upcoming meetings'}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              {isConnected ? (
                <>
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
                </>
              ) : (
                <Button onClick={handleConnect}>
                  Connect Calendar
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {isConnected && upcomingEvents.length > 0 && (
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
                    {event.isOnlineMeeting && (
                      <Badge variant="secondary">Online</Badge>
                    )}
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

                    <p>
                      <span className="font-medium">Organizer:</span> {event.organizer}
                    </p>

                    {event.attendees.length > 0 && (
                      <p>
                        <span className="font-medium">Attendees:</span>{' '}
                        {event.attendees.slice(0, 3).join(', ')}
                        {event.attendees.length > 3 && ` +${event.attendees.length - 3} more`}
                      </p>
                    )}

                    {event.onlineMeetingUrl && (
                      <a
                        href={event.onlineMeetingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline inline-block mt-2"
                      >
                        Join Meeting →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isConnected && upcomingEvents.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No upcoming meetings in the next 7 days</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>}>
      <CalendarSettingsPage />
    </Suspense>
  )
}
