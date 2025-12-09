'use client'

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

interface Meeting {
  id: string
  title?: string
  name?: string
  startTime?: string
  summary?: string
  topics?: string[] | string
  keyQuestions?: string[] | string
  chapterSummaries?: string
  participants?: string
  reportUrl?: string
}

function IntelligencePage() {
  const searchParams = useSearchParams()
  const meetingIdParam = searchParams.get('meeting')

  const [expandedMeetings, setExpandedMeetings] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'with-summary' | 'with-topics'>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['meetings'],
    queryFn: () => apiClient.getMeetings(),
  })

  // Auto-expand meeting from query parameter
  useEffect(() => {
    if (meetingIdParam && !isLoading) {
      setExpandedMeetings(new Set([meetingIdParam]))
      // Scroll to the meeting after a brief delay to ensure it's rendered
      setTimeout(() => {
        const element = document.getElementById(`meeting-${meetingIdParam}`)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
    }
  }, [meetingIdParam, isLoading])

  const allMeetings = (data?.data || []) as Meeting[]

  // Apply filters
  const filteredMeetings = allMeetings
    .filter((m: Meeting) => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase()
        return (
          (m.title?.toLowerCase().includes(search)) ||
          (m.name?.toLowerCase().includes(search)) ||
          (m.summary?.toLowerCase().includes(search)) ||
          (typeof m.topics === 'string' && m.topics.toLowerCase().includes(search))
        )
      }
      return true
    })
    .filter((m: Meeting) => {
      // Type filter
      if (selectedFilter === 'with-summary') return m.summary
      if (selectedFilter === 'with-topics') return m.topics
      return true
    })
    .sort((a, b) => {
      // Sort by date descending
      const dateA = a.startTime ? new Date(a.startTime).getTime() : 0
      const dateB = b.startTime ? new Date(b.startTime).getTime() : 0
      return dateB - dateA
    })

  const toggleMeeting = (id: string) => {
    const newExpanded = new Set(expandedMeetings)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedMeetings(newExpanded)
  }

  const formatTopics = (topics: string[] | string | undefined): string[] => {
    if (!topics) return []
    if (Array.isArray(topics)) return topics
    if (typeof topics === 'string') {
      // Try to parse as JSON array first
      try {
        const parsed = JSON.parse(topics)
        if (Array.isArray(parsed)) return parsed
      } catch (e) {
        // If not JSON, split by common delimiters
        return topics.split(/[,;]/).map(t => t.trim()).filter(Boolean)
      }
    }
    return []
  }

  const formatQuestions = (questions: string[] | string | undefined): string[] => {
    if (!questions) return []
    if (Array.isArray(questions)) return questions
    if (typeof questions === 'string') {
      try {
        const parsed = JSON.parse(questions)
        if (Array.isArray(parsed)) return parsed
      } catch (e) {
        return questions.split(/\n+/).map(q => q.trim()).filter(Boolean)
      }
    }
    return []
  }

  if (isLoading) {
    return (
      <div className="h-full bg-gray-50">
        <div className="h-12 bg-white border-b border-gray-200 flex items-center px-6">
          <h1 className="text-sm font-semibold text-gray-900">Meeting Intelligence</h1>
        </div>
        <div className="p-6">
          <div className="text-xs text-gray-600">Loading meeting analysis...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="h-12 flex items-center px-6 justify-between">
          <h1 className="text-sm font-semibold text-gray-900">Meeting Intelligence</h1>
          <div className="text-xs text-gray-600">
            {filteredMeetings.length} of {allMeetings.length} {allMeetings.length === 1 ? 'meeting' : 'meetings'}
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <div className="flex gap-2 items-center flex-wrap">
            <input
              type="text"
              placeholder="Search meetings, topics, or summaries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-[11px] border border-gray-300 rounded px-2 py-1.5 w-64"
            />
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value as any)}
              className="text-[11px] border border-gray-300 rounded px-2 py-1.5"
            >
              <option value="all">All Meetings</option>
              <option value="with-summary">With Summary</option>
              <option value="with-topics">With Topics</option>
            </select>
            {(searchTerm || selectedFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setSelectedFilter('all')
                }}
                className="text-[11px] text-blue-600 hover:text-blue-800 ml-2"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {filteredMeetings.length === 0 ? (
          <div className="bg-white border border-gray-200 px-6 py-12 text-center">
            <div className="text-xs text-gray-600">No meetings found</div>
            <div className="text-xs text-gray-500 mt-1">Try adjusting your filters</div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMeetings.map((meeting: Meeting) => {
              const isExpanded = expandedMeetings.has(meeting.id)
              const topics = formatTopics(meeting.topics)
              const questions = formatQuestions(meeting.keyQuestions)
              const meetingTitle = meeting.title || meeting.name || 'Untitled Meeting'
              const hasContent = meeting.summary || topics.length > 0 || questions.length > 0 || meeting.chapterSummaries

              return (
                <div
                  key={meeting.id}
                  id={`meeting-${meeting.id}`}
                  className="bg-white border border-gray-200"
                >
                  <div
                    onClick={() => toggleMeeting(meeting.id)}
                    className="px-4 py-3 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <svg
                          className={`w-3 h-3 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                        <h3 className="text-xs font-semibold text-gray-900">{meetingTitle}</h3>
                      </div>
                      <div className="flex items-center gap-4 mt-1 ml-5">
                        {meeting.startTime && (
                          <div className="text-[10px] text-gray-500">
                            {new Date(meeting.startTime).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit'
                            })}
                          </div>
                        )}
                        {meeting.participants && (
                          <div className="text-[10px] text-gray-500">
                            {typeof meeting.participants === 'string'
                              ? meeting.participants.split(',').length
                              : Array.isArray(meeting.participants)
                                ? meeting.participants.length
                                : 1} participants
                          </div>
                        )}
                        {topics.length > 0 && (
                          <div className="text-[10px] text-blue-600">
                            {topics.length} {topics.length === 1 ? 'topic' : 'topics'}
                          </div>
                        )}
                      </div>
                    </div>
                    {meeting.reportUrl && (
                      <a
                        href={meeting.reportUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[10px] text-blue-600 hover:text-blue-800 ml-4"
                      >
                        View Report →
                      </a>
                    )}
                  </div>

                  {isExpanded && hasContent && (
                    <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 space-y-4">
                      {topics.length > 0 && (
                        <div>
                          <div className="text-[10px] font-semibold text-gray-700 uppercase tracking-wide mb-2">
                            Topics Discussed
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {topics.map((topic, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] px-2 py-1 bg-blue-100 text-blue-700 rounded"
                              >
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {meeting.summary && (
                        <div>
                          <div className="text-[10px] font-semibold text-gray-700 uppercase tracking-wide mb-2">
                            Meeting Summary
                          </div>
                          <ul className="space-y-1.5">
                            {meeting.summary.split(/[.!?]+/).filter((s: string) => s.trim()).map((sentence: string, idx: number) => (
                              <li key={idx} className="text-[11px] text-gray-700 flex gap-2">
                                <span className="text-blue-600">•</span>
                                <span>{sentence.trim()}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {questions.length > 0 && (
                        <div>
                          <div className="text-[10px] font-semibold text-gray-700 uppercase tracking-wide mb-2">
                            Key Questions
                          </div>
                          <ul className="space-y-1.5">
                            {questions.map((question, idx) => (
                              <li key={idx} className="text-[11px] text-gray-700 flex gap-2">
                                <span className="text-blue-600">•</span>
                                <span>{question}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {meeting.chapterSummaries && (
                        <div>
                          <div className="text-[10px] font-semibold text-gray-700 uppercase tracking-wide mb-2">
                            Chapter Summaries
                          </div>
                          <ul className="space-y-1.5">
                            {meeting.chapterSummaries.split(/[.!?]+/).filter((s: string) => s.trim()).map((sentence: string, idx: number) => (
                              <li key={idx} className="text-[11px] text-gray-700 flex gap-2">
                                <span className="text-blue-600">•</span>
                                <span>{sentence.trim()}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <IntelligencePage />
    </Suspense>
  )
}
