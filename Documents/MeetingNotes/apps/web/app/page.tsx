import Link from 'next/link'

export default function Home(): JSX.Element {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="max-w-5xl w-full text-center">
        <h1 className="text-5xl font-bold mb-6">Meeting Intelligence System</h1>
        <p className="text-xl text-muted-foreground mb-12">
          Transform meeting transcripts into actionable intelligence with daily briefings, task
          tracking, and relationship management
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="p-6 border rounded-lg hover:shadow-lg transition-shadow">
            <h2 className="text-2xl font-semibold mb-3">📅 Today's Dashboard</h2>
            <p className="text-muted-foreground mb-4">
              View your meetings, tasks, and follow-ups for today
            </p>
            <Link
              href="/dashboard"
              className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Open Dashboard
            </Link>
          </div>

          <div className="p-6 border rounded-lg hover:shadow-lg transition-shadow">
            <h2 className="text-2xl font-semibold mb-3">📊 Meetings</h2>
            <p className="text-muted-foreground mb-4">Browse all your meeting history and context</p>
            <Link
              href="/meetings"
              className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              View Meetings
            </Link>
          </div>

          <div className="p-6 border rounded-lg hover:shadow-lg transition-shadow">
            <h2 className="text-2xl font-semibold mb-3">✅ Action Items</h2>
            <p className="text-muted-foreground mb-4">
              Track and manage commitments across your organization
            </p>
            <Link
              href="/action-items"
              className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Manage Tasks
            </Link>
          </div>
        </div>

        <div className="p-6 bg-muted rounded-lg">
          <h3 className="text-lg font-semibold mb-2">🚀 Quick Start</h3>
          <ol className="text-left max-w-2xl mx-auto space-y-2 text-sm">
            <li>1. Configure your environment variables in <code>.env</code></li>
            <li>2. Connect your Airtable base with meeting transcripts</li>
            <li>3. Set up Microsoft Graph for calendar and email integration</li>
            <li>4. Start receiving daily intelligence briefings at 6 AM</li>
          </ol>
        </div>

        <div className="mt-8 text-sm text-muted-foreground">
          <p>Built with Next.js, Node.js, Airtable, and AI</p>
          <p className="mt-2">
            View{' '}
            <Link href="/health" className="underline hover:text-foreground">
              system health
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
