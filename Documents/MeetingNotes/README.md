# Meeting Intelligence System

Transform meeting transcripts into actionable intelligence with daily briefings, task tracking, and relationship management.

## Overview

The Meeting Intelligence System is a comprehensive platform designed for business professionals to manage meeting knowledge, relationships, and action items. By leveraging AI to extract insights from meeting transcriptions stored in Airtable, the system provides:

- **Daily Intelligence Briefings** - Comprehensive meeting prep delivered at 6 AM
- **Automated Task Tracking** - AI-extracted action items with follow-up management
- **Relationship Intelligence** - Personal details for authentic connection building
- **Portfolio Oversight** - Business issues tracking across companies

## Tech Stack

### Frontend
- **Next.js 14** (App Router) - React framework with SSR
- **TypeScript 5.3** - Type safety across the application
- **Tailwind CSS + shadcn/ui** - Modern, accessible UI components
- **TanStack Query** - Server state management with caching
- **Zustand** - Client state management

### Backend
- **Node.js 20 + Express** - Fast, proven backend framework
- **TypeScript 5.3** - Type safety on the backend
- **Airtable API** - Primary data store and source of truth
- **Redis** - Caching layer and job queue backend
- **Bull** - Background job processing
- **OpenAI GPT-4** - AI extraction and intelligence

### Infrastructure
- **Docker + Docker Compose** - Containerized development
- **Turbo** - Monorepo build system
- **Microsoft Graph API** - Calendar and email integration

## Project Structure

```
meeting-intelligence/
├── apps/
│   ├── web/                    # Next.js frontend application
│   │   ├── app/                # Next.js App Router pages
│   │   ├── components/         # React components
│   │   ├── lib/                # Utilities and helpers
│   │   └── types/              # TypeScript type definitions
│   │
│   └── api/                    # Express.js backend API
│       ├── src/
│       │   ├── routes/         # API route handlers
│       │   ├── services/       # Business logic layer
│       │   ├── workers/        # Background job processors
│       │   ├── middleware/     # Express middleware
│       │   └── utils/          # Shared utilities
│       └── tests/              # Backend tests
│
├── packages/
│   ├── shared/                 # Shared types, schemas, constants
│   └── airtable/               # Airtable client wrapper
│
├── docker/                     # Docker configuration
└── docs/                       # Documentation
```

## Getting Started

### Prerequisites

- **Node.js 20+** - [Download](https://nodejs.org/)
- **pnpm** - `npm install -g pnpm`
- **Docker & Docker Compose** - [Download](https://www.docker.com/)
- **Airtable Account** - With existing base for meetings
- **Microsoft Azure AD App** - For calendar/email OAuth
- **OpenAI API Key** - For AI processing

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd MeetingNotes
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your credentials:
   - Airtable API key and base ID
   - Microsoft Azure AD credentials
   - OpenAI API key
   - Redis configuration

4. **Start development services**

   **Option A: Using Docker (Recommended)**
   ```bash
   cd docker
   docker-compose up -d
   ```

   **Option B: Local development**
   ```bash
   # Terminal 1 - Start Redis
   redis-server

   # Terminal 2 - Start API
   pnpm dev --filter=api

   # Terminal 3 - Start Web
   pnpm dev --filter=web
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - API: http://localhost:3001
   - API Docs: http://localhost:3001/docs

## Development Workflow

### Running Commands

```bash
# Development
pnpm dev                    # Start all apps in dev mode
pnpm dev --filter=web       # Start only frontend
pnpm dev --filter=api       # Start only backend

# Building
pnpm build                  # Build all apps
pnpm build --filter=web     # Build only frontend

# Testing
pnpm test                   # Run all tests
pnpm test --filter=api      # Run backend tests

# Linting & Formatting
pnpm lint                   # Lint all code
pnpm format                 # Format all code
pnpm type-check             # TypeScript type checking
```

### Working with Workspaces

This is a Turbo monorepo with the following workspaces:

- `web` - Next.js frontend
- `api` - Express backend
- `shared` - Shared types and schemas
- `airtable-client` - Airtable SDK wrapper

To run commands in a specific workspace:
```bash
pnpm <command> --filter=<workspace>
```

## Architecture

### Data Flow

1. **Meeting Ingestion**
   - Calendars synced via Microsoft Graph API (hourly)
   - Transcripts added to Airtable by Read.ai
   - Webhook triggers AI processing pipeline

2. **AI Processing**
   - Extract action items with assignees and due dates
   - Identify personal intelligence for relationship building
   - Detect business issues and categorize by severity
   - Write extracted data back to Airtable

3. **Daily Email Generation**
   - Scheduled job runs at 6 AM (user timezone)
   - Five separate emails generated:
     - Meeting Prep Brief
     - My Action Items
     - Follow-Up Reminders
     - Business Issues
     - Personal Intelligence
   - Sent via Microsoft Graph API using user's Outlook

4. **Web Dashboard**
   - Real-time data from Airtable (cached in Redis)
   - Multiple views: Today, Company, Person, Tasks
   - Optimistic updates with background sync

### Key Design Decisions

- **Airtable as Single Source of Truth** - All persistent data stored in Airtable
- **Redis for Performance** - Aggressive caching with 5-minute TTL
- **Event-Driven Processing** - Background jobs for AI and email
- **Type Safety End-to-End** - TypeScript + Zod validation everywhere
- **API-First Design** - Clean separation, mobile-ready

## Configuration

### Environment Variables

See [`.env.example`](.env.example) for full list. Key variables:

```bash
# Airtable
AIRTABLE_API_KEY=your_key
AIRTABLE_BASE_ID=your_base_id

# Microsoft Graph
MICROSOFT_CLIENT_ID=your_client_id
MICROSOFT_CLIENT_SECRET=your_secret

# OpenAI
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4-turbo-preview

# JWT
JWT_SECRET=your_secret_key
```

### Airtable Schema

Required Airtable tables:
- **Meetings** - Meeting transcripts from Read.ai
- **Companies** - Portfolio companies and prospects
- **Contacts** - Individual people across meetings
- **Action Items** - Extracted commitments and tasks
- **Personal Intelligence** - Personal details for relationships
- **Business Issues** - Risks and concerns by company

See [`packages/airtable/schema.ts`](packages/airtable/schema.ts) for full schema.

## Testing

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage --filter=api

# Run tests in watch mode
pnpm test --filter=web -- --watch

# E2E tests (requires running application)
pnpm test:e2e
```

## Deployment

### Production Build

```bash
# Build all apps for production
pnpm build

# Start production server
pnpm start
```

### Docker Deployment

```bash
# Build production images
docker build -f docker/Dockerfile.api -t meeting-intel-api .
docker build -f docker/Dockerfile.web -t meeting-intel-web .

# Run with docker-compose
docker-compose -f docker/docker-compose.prod.yml up -d
```

### Recommended Hosting

- **Frontend**: Vercel (optimized for Next.js)
- **Backend**: Railway or Render
- **Redis**: Upstash (serverless Redis)
- **Monitoring**: Sentry for errors, Vercel Analytics

## Contributing

See [`.claude/constitution.md`](.claude/constitution.md) for development standards and guidelines.

### Code Quality Standards

- TypeScript strict mode enabled
- ESLint + Prettier for code formatting
- 80% test coverage for backend, 70% for frontend
- All PRs require passing CI checks

## Documentation

- [Architecture Overview](docs/architecture.md)
- [API Documentation](docs/api.md)
- [Deployment Guide](docs/deployment.md)
- [Project Constitution](.claude/constitution.md)

## License

UNLICENSED - Private project for Pine Lake Capital & Conversely AI

## Support

For questions or issues, please contact the development team.

---

**Version**: 1.0.0
**Last Updated**: 2025-11-15
**Maintained By**: Pine Lake Capital & Conversely AI
