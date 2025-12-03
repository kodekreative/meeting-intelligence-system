'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Action Items page - Redirects to Tasks with Action Item filter
 *
 * Action items are now stored in the unified Tasks table.
 * This page redirects to the Tasks page with a pre-applied filter.
 */
export default function ActionItemsPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to tasks page - the tasks page will show all tasks
    // Users can filter by source if needed
    router.replace('/tasks')
  }, [router])

  return (
    <div className="h-full bg-gray-50 flex items-center justify-center">
      <div className="text-xs text-gray-600">Redirecting to Tasks...</div>
    </div>
  )
}
