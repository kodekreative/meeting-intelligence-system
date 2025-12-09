'use client'

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface Meeting {
  id: string
  title?: string
  name?: string
  startTime?: string
  summary?: string
  topics?: string[] | string
  participants?: string | string[]
}

interface TitleGroup {
  title: string
  meetingCount: number
  lastMeeting: string | null
  firstMeeting: string | null
  meetings: Meeting[]
  allSummaries: string[]
  allTopics: string[]
}

function CompaniesPage() {
  const searchParams = useSearchParams()
  const titleFromUrl = searchParams.get('title')
  const [expandedTitles, setExpandedTitles] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const titleRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const { data, isLoading } = useQuery({
    queryKey: ['meetings'],
    queryFn: () => apiClient.getMeetings(),
  })

  const meetings = (data?.data || []) as Meeting[]

  // Auto-expand and scroll to title from URL parameter
  useEffect(() => {
    if (titleFromUrl && !isLoading) {
      setExpandedTitles(prev => new Set(prev).add(titleFromUrl))
      // Scroll to the section after a short delay to ensure rendering
      setTimeout(() => {
        const element = titleRefs.current.get(titleFromUrl)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 100)
    }
  }, [titleFromUrl, isLoading])

  // Group meetings by Title
  const titlesMap = new Map<string, TitleGroup>()
  meetings.forEach((meeting) => {
    const title = meeting.title || meeting.name || 'Untitled'
    if (!titlesMap.has(title)) {
      titlesMap.set(title, {
        title,
        meetingCount: 0,
        lastMeeting: null,
        firstMeeting: null,
        meetings: [],
        allSummaries: [],
        allTopics: [],
      })
    }
    const titleData = titlesMap.get(title)!
    titleData.meetingCount++
    titleData.meetings.push(meeting)

    // Track summaries
    if (meeting.summary) {
      titleData.allSummaries.push(meeting.summary)
    }

    // Track topics
    if (meeting.topics) {
      if (Array.isArray(meeting.topics)) {
        titleData.allTopics.push(...meeting.topics)
      } else if (typeof meeting.topics === 'string') {
        try {
          const parsed = JSON.parse(meeting.topics)
          if (Array.isArray(parsed)) {
            titleData.allTopics.push(...parsed)
          } else {
            titleData.allTopics.push(...meeting.topics.split(/[,;]/).map(t => t.trim()).filter(Boolean))
          }
        } catch {
          titleData.allTopics.push(...meeting.topics.split(/[,;]/).map(t => t.trim()).filter(Boolean))
        }
      }
    }

    // Track dates
    if (meeting.startTime) {
      const meetingDate = new Date(meeting.startTime)
      if (!titleData.lastMeeting || meetingDate > new Date(titleData.lastMeeting)) {
        titleData.lastMeeting = meeting.startTime
      }
      if (!titleData.firstMeeting || meetingDate < new Date(titleData.firstMeeting)) {
        titleData.firstMeeting = meeting.startTime
      }
    }
  })

  const titleGroups = Array.from(titlesMap.values())
    .filter(group => {
      if (!searchTerm) return true
      const search = searchTerm.toLowerCase()
      return (
        group.title.toLowerCase().includes(search) ||
        group.allSummaries.some(s => s.toLowerCase().includes(search)) ||
        group.allTopics.some(t => t.toLowerCase().includes(search))
      )
    })
    .sort((a, b) => b.meetingCount - a.meetingCount)

  const toggleTitle = (title: string) => {
    const newExpanded = new Set(expandedTitles)
    if (newExpanded.has(title)) {
      newExpanded.delete(title)
    } else {
      newExpanded.add(title)
    }
    setExpandedTitles(newExpanded)
  }

  if (isLoading) {
    return (
      <div className="h-full bg-gray-50">
        <div className="h-12 bg-white border-b border-gray-200 flex items-center px-6">
          <h1 className="text-sm font-semibold text-gray-900">Meeting Titles</h1>
        </div>
        <div className="p-6">
          <div className="text-xs text-gray-600">Loading meeting titles...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="h-12 flex items-center px-6 justify-between">
          <h1 className="text-sm font-semibold text-gray-900">Meeting Titles</h1>
          <div className="text-xs text-gray-600">
            {titleGroups.length} {titleGroups.length === 1 ? 'title' : 'titles'}
          </div>
        </div>

        {/* Search */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <input
            type="text"
            placeholder="Search titles, summaries, or topics..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="text-[11px] border border-gray-300 rounded px-2 py-1.5 w-64"
          />
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {titleGroups.length === 0 ? (
          <div className="bg-white border border-gray-200 px-6 py-12 text-center">
            <div className="text-xs text-gray-600">No meeting titles found</div>
          </div>
        ) : (
          <div className="space-y-3">
            {titleGroups.map((group) => {
              const isExpanded = expandedTitles.has(group.title)
              const uniqueTopics = Array.from(new Set(group.allTopics)).slice(0, 10)

              return (
                <div
                  key={group.title}
                  className="bg-white border border-gray-200"
                  ref={(el) => {
                    if (el) {
                      titleRefs.current.set(group.title, el)
                    }
                  }}
                >
                  {/* Title Header */}
                  <div
                    onClick={() => toggleTitle(group.title)}
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
                        <h3 className="text-xs font-semibold text-gray-900">{group.title}</h3>
                      </div>
                      <div className="flex items-center gap-4 mt-1 ml-5">
                        <div className="text-[10px] text-gray-500">
                          {group.meetingCount} {group.meetingCount === 1 ? 'meeting' : 'meetings'}
                        </div>
                        {group.firstMeeting && group.lastMeeting && (
                          <div className="text-[10px] text-gray-500">
                            {new Date(group.firstMeeting).toLocaleDateString('en-US', {
                              month: 'short',
                              year: 'numeric'
                            })} - {new Date(group.lastMeeting).toLocaleDateString('en-US', {
                              month: 'short',
                              year: 'numeric'
                            })}
                          </div>
                        )}
                        {group.allSummaries.length > 0 && (
                          <div className="text-[10px] text-blue-600">
                            {group.allSummaries.length} {group.allSummaries.length === 1 ? 'summary' : 'summaries'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 space-y-4">
                      {/* Topics */}
                      {uniqueTopics.length > 0 && (
                        <div>
                          <div className="text-[10px] font-semibold text-gray-700 uppercase tracking-wide mb-2">
                            Topics Across All Meetings
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {uniqueTopics.map((topic, idx) => (
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

                      {/* Meeting Summaries by Date */}
                      {group.allSummaries.length > 0 && (
                        <div>
                          <div className="text-[10px] font-semibold text-gray-700 uppercase tracking-wide mb-3">
                            Meeting Notes ({group.meetingCount} {group.meetingCount === 1 ? 'Meeting' : 'Meetings'})
                          </div>
                          <div className="space-y-4">
                            {group.meetings
                              .filter(m => m.summary)
                              .sort((a, b) => {
                                const dateA = a.startTime ? new Date(a.startTime).getTime() : 0
                                const dateB = b.startTime ? new Date(b.startTime).getTime() : 0
                                return dateB - dateA
                              })
                              .map((meeting, idx) => {
                                // Split summary into sentences for bullet points
                                const sentences = meeting.summary?.split(/[.!]\s+/).filter(Boolean) || []
                                // First sentence is the summary, rest are bullets
                                const summary = sentences[0]
                                const bullets = sentences.slice(1)

                                return (
                                  <div key={idx} className="border-l-2 border-blue-500 pl-3">
                                    <div className="flex items-start justify-between gap-2 mb-1.5">
                                      {meeting.startTime && (
                                        <div className="text-[10px] font-semibold text-gray-900">
                                          {new Date(meeting.startTime).toLocaleDateString('en-US', {
                                            weekday: 'short',
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric'
                                          })}
                                        </div>
                                      )}
                                      <Link
                                        href={`/intelligence?meeting=${meeting.id}`}
                                        className="text-[10px] text-blue-600 hover:text-blue-800 hover:underline flex-shrink-0"
                                      >
                                        View Details →
                                      </Link>
                                    </div>
                                    {summary && (
                                      <div className="text-[11px] text-gray-700 leading-relaxed mb-2 font-medium">
                                        {summary.trim()}{summary.match(/[.!]$/) ? '' : '.'}
                                      </div>
                                    )}
                                    {bullets.length > 0 && (
                                      <ul className="space-y-1">
                                        {bullets.map((point, pointIdx) => (
                                          <li key={pointIdx} className="text-[11px] text-gray-700 flex gap-2">
                                            <span className="text-blue-600 flex-shrink-0">•</span>
                                            <span>{point.trim()}{point.match(/[.!]$/) ? '' : '.'}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                )
                              })}
                          </div>
                        </div>
                      )}

                      {/* No Summaries Message */}
                      {group.allSummaries.length === 0 && (
                        <div className="text-[11px] text-gray-500 italic">
                          No summaries available for these meetings
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
      <CompaniesPage />
    </Suspense>
  )
}
