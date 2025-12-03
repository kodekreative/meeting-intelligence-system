'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Meetings', href: '/meetings' },
  { name: 'Tasks', href: '/tasks' },
  { name: 'Themes', href: '/themes' },
  { name: 'Meeting Titles', href: '/companies' },
  { name: 'Contacts', href: '/contacts' },
  { name: 'Intelligence', href: '/intelligence' },
  { name: 'Email Settings', href: '/settings/email' },
  { name: 'Calendar (Simple)', href: '/settings/calendar-simple' },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <div className="flex h-screen w-52 flex-col border-r border-white/10 bg-gradient-to-b from-gray-900 to-black backdrop-blur-md" style={{ position: 'relative', zIndex: 10 }}>
      {/* Header */}
      <div className="flex h-12 items-center px-4 border-b border-white/10">
        <button
          onClick={() => router.push('/')}
          className="text-sm font-semibold text-white cursor-pointer hover:text-gray-300 transition-colors"
        >
          Meeting Intelligence
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
          return (
            <button
              key={item.name}
              onClick={() => router.push(item.href)}
              className={cn(
                'w-full text-left block px-3 py-1.5 text-xs transition-colors cursor-pointer rounded',
                isActive
                  ? 'bg-white/10 text-white font-medium'
                  : 'text-gray-400 hover:bg-white/5 hover:text-gray-300'
              )}
            >
              {item.name}
            </button>
          )
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-white/10 px-4 py-3">
        <p className="text-xs font-medium text-white">Peter Schmitt</p>
        <p className="text-xs text-gray-400">peter@example.com</p>
      </div>
    </div>
  )
}
