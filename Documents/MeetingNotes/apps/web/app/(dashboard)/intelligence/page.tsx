'use client'

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export default function IntelligencePage() {
  const { data } = useQuery({
    queryKey: ['meetings'],
    queryFn: () => apiClient.getMeetings(),
  })

  const meetings = data?.data || []
  const meetingsWithTopics = meetings.filter((m: any) => m.topics).slice(0, 10)

  return (
    <div className="h-full bg-gray-50">
      <div className="h-12 bg-white border-b border-gray-200 flex items-center px-6">
        <h1 className="text-sm font-semibold text-gray-900">Intelligence</h1>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {/* Key Topics Section */}
          <div className="bg-white border border-gray-200 px-4 py-3">
            <div className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">
              Recent Discussion Topics
            </div>
            {meetingsWithTopics.length === 0 ? (
              <div className="text-xs text-gray-600">No topics available yet</div>
            ) : (
              <div className="space-y-2">
                {meetingsWithTopics.map((meeting: any, index: number) => (
                  <div key={index} className="pb-2 border-b border-gray-100 last:border-0">
                    <div className="text-xs font-medium text-gray-900 mb-1">{meeting.title}</div>
                    <div className="text-xs text-gray-600">{meeting.topics}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Features Notice */}
          <div className="bg-blue-50 border border-blue-200 px-4 py-3">
            <div className="text-xs font-medium text-blue-900 mb-2">AI-Powered Intelligence (Coming Soon)</div>
            <div className="text-xs text-blue-700 mb-3">
              Advanced AI analysis will automatically extract:
            </div>
            <div className="space-y-1 text-xs text-blue-700">
              <div>• Business issues and risks mentioned in meetings</div>
              <div>• Personal intelligence for relationship building</div>
              <div>• Key questions and decision points</div>
              <div>• Trends and patterns across conversations</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
