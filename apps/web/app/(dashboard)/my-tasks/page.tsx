'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * My Tasks page - Redirects to unified Tasks page
 *
 * Tasks are now managed through the unified Tasks table.
 * This page redirects to the Tasks page.
 */
export default function MyTasksPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/tasks')
  }, [router])

  return (
    <div className="h-full bg-gray-50 flex items-center justify-center">
      <div className="text-xs text-gray-600">Redirecting to Tasks...</div>
    </div>
  )
}
