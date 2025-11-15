'use client'

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { formatDateTime, formatDate } from '@/lib/utils'

export default function DashboardPage() {
  const today = new Date().toISOString().split('T')[0]

  const { data, isLoading, error } = useQuery({
    queryKey: ['meetings', 'today', today],
    queryFn: () => apiClient.getMeetings({ fromDate: today, toDate: today }),
  })

  if (isLoading) {
    return (
      <div className="h-full bg-gray-50">
        <div className="h-12 bg-white border-b border-gray-200 flex items-center px-6">
          <h1 className="text-sm font-semibold text-gray-900">Dashboard</h1>
        </div>
        <div className="p-6">
          <div className="text-xs text-gray-600">Loading today's meetings...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full bg-gray-50">
        <div className="h-12 bg-white border-b border-gray-200 flex items-center px-6">
          <h1 className="text-sm font-semibold text-gray-900">Dashboard</h1>
        </div>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 px-4 py-3">
            <div className="text-xs font-medium text-red-900 mb-1">Connection Error</div>
            <div className="text-xs text-red-700">{error.message}</div>
            <div className="text-xs text-red-600 mt-1">Make sure the backend API is running on port 3001</div>
          </div>
        </div>
      </div>
    )
  }

  const meetings = data?.data || []
  const todayDate = formatDate(new Date())

  return (
    <div className="h-full bg-gray-50">
      {/* Header bar */}
      <div className="h-12 bg-white border-b border-gray-200 flex items-center px-6 justify-between">
        <h1 className="text-sm font-semibold text-gray-900">Dashboard</h1>
        <div className="text-xs text-gray-600">{todayDate}</div>
      </div>

      {/* Main content */}
      <div className="p-6">
        <div className="max-w-6xl">
          {/* Today's Meetings Section */}
          <div className="mb-6">
            <h2 className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">
              Today's Meetings
            </h2>

            {meetings.length === 0 ? (
              <div className="bg-white border border-gray-200 px-6 py-8 text-center">
                <div className="text-xs text-gray-600">No meetings scheduled for today</div>
                <div className="text-xs text-gray-500 mt-1">
                  Your calendar is clear
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {meetings.map((meeting: any) => (
                  <div
                    key={meeting.id}
                    className="bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
                  >
                    <div className="px-4 py-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="text-xs font-medium text-gray-900 mb-1">
                            {meeting.title || 'Team Discussion'}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-600">
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
                            className="text-xs text-blue-600 hover:underline"
                          >
                            View Report
                          </a>
                        )}
                      </div>

                      {meeting.participants && meeting.participants.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="text-xs text-gray-500 mb-1">Participants:</div>
                          <div className="text-xs text-gray-700">
                            {meeting.participants.slice(0, 5).join(', ')}
                            {meeting.participants.length > 5 && ` +${meeting.participants.length - 5} more`}
                          </div>
                        </div>
                      )}

                      {meeting.topics && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="text-xs text-gray-500 mb-1">Topics:</div>
                          <div className="text-xs text-gray-700">{meeting.topics}</div>
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
            <div className="bg-white border border-gray-200 px-4 py-3">
              <div className="text-xs text-gray-500 mb-1">Meetings Today</div>
              <div className="text-lg font-semibold text-gray-900">{meetings.length}</div>
            </div>
            <div className="bg-white border border-gray-200 px-4 py-3">
              <div className="text-xs text-gray-500 mb-1">Action Items</div>
              <div className="text-lg font-semibold text-gray-900">-</div>
            </div>
            <div className="bg-white border border-gray-200 px-4 py-3">
              <div className="text-xs text-gray-500 mb-1">Follow-ups Needed</div>
              <div className="text-lg font-semibold text-gray-900">-</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
