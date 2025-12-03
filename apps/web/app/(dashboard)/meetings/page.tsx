'use client'

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { formatDateTime } from '@/lib/utils'

export default function MeetingsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['meetings'],
    queryFn: () => apiClient.getMeetings(),
  })

  if (isLoading) {
    return (
      <div className="h-full bg-gray-50">
        <div className="h-12 bg-white border-b border-gray-200 flex items-center px-6">
          <h1 className="text-sm font-semibold text-gray-900">Meetings</h1>
        </div>
        <div className="p-6">
          <div className="text-xs text-gray-600">Loading meetings...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full bg-gray-50">
        <div className="h-12 bg-white border-b border-gray-200 flex items-center px-6">
          <h1 className="text-sm font-semibold text-gray-900">Meetings</h1>
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

  // Group meetings by date (historical view)
  const meetingsByDate = meetings.reduce((acc: any, meeting: any) => {
    if (!meeting.startTime) return acc

    // Extract just the date part for grouping
    const dateObj = new Date(meeting.startTime)
    const date = dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(meeting)
    return acc
  }, {})

  // Collect meetings without dates
  const meetingsWithoutDates = meetings.filter((m: any) => !m.startTime)

  // Sort dates in descending order (most recent first)
  const sortedDates = Object.keys(meetingsByDate).sort((a, b) => {
    const dateA = new Date(meetingsByDate[a][0].startTime)
    const dateB = new Date(meetingsByDate[b][0].startTime)
    return dateB.getTime() - dateA.getTime()
  })

  // Sort meetings within each date by title
  sortedDates.forEach(date => {
    meetingsByDate[date].sort((a: any, b: any) => {
      const titleA = a.title || 'Team Discussion'
      const titleB = b.title || 'Team Discussion'
      return titleA.localeCompare(titleB)
    })
  })

  // Sort meetings without dates by title
  meetingsWithoutDates.sort((a: any, b: any) => {
    const titleA = a.title || 'Team Discussion'
    const titleB = b.title || 'Team Discussion'
    return titleA.localeCompare(titleB)
  })

  return (
    <div className="h-full bg-gray-50">
      {/* Header bar */}
      <div className="h-12 bg-white border-b border-gray-200 flex items-center px-6 justify-between">
        <h1 className="text-sm font-semibold text-gray-900">Meetings</h1>
        <div className="text-xs text-gray-600">
          {meetings.length} {meetings.length === 1 ? 'meeting' : 'meetings'}
        </div>
      </div>

      {/* Meetings grouped by date */}
      <div className="p-6 space-y-6">
        {meetings.length === 0 ? (
          <div className="bg-white border border-gray-200 px-6 py-12 text-center">
            <div className="text-xs text-gray-600">No meetings found</div>
            <div className="text-xs text-gray-500 mt-1">
              Meetings from Read.ai will appear here once synced to Airtable
            </div>
          </div>
        ) : (
          <>
            {sortedDates.map(date => (
            <div key={date} className="bg-white border border-gray-200">
              {/* Date header */}
              <div className="px-4 py-2 bg-gray-100 border-b border-gray-200">
                <h2 className="text-xs font-semibold text-gray-900">{date}</h2>
              </div>

              {/* Table header */}
              <div className="grid grid-cols-12 gap-4 px-4 py-2 border-b border-gray-200 bg-gray-50">
                <div className="col-span-3 text-xs font-semibold text-gray-700">Title</div>
                <div className="col-span-2 text-xs font-semibold text-gray-700">Date & Time</div>
                <div className="col-span-1 text-xs font-semibold text-gray-700">Participants</div>
                <div className="col-span-1 text-xs font-semibold text-gray-700">Owner</div>
                <div className="col-span-4 text-xs font-semibold text-gray-700">Topics</div>
                <div className="col-span-1 text-xs font-semibold text-gray-700"></div>
              </div>

              {/* Table rows */}
              {meetingsByDate[date].map((meeting: any) => (
                <div
                  key={meeting.id}
                  className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer"
                >
                  <div className="col-span-3">
                    <div className="text-xs font-medium text-gray-900">
                      {meeting.title || 'Team Discussion'}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs text-gray-600">
                      {meeting.startTime
                        ? new Date(meeting.startTime).toLocaleString('en-US', {
                            month: 'numeric',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })
                        : '-'}
                    </div>
                  </div>
                  <div className="col-span-1">
                    <div className="text-xs text-gray-600">
                      {meeting.participants && meeting.participants.length > 0
                        ? `${meeting.participants.length} ${meeting.participants.length === 1 ? 'person' : 'people'}`
                        : '-'}
                    </div>
                  </div>
                  <div className="col-span-1">
                    <div className="text-xs text-gray-600 truncate">
                      {meeting.ownerName || '-'}
                    </div>
                  </div>
                  <div className="col-span-4">
                    {meeting.topics ? (
                      <ul className="text-[11px] text-gray-600 space-y-0.5">
                        {meeting.topics.split(',').map((topic: string, idx: number) => (
                          <li key={idx} className="truncate">• {topic.trim()}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-xs text-gray-600">-</div>
                    )}
                  </div>
                  <div className="col-span-1 text-right">
                    <a
                      href={`/meetings/${meeting.id}`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ))}

          {/* Meetings without dates */}
          {meetingsWithoutDates.length > 0 && (
            <div className="bg-white border border-gray-200">
              {/* Header */}
              <div className="px-4 py-2 bg-gray-100 border-b border-gray-200">
                <h2 className="text-xs font-semibold text-gray-900">Meetings (Date Not Available)</h2>
              </div>

              {/* Table header */}
              <div className="grid grid-cols-12 gap-4 px-4 py-2 border-b border-gray-200 bg-gray-50">
                <div className="col-span-4 text-xs font-semibold text-gray-700">Title</div>
                <div className="col-span-2 text-xs font-semibold text-gray-700">Participants</div>
                <div className="col-span-1 text-xs font-semibold text-gray-700">Owner</div>
                <div className="col-span-4 text-xs font-semibold text-gray-700">Topics</div>
                <div className="col-span-1 text-xs font-semibold text-gray-700"></div>
              </div>

              {/* Table rows */}
              {meetingsWithoutDates.map((meeting: any) => (
                <div
                  key={meeting.id}
                  className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer"
                >
                  <div className="col-span-4">
                    <div className="text-xs font-medium text-gray-900">
                      {meeting.title || 'Team Discussion'}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs text-gray-600">
                      {meeting.participants && meeting.participants.length > 0
                        ? `${meeting.participants.length} ${meeting.participants.length === 1 ? 'person' : 'people'}`
                        : '-'}
                    </div>
                  </div>
                  <div className="col-span-1">
                    <div className="text-xs text-gray-600 truncate">
                      {meeting.ownerName || '-'}
                    </div>
                  </div>
                  <div className="col-span-4">
                    {meeting.topics ? (
                      <ul className="text-[11px] text-gray-600 space-y-0.5">
                        {meeting.topics.split(',').map((topic: string, idx: number) => (
                          <li key={idx} className="truncate">• {topic.trim()}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-xs text-gray-600">-</div>
                    )}
                  </div>
                  <div className="col-span-1 text-right">
                    <a
                      href={`/meetings/${meeting.id}`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
          </>
        )}
      </div>
    </div>
  )
}
