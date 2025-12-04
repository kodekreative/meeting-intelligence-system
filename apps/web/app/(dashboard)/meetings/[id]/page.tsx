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
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-6 py-4">
          <h2 className="text-xs font-semibold text-blue-900 mb-4 uppercase tracking-wide">Meeting Information</h2>
          <div className="rounded-lg overflow-hidden border border-blue-200">
            <div className="bg-white px-4 py-3">
              <dt className="text-xs font-semibold text-gray-900">Title</dt>
              <dd className="text-xs text-gray-700 mt-1">{meeting.title || '-'}</dd>
            </div>
            {meeting.startTime && (
              <div className="bg-gray-50 px-4 py-3">
                <dt className="text-xs font-semibold text-gray-900">Date & Time</dt>
                <dd className="text-xs text-gray-700 mt-1">
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
            <div className={meeting.startTime ? 'bg-white px-4 py-3' : 'bg-gray-50 px-4 py-3'}>
              <dt className="text-xs font-semibold text-gray-900">Owner</dt>
              <dd className="text-xs text-gray-700 mt-1">{meeting.ownerName || '-'}</dd>
              {meeting.ownerEmail && (
                <dd className="text-xs text-gray-500 mt-1">{meeting.ownerEmail}</dd>
              )}
            </div>
            {meeting.sessionId && (
              <div className="bg-gray-50 px-4 py-3">
                <dt className="text-xs font-semibold text-gray-900">Session ID</dt>
                <dd className="text-xs text-gray-700 mt-1">{meeting.sessionId}</dd>
              </div>
            )}
            {meeting.reportUrl && (
              <div className="bg-white px-4 py-3">
                <dt className="text-xs font-semibold text-gray-900">Read.ai Report</dt>
                <dd className="text-xs mt-1">
                  <a
                    href={meeting.reportUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-medium"
                  >
                    View on Read.ai →
                  </a>
                </dd>
              </div>
            )}
          </div>
        </div>

        {/* Participants */}
        {meeting.participants && meeting.participants.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-6 py-4">
            <h2 className="text-xs font-semibold text-blue-900 mb-4 uppercase tracking-wide">
              Participants ({meeting.participants.length})
            </h2>
            <div className="rounded-lg overflow-hidden border border-blue-200">
              <div className="grid grid-cols-2">
                {meeting.participants.map((participant: string, idx: number) => (
                  <div key={idx} className={`text-xs px-4 py-3 ${idx % 2 === 0 ? 'bg-white text-gray-900' : 'bg-gray-50 text-gray-700'}`}>
                    • <span className="font-medium">{participant}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Summary */}
        {meeting.summary && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-6 py-4">
            <h2 className="text-xs font-semibold text-blue-900 mb-4 uppercase tracking-wide">Meeting Summary</h2>
            <div className="rounded-lg overflow-hidden border border-blue-200">
              {meeting.summary.split('\n').filter((line: string) => line.trim()).map((line: string, idx: number) => (
                <div key={idx} className={`text-xs px-4 py-3 ${idx % 2 === 0 ? 'bg-white text-gray-900' : 'bg-gray-50 text-gray-700'}`}>
                  • {line.trim()}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Topics */}
        {meeting.topics && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-6 py-4">
            <h2 className="text-xs font-semibold text-blue-900 mb-4 uppercase tracking-wide">Topics Discussed</h2>
            <div className="rounded-lg overflow-hidden border border-blue-200">
              {meeting.topics.split(',').map((topic: string, idx: number) => (
                <div key={idx} className={`text-xs px-4 py-3 ${idx % 2 === 0 ? 'bg-white text-gray-900' : 'bg-gray-50 text-gray-700'}`}>
                  • {topic.trim()}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key Questions */}
        {meeting.keyQuestions && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-6 py-4">
            <h2 className="text-xs font-semibold text-blue-900 mb-4 uppercase tracking-wide">Key Questions</h2>
            <div className="rounded-lg overflow-hidden border border-blue-200">
              {meeting.keyQuestions.split(',').map((question: string, idx: number) => (
                <div key={idx} className={`text-xs px-4 py-3 ${idx % 2 === 0 ? 'bg-white text-gray-900' : 'bg-gray-50 text-gray-700'}`}>
                  • {question.trim()}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Items */}
        {meeting.actionItems && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-6 py-4">
            <h2 className="text-xs font-semibold text-blue-900 mb-4 uppercase tracking-wide">Action Items</h2>
            <div className="rounded-lg overflow-hidden border border-blue-200">
              {meeting.actionItems.split(/[.,]\s*(?=[A-Z])/).filter((line: string) => line.trim()).map((line: string, idx: number) => {
                // Try to extract assignee name (pattern: "Name will..." or "Name to...")
                const assigneeMatch = line.trim().match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(will|to|should|needs to|is going to)\s+/i)
                if (assigneeMatch) {
                  const assignee = assigneeMatch[1]
                  const task = line.trim().substring(assignee.length).trim()
                  return (
                    <div key={idx} className={`text-xs px-4 py-3 ${idx % 2 === 0 ? 'bg-white text-gray-900' : 'bg-gray-50 text-gray-700'}`}>
                      • <span className="font-semibold">{assignee}</span> {task}
                    </div>
                  )
                }
                return (
                  <div key={idx} className={`text-xs px-4 py-3 ${idx % 2 === 0 ? 'bg-white text-gray-900' : 'bg-gray-50 text-gray-700'}`}>
                    • {line.trim()}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Chapter Summaries */}
        {meeting.chapterSummaries && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-6 py-4">
            <h2 className="text-xs font-semibold text-blue-900 mb-4 uppercase tracking-wide">Chapter Summaries</h2>
            <div className="rounded-lg overflow-hidden border border-blue-200">
              {meeting.chapterSummaries.split(/[.,]\s*(?=[A-Z])/).filter((line: string) => line.trim()).map((line: string, idx: number) => (
                <div key={idx} className={`text-xs px-4 py-3 ${idx % 2 === 0 ? 'bg-white text-gray-900' : 'bg-gray-50 text-gray-700'}`}>
                  • {line.trim()}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transcript - prefer transcriptSpeakers (actual conversation) over speakerBlocks (which is often a duplicate of chapterSummaries) */}
        {(meeting.transcriptSpeakers || meeting.speakerBlocks) && (() => {
          // Use transcriptSpeakers first as it contains the actual conversation
          // speakerBlocks often contains the same summary as chapterSummaries
          const rawTranscript = meeting.transcriptSpeakers || meeting.speakerBlocks || ''

          // Split into sentences/turns
          const conversationTurns = rawTranscript
            .split(/([.,!?]\s*)(?=[A-Z])/)
            .reduce((acc: string[], part: string, i: number, arr: string[]) => {
              if (i % 2 === 0) {
                const combined = (part + (arr[i + 1] || '')).trim()
                if (combined) acc.push(combined)
              }
              return acc
            }, [])

          return (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-6 py-4">
              <h2 className="text-xs font-semibold text-blue-900 mb-4 uppercase tracking-wide">
                Meeting Points
              </h2>
              <div className="rounded-lg overflow-hidden border border-blue-200">
                {conversationTurns.map((turn: string, idx: number) => (
                  <div
                    key={idx}
                    className={`text-xs leading-relaxed px-4 py-3 ${idx % 2 === 0 ? 'bg-white text-gray-900 font-medium' : 'bg-gray-50 text-gray-700'}`}
                  >
                    {turn}
                  </div>
                ))}
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
