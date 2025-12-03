'use client'

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export default function ContactsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['meetings'],
    queryFn: () => apiClient.getMeetings(),
  })

  const meetings = data?.data || []

  // Extract unique contacts from meetings
  const contactsMap = new Map()
  meetings.forEach((meeting: any) => {
    if (meeting.participants && Array.isArray(meeting.participants)) {
      meeting.participants.forEach((participant: string) => {
        if (!contactsMap.has(participant)) {
          contactsMap.set(participant, {
            name: participant,
            meetingCount: 0,
            companies: new Set(),
            lastMeeting: null,
          })
        }
        const contact = contactsMap.get(participant)
        contact.meetingCount++
        if (meeting.company) {
          contact.companies.add(meeting.company)
        }
        if (!contact.lastMeeting || (meeting.startTime && new Date(meeting.startTime) > new Date(contact.lastMeeting))) {
          contact.lastMeeting = meeting.startTime
        }
      })
    }
  })

  const contacts = Array.from(contactsMap.values())
    .map(contact => ({
      ...contact,
      companies: Array.from(contact.companies).join(', ')
    }))
    .sort((a, b) => b.meetingCount - a.meetingCount)

  return (
    <div className="h-full bg-gray-50">
      <div className="h-12 bg-white border-b border-gray-200 flex items-center px-6 justify-between">
        <h1 className="text-sm font-semibold text-gray-900">Contacts</h1>
        <div className="text-xs text-gray-600">{contacts.length} contacts</div>
      </div>

      <div className="p-6">
        {isLoading ? (
          <div className="text-xs text-gray-600">Loading...</div>
        ) : contacts.length === 0 ? (
          <div className="bg-white border border-gray-200 px-6 py-12 text-center">
            <div className="text-xs text-gray-600">No contacts found</div>
          </div>
        ) : (
          <div className="bg-white border border-gray-200">
            {/* Table header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-2 border-b border-gray-200 bg-gray-50">
              <div className="col-span-4 text-xs font-semibold text-gray-700">Name</div>
              <div className="col-span-3 text-xs font-semibold text-gray-700">Company</div>
              <div className="col-span-2 text-xs font-semibold text-gray-700">Meetings</div>
              <div className="col-span-3 text-xs font-semibold text-gray-700">Last Contact</div>
            </div>

            {/* Table rows */}
            {contacts.map((contact, index) => (
              <div
                key={index}
                className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
              >
                <div className="col-span-4">
                  <div className="text-xs font-medium text-gray-900">{contact.name}</div>
                </div>
                <div className="col-span-3">
                  <div className="text-xs text-gray-600 truncate">{contact.companies || '-'}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-gray-600">{contact.meetingCount}</div>
                </div>
                <div className="col-span-3">
                  <div className="text-xs text-gray-600">
                    {contact.lastMeeting
                      ? new Date(contact.lastMeeting).toLocaleDateString()
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
