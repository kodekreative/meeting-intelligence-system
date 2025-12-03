# Quick Start Guide

Welcome to the Meeting Intelligence System! This guide will help you get started quickly.

## What We've Built

A complete contemporary Node.js + Next.js monorepo with:

✅ **Next.js 14 Frontend** with App Router, TypeScript, and Tailwind CSS
✅ **Express Backend API** with TypeScript and Node.js 20
✅ **Airtable Integration** - Type-safe client with complete schema
✅ **Shared Packages** - Types, schemas, and constants across the stack
✅ **Docker Configuration** - Ready for local development
✅ **Turbo Monorepo** - Fast, efficient build system
✅ **Complete Type Safety** - TypeScript + Zod validation everywhere
✅ **Project Constitution** - Development standards and architecture

## Project Structure

```
MeetingNotes/
├── .claude/
│   └── constitution.md          # Project standards and tech stack
├── apps/
│   ├── web/                     # Next.js 14 frontend
│   │   ├── app/                 # Next.js App Router (pages go here)
│   │   ├── components/          # React components
│   │   ├── lib/                 # Utilities
│   │   └── types/               # Frontend types
│   └── api/                     # Express backend
│       ├── src/
│       │   ├── routes/          # API endpoints
│       │   ├── services/        # Business logic
│       │   ├── workers/         # Background jobs
│       │   ├── middleware/      # Express middleware
│       │   └── utils/           # Utilities
│       └── tests/               # Backend tests
├── packages/
│   ├── shared/                  # Shared code
│   │   ├── types/               # TypeScript types
│   │   ├── schemas/             # Zod validation schemas
│   │   └── constants/           # App constants
│   └── airtable/                # Airtable client
│       ├── schema.ts            # Airtable table definitions
│       ├── client.ts            # Type-safe Airtable wrapper
│       └── index.ts             # Exports
├── docker/
│   ├── docker-compose.yml       # Local dev environment
│   ├── Dockerfile.api           # Backend container
│   └── Dockerfile.web           # Frontend container
├── .env.example                 # Environment variables template
├── package.json                 # Root package.json
├── turbo.json                   # Turbo configuration
└── README.md                    # Full documentation
```

## Next Steps

### 1. Install Dependencies

```bash
# Install pnpm if you haven't already
npm install -g pnpm

# Install all dependencies
pnpm install
```

### 2. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your credentials
# You'll need:
# - Airtable API key and base ID
# - Microsoft Azure AD credentials (for calendar/email)
# - OpenAI API key
# - Redis connection (optional for local dev)
```

### 3. Start Development

**Option A: Using Docker (Recommended)**
```bash
cd docker
docker-compose up -d
```

**Option B: Local Development**
```bash
# Terminal 1 - Backend API
pnpm dev --filter=api

# Terminal 2 - Frontend
pnpm dev --filter=web
```

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Redis**: localhost:6379

## What to Build Next

Based on your PRD/TDD, here's the recommended implementation order:

### Phase 1: Foundation (Week 1-2)
1. **Backend API Setup**
   - Create Express server (`apps/api/src/index.ts`)
   - Set up middleware (auth, error handling, logging)
   - Connect to Airtable and Redis
   - Health check endpoint

2. **Frontend Setup**
   - Create Next.js layout and homepage
   - Set up shadcn/ui components
   - Configure React Query
   - Authentication flow

3. **Airtable Integration**
   - Test Airtable client
   - Verify schema matches your actual Airtable base
   - Create seed data if needed

### Phase 2: Core Features (Week 3-4)
1. **Meeting Display**
   - API endpoint: `GET /api/v1/meetings`
   - Frontend: Meetings list page
   - Meeting detail view

2. **Action Items**
   - API endpoints for CRUD operations
   - Frontend: Task management view
   - Status updates

3. **Dashboard**
   - API: `GET /api/v1/dashboard/today`
   - Frontend: Today's dashboard view

### Phase 3: AI Processing (Week 5-6)
1. **AI Extraction Pipeline**
   - Set up Bull queue for background jobs
   - OpenAI integration for extraction
   - Prompt engineering for action items, personal intel, issues

2. **Meeting Processing**
   - Webhook handler for new meetings
   - Process transcripts asynchronously
   - Write extracted data to Airtable

### Phase 4: Email System (Week 7-8)
1. **Email Templates**
   - Handlebars templates for each email type
   - Responsive HTML design

2. **Email Scheduler**
   - Daily email job (6 AM delivery)
   - Microsoft Graph integration
   - Email preferences

3. **Calendar Sync**
   - Microsoft Graph OAuth
   - Calendar polling service
   - Sync to Airtable

## Key Files to Start With

1. **`apps/api/src/index.ts`** - Create the Express server
2. **`apps/web/app/page.tsx`** - Create the homepage
3. **`apps/api/src/routes/meetings.ts`** - First API endpoint
4. **Test Airtable connection** - Verify schema matches

## Helpful Commands

```bash
# Development
pnpm dev                      # Run all apps
pnpm dev --filter=web         # Run frontend only
pnpm dev --filter=api         # Run backend only

# Building
pnpm build                    # Build everything
pnpm type-check              # Check TypeScript

# Testing
pnpm test                     # Run all tests
pnpm lint                     # Lint code
pnpm format                   # Format code

# Clean
pnpm clean                    # Remove build artifacts
```

## Architecture Overview

```
┌─────────────┐
│   Next.js   │ ──────────────┐
│  Frontend   │               │
└─────────────┘               │
                              ▼
                    ┌──────────────────┐
                    │  Express API     │
                    │  (Node.js 20)    │
                    └──────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
            ┌─────────────┐     ┌─────────────┐
            │  Airtable   │     │    Redis    │
            │  (Source of │     │   (Cache)   │
            │    Truth)   │     └─────────────┘
            └─────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │   Background Jobs     │
        │  - AI Processing      │
        │  - Email Sending      │
        │  - Calendar Sync      │
        └───────────────────────┘
```

## Getting Help

- **Constitution**: [.claude/constitution.md](.claude/constitution.md) - Development standards
- **README**: [README.md](README.md) - Full documentation
- **PRD**: Check your Downloads folder for product requirements
- **TDD**: Check your Downloads folder for technical design

## Tips

1. **Start Small** - Get one feature working end-to-end before moving to the next
2. **Follow the Constitution** - It has all your architecture decisions
3. **Type Safety First** - Use Zod schemas for all API validation
4. **Test Airtable Connection** - Make sure your schema matches before building
5. **Use Shared Packages** - Import types from `shared` package everywhere

## What's Already Done

✅ Complete monorepo structure
✅ TypeScript configurations
✅ Airtable schema and client
✅ Shared types and constants
✅ Docker setup
✅ Environment configuration
✅ Build system (Turbo)
✅ Code quality tools (ESLint, Prettier)
✅ **Action Items Management** - Full CRUD with advanced UI
✅ **Grid View** - Airtable-like spreadsheet interface
✅ **Multiple Views** - Timeline, Assignee, Meeting, Grid
✅ **Search & Filters** - Advanced filtering and sorting
✅ **Meeting Parser** - Extract action items from transcripts
✅ **Redis Caching** - API response caching
✅ **Real-time Sync** - Auto-save to Airtable

## What's Available Now

### Action Items Features
- **Four View Modes**: Timeline, By Assignee, By Meeting, Grid View
- **Advanced Grid**: Inline editing, multi-column sorting, column resizing
- **Search & Filter**: Full-text search + filters for status, priority, assignee
- **Auto-Save**: Changes sync to Airtable automatically
- **Meeting Integration**: Link tasks to source meetings with title lookup

### Access the App
1. Start the backend: `pnpm dev --filter=api`
2. Start the frontend: `pnpm dev --filter=web`
3. Visit http://localhost:3000/action-items

Good luck! 🚀
