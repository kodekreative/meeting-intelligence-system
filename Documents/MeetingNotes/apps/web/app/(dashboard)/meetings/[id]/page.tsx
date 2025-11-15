'use client'

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useParams, useRouter } from 'next/navigation'

export default function MeetingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const meetingId = params.id as string

  const { data, isLoading, error } = useQuery({
    queryKey: ['meeting', meetingId],
    queryFn: () => apiClient.getMeeting(meetingId),
  })

  if (isLoading) {
    return (
      <div className="h-full bg-gray-50">
        <div className="h-12 bg-white border-b border-gray-200 flex items-center px-6">
          <h1 className="text-sm font-semibold text-gray-900">Meeting Details</h1>
        </div>
        <div className="p-6">
          <div className="text-xs text-gray-600">Loading...</div>
        </div>
      </div>
    )
  }

  if (error || !data?.data) {
    return (
      <div className="h-full bg-gray-50">
        <div className="h-12 bg-white border-b border-gray-200 flex items-center px-6">
          <button
            onClick={() => router.back()}
            className="text-xs text-blue-600 hover:underline mr-4"
          >
            ← Back
          </button>
          <h1 className="text-sm font-semibold text-gray-900">Meeting Details</h1>
        </div>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 px-4 py-3">
            <div className="text-xs font-medium text-red-900">Error</div>
            <div className="text-xs text-red-700">Meeting not found</div>
          </div>
        </div>
      </div>
    )
  }

  const meeting = data.data

  return (
    <div className="h-full bg-gray-50">
      {/* Header */}
      <div className="h-12 bg-white border-b border-gray-200 flex items-center px-6">
        <button
          onClick={() => router.back()}
          className="text-xs text-blue-600 hover:underline mr-4"
        >
          ← Back to Meetings
        </button>
        <h1 className="text-sm font-semibold text-gray-900">{meeting.title || 'Meeting Details'}</h1>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Basic Info */}
        <div className="bg-white border border-gray-200 px-6 py-4">
          <h2 className="text-xs font-semibold text-gray-900 mb-4 uppercase tracking-wide">Meeting Information</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-xs font-medium text-gray-700">Title</dt>
              <dd className="text-xs text-gray-900 mt-1">{meeting.title || '-'}</dd>
            </div>
            {meeting.startTime && (
              <div>
                <dt className="text-xs font-medium text-gray-700">Date & Time</dt>
                <dd className="text-xs text-gray-900 mt-1">
                  {new Date(meeting.startTime).toLocaleString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-xs font-medium text-gray-700">Owner</dt>
              <dd className="text-xs text-gray-900 mt-1">{meeting.ownerName || '-'}</dd>
              {meeting.ownerEmail && (
                <dd className="text-xs text-gray-600 mt-1">{meeting.ownerEmail}</dd>
              )}
            </div>
            {meeting.sessionId && (
              <div>
                <dt className="text-xs font-medium text-gray-700">Session ID</dt>
                <dd className="text-xs text-gray-900 mt-1">{meeting.sessionId}</dd>
              </div>
            )}
            {meeting.reportUrl && (
              <div>
                <dt className="text-xs font-medium text-gray-700">Read.ai Report</dt>
                <dd className="text-xs mt-1">
                  <a
                    href={meeting.reportUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    View on Read.ai →
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Participants */}
        {meeting.participants && meeting.participants.length > 0 && (
          <div className="bg-white border border-gray-200 px-6 py-4">
            <h2 className="text-xs font-semibold text-gray-900 mb-4 uppercase tracking-wide">
              Participants ({meeting.participants.length})
            </h2>
            <ul className="grid grid-cols-2 gap-2">
              {meeting.participants.map((participant: string, idx: number) => (
                <li key={idx} className="text-xs text-gray-900">
                  • {participant}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Summary */}
        {meeting.summary && (
          <div className="bg-white border border-gray-200 px-6 py-4">
            <h2 className="text-xs font-semibold text-gray-900 mb-4 uppercase tracking-wide">Meeting Summary</h2>
            <ul className="space-y-2">
              {meeting.summary.split('\n').filter((line: string) => line.trim()).map((line: string, idx: number) => (
                <li key={idx} className="text-xs text-gray-900">
                  • {line.trim()}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Topics */}
        {meeting.topics && (
          <div className="bg-white border border-gray-200 px-6 py-4">
            <h2 className="text-xs font-semibold text-gray-900 mb-4 uppercase tracking-wide">Topics Discussed</h2>
            <ul className="space-y-2">
              {meeting.topics.split(',').map((topic: string, idx: number) => (
                <li key={idx} className="text-xs text-gray-900">
                  • {topic.trim()}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Key Questions */}
        {meeting.keyQuestions && (
          <div className="bg-white border border-gray-200 px-6 py-4">
            <h2 className="text-xs font-semibold text-gray-900 mb-4 uppercase tracking-wide">Key Questions</h2>
            <ul className="space-y-2">
              {meeting.keyQuestions.split(',').map((question: string, idx: number) => (
                <li key={idx} className="text-xs text-gray-900">
                  • {question.trim()}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Items */}
        {meeting.actionItems && (
          <div className="bg-white border border-gray-200 px-6 py-4">
            <h2 className="text-xs font-semibold text-gray-900 mb-4 uppercase tracking-wide">Action Items</h2>
            <ul className="space-y-2">
              {meeting.actionItems.split('\n').filter((line: string) => line.trim()).map((line: string, idx: number) => (
                <li key={idx} className="text-xs text-gray-900">
                  • {line.trim()}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Chapter Summaries */}
        {meeting.chapterSummaries && (
          <div className="bg-white border border-gray-200 px-6 py-4">
            <h2 className="text-xs font-semibold text-gray-900 mb-4 uppercase tracking-wide">Chapter Summaries</h2>
            <ul className="space-y-2">
              {meeting.chapterSummaries.split('\n').filter((line: string) => line.trim()).map((line: string, idx: number) => (
                <li key={idx} className="text-xs text-gray-900">
                  • {line.trim()}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Transcript */}
        {(meeting.speakerBlocks || meeting.transcriptSpeakers) && (
          <div className="bg-white border border-gray-200 px-6 py-4">
            <h2 className="text-xs font-semibold text-gray-900 mb-4 uppercase tracking-wide">Transcript</h2>
            <div className="text-xs text-gray-900 whitespace-pre-wrap font-mono">
              {meeting.speakerBlocks || meeting.transcriptSpeakers}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
