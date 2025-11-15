'use client'

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export default function CompaniesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['meetings'],
    queryFn: () => apiClient.getMeetings(),
  })

  const meetings = data?.data || []

  // Extract unique companies from meetings
  const companiesMap = new Map()
  meetings.forEach((meeting: any) => {
    const company = meeting.company || 'Unknown Company'
    if (!companiesMap.has(company)) {
      companiesMap.set(company, {
        name: company,
        meetingCount: 0,
        lastMeeting: null,
      })
    }
    const companyData = companiesMap.get(company)
    companyData.meetingCount++
    if (!companyData.lastMeeting || (meeting.startTime && new Date(meeting.startTime) > new Date(companyData.lastMeeting))) {
      companyData.lastMeeting = meeting.startTime
    }
  })

  const companies = Array.from(companiesMap.values()).sort((a, b) => b.meetingCount - a.meetingCount)

  return (
    <div className="h-full bg-gray-50">
      <div className="h-12 bg-white border-b border-gray-200 flex items-center px-6 justify-between">
        <h1 className="text-sm font-semibold text-gray-900">Companies</h1>
        <div className="text-xs text-gray-600">{companies.length} companies</div>
      </div>

      <div className="p-6">
        {isLoading ? (
          <div className="text-xs text-gray-600">Loading...</div>
        ) : companies.length === 0 ? (
          <div className="bg-white border border-gray-200 px-6 py-12 text-center">
            <div className="text-xs text-gray-600">No companies found</div>
          </div>
        ) : (
          <div className="bg-white border border-gray-200">
            {/* Table header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-2 border-b border-gray-200 bg-gray-50">
              <div className="col-span-6 text-xs font-semibold text-gray-700">Company</div>
              <div className="col-span-3 text-xs font-semibold text-gray-700">Meetings</div>
              <div className="col-span-3 text-xs font-semibold text-gray-700">Last Meeting</div>
            </div>

            {/* Table rows */}
            {companies.map((company, index) => (
              <div
                key={index}
                className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
              >
                <div className="col-span-6">
                  <div className="text-xs font-medium text-gray-900">{company.name}</div>
                </div>
                <div className="col-span-3">
                  <div className="text-xs text-gray-600">{company.meetingCount}</div>
                </div>
                <div className="col-span-3">
                  <div className="text-xs text-gray-600">
                    {company.lastMeeting
                      ? new Date(company.lastMeeting).toLocaleDateString()
                      : '-'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
