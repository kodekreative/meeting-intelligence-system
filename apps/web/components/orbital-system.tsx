'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Meeting {
  id: string
  title: string
  startTime: string
  frequency?: number
}

interface OrbitalElementProps {
  meeting: Meeting
  index: number
  total: number
  onClick: (title: string) => void
}

function OrbitalElement({ meeting, index, total, onClick }: OrbitalElementProps) {
  // Distribute elements across 3 rings
  const ringIndex = index % 3
  const rings = [
    { radius: 180, speed: 120 },
    { radius: 280, speed: 180 },
    { radius: 380, speed: 240 },
  ]

  const ring = rings[ringIndex]
  const elementsInRing = Math.ceil(total / 3)
  const positionInRing = Math.floor(index / 3)

  // Calculate starting angle offset for this element
  const angleOffset = (positionInRing / elementsInRing) * 360

  // Add some randomness to the speed
  const speedVariation = 0.7 + (Math.sin(index * 1.5) * 0.3)
  const animationDuration = ring.speed * speedVariation

  // Calculate font size based on frequency (default to 1 if not set)
  const frequency = meeting.frequency || 1
  // Font sizes: 1 occurrence = 10px, 5+ occurrences = 16px
  const baseFontSize = Math.min(10 + (frequency - 1) * 1.5, 16)
  const fontSize = `${baseFontSize}px`

  return (
    <div
      className="orbital-element absolute"
      style={{
        animation: `orbit ${animationDuration}s linear infinite`,
        animationDelay: `-${(angleOffset / 360) * animationDuration}s`,
        ['--radius' as string]: `${ring.radius}px`,
        ['--duration' as string]: `${animationDuration}s`,
        zIndex: 100 + index, // Ensure all elements are clickable
      }}
    >
      <button
        onClick={() => onClick(meeting.title)}
        className="orbital-text text-white/70 hover:text-white transition-all duration-300 cursor-pointer whitespace-nowrap hover:scale-110 font-light relative"
        style={{ fontSize, zIndex: 1 }}
      >
        {meeting.title}
      </button>
    </div>
  )
}

export function OrbitalSystem() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function fetchMeetings() {
      try {
        const response = await fetch('http://localhost:3001/api/v1/meetings?limit=100')
        const data = await response.json()
        if (data.success) {
          // Count frequency of each title
          const titleCounts = new Map<string, number>()
          const titleToMeeting = new Map<string, any>()

          data.data.forEach((meeting: any) => {
            if (meeting.title) {
              titleCounts.set(meeting.title, (titleCounts.get(meeting.title) || 0) + 1)
              if (!titleToMeeting.has(meeting.title)) {
                titleToMeeting.set(meeting.title, meeting)
              }
            }
          })

          // Create unique meetings with frequency counts
          const uniqueMeetings = Array.from(titleToMeeting.entries())
            .map(([title, meeting]) => ({
              ...meeting,
              frequency: titleCounts.get(title) || 1
            }))
            .sort((a, b) => (b.frequency || 0) - (a.frequency || 0)) // Sort by frequency descending
            .slice(0, 20) // Take top 20

          setMeetings(uniqueMeetings)
        }
      } catch (error) {
        console.error('Failed to fetch meetings:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMeetings()
  }, [])

  const handleMeetingClick = (title: string) => {
    // Navigate to companies page (Meeting Titles) with the title as a filter
    router.push(`/companies?title=${encodeURIComponent(title)}`)
  }

  const handleEnterDashboard = () => {
    router.push('/dashboard')
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Orbital elements */}
      {!loading && meetings.map((meeting, index) => (
        <OrbitalElement
          key={meeting.id}
          meeting={meeting}
          index={index}
          total={meetings.length}
          onClick={handleMeetingClick}
        />
      ))}

      {/* Center content */}
      <div className="relative z-10 text-center">
        <div className="mb-8">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Meeting Intelligence
          </h1>
          <p className="text-xl text-gray-300 mb-2">
            Transform meeting transcripts into actionable intelligence
          </p>
          <p className="text-sm text-gray-400">
            {loading ? 'Loading meetings...' : `${meetings.length} recent meetings orbiting`}
          </p>
        </div>

        <button
          onClick={handleEnterDashboard}
          className="group relative px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full text-white font-semibold hover:shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105"
        >
          <span className="relative z-10">Enter Dashboard</span>
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </button>

        {/* Subtle rings visualization */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] h-[360px] border border-white/20 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[560px] border border-white/15 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[760px] h-[760px] border border-white/10 rounded-full" />
        </div>
      </div>

      <style jsx>{`
        @keyframes orbit {
          0% {
            transform: rotate(0deg) translateX(var(--radius)) rotate(0deg);
          }
          100% {
            transform: rotate(360deg) translateX(var(--radius)) rotate(-360deg);
          }
        }

        .orbital-element {
          top: 50%;
          left: 50%;
        }

        .orbital-text {
          display: inline-block;
        }
      `}</style>
    </div>
  )
}
