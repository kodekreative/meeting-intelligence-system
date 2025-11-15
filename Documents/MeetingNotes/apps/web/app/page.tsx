import Link from 'next/link'

export default function Home(): JSX.Element {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="h-12 bg-white border-b border-gray-200 flex items-center px-6">
        <h1 className="text-sm font-semibold text-gray-900">Meeting Intelligence System</h1>
      </div>

      {/* Main content */}
      <div className="p-6">
        <div className="max-w-6xl">
          {/* Quick access links */}
          <div className="mb-6">
            <h2 className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">Quick Access</h2>
            <div className="grid grid-cols-3 gap-3">
              <Link
                href="/dashboard"
                className="bg-white border border-gray-200 px-4 py-3 text-xs hover:border-gray-300 hover:shadow-sm transition-all"
              >
                <div className="font-medium text-gray-900 mb-1">Dashboard</div>
                <div className="text-gray-600">View today's meetings and tasks</div>
              </Link>

              <Link
                href="/meetings"
                className="bg-white border border-gray-200 px-4 py-3 text-xs hover:border-gray-300 hover:shadow-sm transition-all"
              >
                <div className="font-medium text-gray-900 mb-1">Meetings</div>
                <div className="text-gray-600">Browse meeting history and insights</div>
              </Link>

              <Link
                href="/action-items"
                className="bg-white border border-gray-200 px-4 py-3 text-xs hover:border-gray-300 hover:shadow-sm transition-all"
              >
                <div className="font-medium text-gray-900 mb-1">Action Items</div>
                <div className="text-gray-600">Track tasks and commitments</div>
              </Link>
            </div>
          </div>

          {/* Additional sections */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h2 className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">Recent Activity</h2>
              <div className="bg-white border border-gray-200">
                <div className="px-4 py-3 border-b border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <div className="text-xs font-medium text-gray-900">Team Standup - Nov 15</div>
                  <div className="text-xs text-gray-600 mt-1">5 participants · 30 min</div>
                </div>
                <div className="px-4 py-3 border-b border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <div className="text-xs font-medium text-gray-900">Client Review - Nov 14</div>
                  <div className="text-xs text-gray-600 mt-1">3 participants · 45 min</div>
                </div>
                <div className="px-4 py-3 hover:bg-gray-50 cursor-pointer">
                  <div className="text-xs font-medium text-gray-900">Product Planning - Nov 13</div>
                  <div className="text-xs text-gray-600 mt-1">8 participants · 60 min</div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">Pending Tasks</h2>
              <div className="bg-white border border-gray-200">
                <div className="px-4 py-3 border-b border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <div className="text-xs font-medium text-gray-900">Update Q4 roadmap</div>
                  <div className="text-xs text-gray-600 mt-1">Due: Nov 20</div>
                </div>
                <div className="px-4 py-3 border-b border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <div className="text-xs font-medium text-gray-900">Review design mockups</div>
                  <div className="text-xs text-gray-600 mt-1">Due: Nov 18</div>
                </div>
                <div className="px-4 py-3 hover:bg-gray-50 cursor-pointer">
                  <div className="text-xs font-medium text-gray-900">Prepare client presentation</div>
                  <div className="text-xs text-gray-600 mt-1">Due: Nov 17</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
