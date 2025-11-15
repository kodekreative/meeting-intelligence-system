'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Meetings', href: '/meetings' },
  { name: 'Action Items', href: '/action-items' },
  { name: 'Companies', href: '/companies' },
  { name: 'Contacts', href: '/contacts' },
  { name: 'Intelligence', href: '/intelligence' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-screen w-52 flex-col border-r border-gray-200 bg-white">
      {/* Header */}
      <div className="flex h-12 items-center px-4 border-b border-gray-200">
        <Link href="/" className="text-sm font-semibold text-gray-900">
          Meeting Intelligence
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'block px-3 py-1.5 text-xs transition-colors',
                isActive
                  ? 'bg-gray-100 text-gray-900 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              )}
            >
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-gray-200 px-4 py-3">
        <p className="text-xs font-medium text-gray-900">Peter Schmitt</p>
        <p className="text-xs text-gray-500">peter@example.com</p>
      </div>
    </div>
  )
}
