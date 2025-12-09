'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, Users, FileText } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import type { ThemeMeeting } from '@/lib/types'
import { ThemePill } from '@/components/themes/theme-pill'

export default function ThemeDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const themeId = params.id

  const { data: themeData, isLoading: themeLoading } = useQuery({
    queryKey: ['themes', themeId],
    queryFn: () => apiClient.themes.get(themeId),
  })

  const { data: metricsData, isLoading: metricsLoading } = useQuery({
    queryKey: ['theme-metrics', themeId],
    queryFn: () => apiClient.themes.getMetrics(themeId),
  })

  const { data: meetingsData, isLoading: meetingsLoading } = useQuery({
    queryKey: ['theme-meetings', themeId],
    queryFn: () => apiClient.themes.getMeetings(themeId),
  })

  const theme = themeData?.data
  const metrics = metricsData?.data
  const meetings = (meetingsData?.data || []) as ThemeMeeting[]

  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatTime = (dateString?: string) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  if (themeLoading || metricsLoading) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xs text-gray-500">Loading theme...</div>
      </div>
    )
  }

  if (!theme) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-4">Theme not found</p>
          <button
            onClick={() => router.push('/themes')}
            className="px-4 py-2 text-xs font-medium text-white bg-gray-900 rounded hover:bg-gray-800 transition-colors"
          >
            Back to Themes
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="h-12 flex items-center px-6 gap-4">
          <button
            onClick={() => router.push('/themes')}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <ArrowLeft size={16} className="text-gray-600" />
          </button>
          <ThemePill theme={theme} size="md" />
          {theme.description && (
            <span className="text-xs text-gray-600">— {theme.description}</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Metrics Cards */}
        <div className="p-6 border-b border-gray-200 bg-white">
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded border border-gray-200">
              <div className="text-xs text-gray-600 mb-1">Total Meetings</div>
              <div className="text-2xl font-semibold text-gray-900">
                {metrics?.meetingCount || 0}
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded border border-gray-200">
              <div className="text-xs text-gray-600 mb-1">Action Items</div>
              <div className="text-2xl font-semibold text-gray-900">
                {metrics?.actionItemCount || 0}
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded border border-gray-200">
              <div className="text-xs text-gray-600 mb-1">Business Issues</div>
              <div className="text-2xl font-semibold text-gray-900">
                {metrics?.issueCount || 0}
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded border border-gray-200">
              <div className="text-xs text-gray-600 mb-1">Last Discussed</div>
              <div className="text-sm font-semibold text-gray-900">
                {formatDate(metrics?.lastDiscussedAt) || 'Never'}
              </div>
            </div>
          </div>
        </div>

        {/* Meetings List */}
        <div className="p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">
            Related Meetings ({meetings.length})
          </h2>

          {meetingsLoading ? (
            <div className="text-center py-8 text-xs text-gray-500">Loading meetings...</div>
          ) : meetings.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-500">
              No meetings tagged with this theme yet.
            </div>
          ) : (
            <div className="space-y-3">
              {meetings
                .sort((a, b) => {
                  const dateA = a.startTime ? new Date(a.startTime).getTime() : 0
                  const dateB = b.startTime ? new Date(b.startTime).getTime() : 0
                  return dateB - dateA
                })
                .map((meeting) => (
                  <div
                    key={meeting.id}
                    onClick={() => router.push(`/meetings/${meeting.id}`)}
                    className="bg-white border border-gray-200 rounded p-4 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
                  >
                    {/* Meeting Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {meeting.title || meeting.name || 'Untitled Meeting'}
                        </h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar size={12} />
                            {formatDate(meeting.startTime)}
                          </div>
                          {meeting.startTime && (
                            <div className="flex items-center gap-1">
                              <span>{formatTime(meeting.startTime)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Meeting Details */}
                    {meeting.participants && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-600 mt-2">
                        <Users size={12} />
                        <span className="truncate">{meeting.participants}</span>
                      </div>
                    )}

                    {meeting.summary && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-start gap-1.5 text-xs text-gray-600">
                          <FileText size={12} className="mt-0.5 flex-shrink-0" />
                          <p className="line-clamp-2">{meeting.summary}</p>
                        </div>
                      </div>
                    )}

                    {/* Report Link */}
                    {meeting.reportUrl && (
                      <div className="mt-3">
                        <a
                          href={meeting.reportUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          View Full Report →
                        </a>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
