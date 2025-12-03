'use client'

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { formatDateTime, formatDate } from '@/lib/utils'
import Link from 'next/link'

export default function DashboardPage() {
  const today = new Date().toISOString().split('T')[0]
  const demoUserId = 'recJns5edTqex92I8' // Your Airtable User Record ID

  const { data, isLoading, error } = useQuery({
    queryKey: ['meetings', 'today', today],
    queryFn: () => apiClient.getMeetings({ fromDate: today, toDate: today }),
  })

  // Fetch today's calendar events
  const { data: calendarData, isLoading: calendarLoading } = useQuery({
    queryKey: ['calendar-events', 'today', demoUserId],
    queryFn: async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/icalendar/events?userId=${demoUserId}&days=1`)
      return response.json()
    },
  })

  if (isLoading) {
    return (
      <div className="h-full bg-gradient-to-br from-gray-900 via-slate-900 to-black">
        <div className="h-12 bg-white/5 backdrop-blur-md border-b border-white/10 flex items-center px-6">
          <h1 className="text-sm font-semibold text-white">Dashboard</h1>
        </div>
        <div className="p-6">
          <div className="text-xs text-gray-300">Loading today's meetings...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full bg-gradient-to-br from-gray-900 via-slate-900 to-black">
        <div className="h-12 bg-white/5 backdrop-blur-md border-b border-white/10 flex items-center px-6">
          <h1 className="text-sm font-semibold text-white">Dashboard</h1>
        </div>
        <div className="p-6">
          <div className="bg-red-500/10 backdrop-blur-md border border-red-500/20 px-4 py-3 rounded-lg">
            <div className="text-xs font-medium text-red-300 mb-1">Connection Error</div>
            <div className="text-xs text-red-400">{error.message}</div>
            <div className="text-xs text-red-400 mt-1">Make sure the backend API is running on port 3001</div>
          </div>
        </div>
      </div>
    )
  }

  const meetings = data?.data || []
  const calendarEvents = calendarData?.data?.events || []
  const todayDate = formatDate(new Date())

  return (
    <div className="h-full bg-gradient-to-br from-gray-900 via-slate-900 to-black overflow-hidden relative">
      {/* Animated background gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-blue-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Header bar */}
      <div className="h-12 bg-white/5 backdrop-blur-md border-b border-white/10 flex items-center px-6 justify-between relative z-10">
        <h1 className="text-sm font-semibold text-white">Dashboard</h1>
        <div className="text-xs text-gray-300">{todayDate}</div>
      </div>

      {/* Main content */}
      <div className="p-6 relative z-10">
        <div className="max-w-6xl">
          {/* Today's Calendar Events */}
          <div className="mb-6">
            <h2 className="text-xs font-semibold text-gray-300 mb-3 uppercase tracking-wide">
              Today's Schedule
            </h2>

            {calendarLoading ? (
              <div className="bg-white/5 backdrop-blur-md border border-white/10 px-6 py-4 rounded-lg">
                <div className="text-xs text-gray-300">Loading calendar...</div>
              </div>
            ) : calendarEvents.length === 0 ? (
              <div className="bg-white/5 backdrop-blur-md border border-white/10 px-6 py-8 text-center rounded-lg">
                <div className="text-xs text-gray-300">No meetings scheduled for today</div>
                <div className="text-xs text-gray-400 mt-1">
                  Your calendar is clear
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {calendarEvents.map((event: any) => (
                  <div
                    key={event.id}
                    className="bg-white/5 backdrop-blur-md border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all rounded-lg"
                  >
                    <div className="px-4 py-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="text-xs font-medium text-white mb-1">
                            {event.subject || 'Untitled Meeting'}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            <span>{formatDateTime(event.startTime)}</span>
                            {event.location && (
                              <>
                                <span>•</span>
                                <span>{event.location}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Meeting Transcripts Section */}
          <div className="mb-6">
            <h2 className="text-xs font-semibold text-gray-300 mb-3 uppercase tracking-wide">
              Meeting Transcripts
            </h2>

            {meetings.length === 0 ? (
              <div className="bg-white/5 backdrop-blur-md border border-white/10 px-6 py-8 text-center rounded-lg">
                <div className="text-xs text-gray-300">No meeting transcripts for today</div>
                <div className="text-xs text-gray-400 mt-1">
                  Transcripts will appear here after meetings are processed
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {meetings.map((meeting: any) => (
                  <div
                    key={meeting.id}
                    className="bg-white/5 backdrop-blur-md border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all rounded-lg"
                  >
                    <div className="px-4 py-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <Link
                            href={`/meetings/${meeting.id}`}
                            className="text-xs font-medium text-white hover:text-blue-300 hover:underline mb-1 inline-block"
                          >
                            {meeting.title || 'Team Discussion'}
                          </Link>
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            {meeting.startTime && (
                              <span>{formatDateTime(meeting.startTime)}</span>
                            )}
                            {meeting.participants && meeting.participants.length > 0 && (
                              <>
                                <span>•</span>
                                <span>
                                  {meeting.participants.length}{' '}
                                  {meeting.participants.length === 1 ? 'participant' : 'participants'}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        {meeting.reportUrl && (
                          <a
                            href={meeting.reportUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:text-blue-300 hover:underline"
                          >
                            View Report
                          </a>
                        )}
                      </div>

                      {meeting.participants && meeting.participants.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <div className="text-xs text-gray-400 mb-1">Participants:</div>
                          <div className="text-xs text-gray-300">
                            {meeting.participants.slice(0, 5).join(', ')}
                            {meeting.participants.length > 5 && ` +${meeting.participants.length - 5} more`}
                          </div>
                        </div>
                      )}

                      {meeting.topics && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <div className="text-xs text-gray-400 mb-1">Topics:</div>
                          <div className="text-xs text-gray-300">{meeting.topics}</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 px-4 py-3 rounded-lg">
              <div className="text-xs text-gray-400 mb-1">Meetings Today</div>
              <div className="text-lg font-semibold text-white">{meetings.length}</div>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 px-4 py-3 rounded-lg">
              <div className="text-xs text-gray-400 mb-1">Action Items</div>
              <div className="text-lg font-semibold text-white">-</div>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 px-4 py-3 rounded-lg">
              <div className="text-xs text-gray-400 mb-1">Follow-ups Needed</div>
              <div className="text-lg font-semibold text-white">-</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
