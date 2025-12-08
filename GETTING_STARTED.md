# Getting Started with Meeting Intelligence System

This guide will walk you through setting up and running the Meeting Intelligence System on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 20+** - [Download here](https://nodejs.org/)
- **pnpm** - Install with: `npm install -g pnpm`
- **Git** - [Download here](https://git-scm.com/)
- **Docker** (optional) - [Download here](https://www.docker.com/)

You'll also need accounts and API keys for:

- **Airtable** - With a base containing meeting transcripts
- **Microsoft Azure AD** - For calendar and email OAuth
- **OpenAI** - For AI processing (GPT-4 recommended)

## Step 1: Clone and Install

```bash
# Navigate to the project directory
cd /Users/peterschmitt/Documents/MeetingNotes

# Install all dependencies
pnpm install
```

This will install dependencies for all workspaces (frontend, backend, and shared packages).

## Step 2: Configure Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` and add your credentials:

```bash
# Airtable Configuration
AIRTABLE_API_KEY=keyXXXXXXXXXXXXXX
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX

# Microsoft Graph / Azure AD
MICROSOFT_CLIENT_ID=your-azure-client-id
MICROSOFT_CLIENT_SECRET=your-azure-client-secret
MICROSOFT_TENANT_ID=common
MICROSOFT_REDIRECT_URI=http://localhost:3001/auth/callback

# OpenAI
OPENAI_API_KEY=sk-XXXXXXXXXXXXXXXXXXXXXXXX
OPENAI_MODEL=gpt-4-turbo-preview

# JWT Secrets (generate random strings)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-token-key-change-this

# Redis (optional for local dev without Docker)
REDIS_HOST=localhost
REDIS_PORT=6379

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Where to Get API Keys

**Airtable:**
1. Go to https://airtable.com/account
2. Generate a personal access token
3. Find your base ID in the URL: `https://airtable.com/appXXXXXXXX/...`

**Microsoft Azure AD:**
1. Go to https://portal.azure.com/
2. Navigate to "Azure Active Directory" > "App registrations"
3. Click "New registration"
4. Set redirect URI to `http://localhost:3001/auth/callback`
5. Under "API permissions", add: `Calendars.Read`, `Mail.Send`, `offline_access`
6. Generate a client secret

**OpenAI:**
1. Go to https://platform.openai.com/api-keys
2. Create a new API key

## Step 3: Set Up Airtable

Your Airtable base should have these tables (create them if they don't exist):

### Required Tables:

1. **Meetings**
   - Meeting Date (Date)
   - Name (Single line text)
   - Participants (Single line text)
   - Company (Link to Companies)
   - Summary (Long text)
   - Transcript (Long text)
   - Speaker Blocks (Long text)
   - Topics (Multiple select or Long text)
   - Key Questions (Long text)
   - Report URL (URL)
   - Processing Status (Single select: pending, processing, complete, failed)
   - Processed At (Date)

2. **Companies**
   - Company Name (Single line text)
   - Type (Single select: Portfolio Company, Prospect, Service Provider, Other)
   - Relationship Status (Single select: Active, Pipeline, Past, Watching)
   - Industry (Single line text)
   - Owner (Link to Users)
   - First Meeting Date (Date)
   - Last Meeting Date (Date)
   - Meeting Count (Number)

3. **Contacts**
   - Full Name (Single line text)
   - Email (Email)
   - Company (Link to Companies)
   - Role (Single line text)
   - First Met (Date)
   - Last Contact (Date)
   - Meeting Count (Number)
   - Relationship Score (Number)

4. **Action Items**
   - Task Description (Long text)
   - Assignee (Link to Contacts)
   - Due Date (Date)
   - Status (Single select: Open, In Progress, Complete, Overdue)
   - Priority (Single select: Low, Medium, High, Critical)
   - Source Meeting (Link to Meetings)
   - Company (Link to Companies)
   - Completed At (Date)
   - Last Followed Up (Date)
   - Extraction Confidence (Number)
   - Notes (Long text)

5. **Personal Intelligence**
   - Contact (Link to Contacts)
   - Detail Description (Long text)
   - Category (Single select: Family, Health, Hobbies, Career, Travel, Other)
   - Date Captured (Date)
   - Source Meeting (Link to Meetings)
   - Reminder Date (Date)
   - Status (Single select: Pending, Used, Expired)
   - Used At (Date)
   - Extraction Confidence (Number)

6. **Business Issues**
   - Issue Description (Long text)
   - Company (Link to Companies)
   - Category (Single select: Financial, Operational, Strategic, Personnel, Compliance)
   - Severity (Single select: Low, Medium, High, Critical)
   - Status (Single select: Active, Monitoring, Resolved)
   - Date Identified (Date)
   - Source Meeting (Link to Meetings)
   - Related Action Items (Link to Action Items)
   - Resolved At (Date)
   - Extraction Confidence (Number)

7. **Users** (optional for now)
   - Full Name (Single line text)
   - Email (Email)
   - Role (Single select: Admin, Managing Partner, Partner, Analyst)
   - Is Active (Checkbox)
   - Timezone (Single line text)

## Step 4: Start the Development Environment

### Option A: Using Docker (Recommended)

```bash
cd docker
docker-compose up -d
```

This will start:
- Redis (cache and job queue)
- Backend API (Express)
- Frontend (Next.js)
- Worker (background jobs)

Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- API Health: http://localhost:3001/health

### Option B: Manual Setup

If you prefer not to use Docker:

**Terminal 1 - Start Redis:**
```bash
redis-server
```

**Terminal 2 - Start Backend API:**
```bash
pnpm dev --filter=api
```

**Terminal 3 - Start Frontend:**
```bash
pnpm dev --filter=web
```

## Step 5: Verify Installation

1. **Check Health Endpoint:**
```bash
curl http://localhost:3001/health
```

You should see:
```json
{
  "status": "ok",
  "services": {
    "redis": "ok",
    "airtable": "ok"
  }
}
```

2. **Test Airtable Connection:**
```bash
curl http://localhost:3001/api/v1/meetings
```

3. **Open Frontend:**
Navigate to http://localhost:3000 in your browser

## Step 6: Add Sample Data

To test the system, add a sample meeting to your Airtable Meetings table:

- **Meeting Date**: Today's date
- **Name**: "Weekly Team Standup"
- **Participants**: "John Doe, Jane Smith"
- **Summary**: "Discussed project progress and upcoming milestones"
- **Transcript**: "John: How's the new feature coming? Jane: Making great progress, should be ready by Friday."
- **Processing Status**: "complete"

Then refresh the frontend to see it appear!

## Step 7: Test API Endpoints

```bash
# Get all meetings
curl http://localhost:3001/api/v1/meetings

# Get today's meetings
curl http://localhost:3001/api/v1/meetings/filter/today

# Get all companies
curl http://localhost:3001/api/v1/companies

# Get action items
curl http://localhost:3001/api/v1/action-items

# Get today's dashboard
curl http://localhost:3001/api/v1/dashboard/today
```

## Common Issues & Troubleshooting

### "Airtable API key is required"
- Make sure `AIRTABLE_API_KEY` is set in `.env`
- Verify the API key is valid in Airtable account settings

### "Redis connection error"
- If using Docker: `docker-compose restart redis`
- If local: Make sure Redis is running (`redis-server`)
- Check Redis port is 6379 or update `REDIS_PORT` in `.env`

### "Module not found" errors
- Run `pnpm install` again
- Clear cache: `pnpm clean && pnpm install`

### Frontend can't connect to API
- Verify backend is running on port 3001
- Check `NEXT_PUBLIC_API_URL` in `.env` is set to `http://localhost:3001`
- Check browser console for CORS errors

### TypeScript errors
- Run `pnpm type-check` to see all errors
- Make sure all packages are built: `pnpm build`

## Next Steps

Now that your development environment is running:

1. **Explore the Frontend**: Visit http://localhost:3000
2. **Read the API Docs**: Check out `docs/api.md` (coming soon)
3. **Customize**: Modify the constitution at `.claude/constitution.md`
4. **Build Features**: Start with Phase 1 tasks in `QUICKSTART.md`

## Development Workflow

```bash
# Run all apps in development mode
pnpm dev

# Build everything
pnpm build

# Run tests
pnpm test

# Lint code
pnpm lint

# Format code
pnpm format

# Type check
pnpm type-check
```

## Project Structure Quick Reference

```
MeetingNotes/
├── apps/
│   ├── web/          # Next.js frontend (http://localhost:3000)
│   └── api/          # Express backend (http://localhost:3001)
├── packages/
│   ├── shared/       # Shared types and constants
│   └── airtable/     # Airtable client
├── docker/           # Docker configuration
└── .env              # Your environment variables (DO NOT commit!)
```

## Need Help?

- **Documentation**: See `README.md` for comprehensive docs
- **Quick Start**: See `QUICKSTART.md` for implementation roadmap
- **Constitution**: See `.claude/constitution.md` for architecture decisions
- **PRD**: Check your Downloads folder for product requirements
- **TDD**: Check your Downloads folder for technical design

## Security Notes

- Never commit `.env` to version control (it's in `.gitignore`)
- Rotate API keys regularly in production
- Use strong, unique JWT secrets
- Keep dependencies updated: `pnpm update`

Happy building! 🚀
