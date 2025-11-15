<!--
Sync Impact Report:
- Version: 0.0.0 → 1.0.0
- Change Type: MAJOR (initial constitution creation)
- Rationale: First version establishing core principles for Meeting Intelligence System
- Modified Principles: N/A (initial creation)
- Added Sections: All sections (Core Principles, Technology Stack, Data Architecture, Development Standards, Governance)
- Removed Sections: N/A
- Templates Status:
  ✅ plan-template.md - Constitution Check section references this file
  ✅ spec-template.md - Requirements align with constitution principles
  ✅ tasks-template.md - Task organization reflects constitution testing requirements
- Follow-up TODOs: None
- Date: 2025-11-15
-->

# Meeting Intelligence System Constitution

## Core Principles

### I. Modern Web Stack (NON-NEGOTIABLE)

**Stack Requirements:**
- Frontend MUST use Next.js (React 18+) with TypeScript 5.2+
- Styling MUST use Tailwind CSS 3.3+ with utility-first approach
- All code MUST be TypeScript with strict mode enabled
- NO Python/FastAPI backend - Next.js API routes handle all backend logic

**Rationale:** Next.js provides server-side rendering for better performance and SEO, built-in API routes eliminate need for separate backend, and TypeScript ensures type safety throughout the stack. This architecture is simpler and more maintainable than a separate Python backend for an Airtable-backed application.

### II. Airtable as Source of Truth (NON-NEGOTIABLE)

**Data Requirements:**
- Airtable MUST be the primary and only persistent data store
- All meeting transcripts, action items, and intelligence data stored in Airtable
- NO PostgreSQL or additional databases - Airtable handles all persistence
- Use Airtable.js official SDK for all data operations
- Implement proper error handling and retry logic for Airtable API calls

**Rationale:** The PRD specifies existing Airtable infrastructure with Read.ai integration. Adding PostgreSQL introduces unnecessary complexity, dual-sync challenges, and maintenance overhead. Airtable provides sufficient querying, relationships, and scalability for the use case.

### III. API-First Design

**Requirements:**
- All business logic MUST be exposed via Next.js API routes (`/pages/api/*` or `/app/api/*`)
- API routes MUST return consistent JSON responses with proper error codes
- Authentication MUST use NextAuth.js for OAuth 2.0 with Microsoft Graph
- API keys and secrets MUST be stored in environment variables, never committed
- All API responses MUST include proper TypeScript types

**Rationale:** Separating business logic into API routes enables future mobile apps, integrations, and testing. NextAuth.js provides robust OAuth handling for Microsoft calendar and email integration.

### IV. Component-Driven UI

**Requirements:**
- Use shadcn/ui component library for consistent, accessible UI components
- All components MUST be TypeScript with proper prop types
- Favor composition over prop drilling - use React Context for shared state
- Use React Query (TanStack Query) for server state management and caching
- Components MUST be responsive and mobile-first

**Rationale:** shadcn/ui provides polished, accessible components that integrate seamlessly with Tailwind. React Query eliminates boilerplate for API calls and provides intelligent caching, reducing Airtable API usage.

### V. AI Integration Standards

**Requirements:**
- Use OpenAI API (GPT-4) for all extraction tasks (action items, personal intelligence, business issues)
- AI processing MUST be asynchronous using Next.js API routes with background processing
- All AI prompts MUST be version-controlled and testable
- AI responses MUST include confidence scores
- Implement proper error handling and fallbacks for AI failures

**Rationale:** Centralized AI standards ensure consistent extraction quality. Background processing prevents timeout issues. Confidence scores enable filtering low-quality extractions.

### VI. Email and Calendar Integration

**Requirements:**
- Use Microsoft Graph API for calendar sync and email sending
- OAuth tokens MUST be encrypted and stored securely (database or secure session storage)
- Email templates MUST be responsive HTML with plain text fallbacks
- Scheduled tasks MUST use Vercel Cron Jobs or similar serverless scheduling
- Calendar sync MUST handle multiple Outlook calendars per user

**Rationale:** Microsoft Graph provides unified access to calendar and email. Serverless cron jobs eliminate need for dedicated worker processes. Secure token storage prevents unauthorized access.

### VII. Testing and Quality

**Requirements:**
- Unit tests for utility functions and data transformations using Jest
- Integration tests for API routes using Next.js test utilities
- E2E tests for critical user flows using Playwright
- Type checking MUST pass before deployment (no TypeScript errors)
- All AI extraction prompts MUST have test cases with sample transcripts

**Rationale:** Testing ensures reliability for critical business operations. AI prompt testing prevents regression when prompts are modified.

## Technology Stack

### Required Technologies

**Frontend:**
- Next.js 14+ (App Router preferred)
- React 18+
- TypeScript 5.2+
- Tailwind CSS 3.3+
- shadcn/ui component library
- React Query (TanStack Query) for server state
- NextAuth.js for authentication

**Backend:**
- Next.js API routes (no separate backend framework)
- Airtable.js SDK for database operations
- OpenAI API SDK for AI processing
- Microsoft Graph API SDK for calendar/email

**Infrastructure:**
- Vercel for deployment (recommended) or similar Next.js hosting
- Vercel Cron Jobs for scheduled tasks (daily emails at 6 AM)
- Environment variables for all secrets and API keys

**Development Tools:**
- ESLint with Next.js recommended config
- Prettier for code formatting
- Jest for unit/integration tests
- Playwright for E2E tests

### Prohibited Technologies

- ❌ Python/FastAPI backend (use Next.js API routes instead)
- ❌ PostgreSQL or additional databases (use Airtable only)
- ❌ Celery/Redis for task queues (use serverless functions)
- ❌ Docker for deployment (use Vercel or serverless platforms)
- ❌ JavaScript without TypeScript (strict TypeScript only)

## Data Architecture

### Airtable Schema

**Tables (as defined in PRD):**
- Meetings: Meeting transcripts from Read.ai
- Companies: Business entities
- Contacts: Individuals across meetings
- Action Items: Extracted commitments with assignees
- Personal Intelligence: Relationship building details
- Business Issues: Risks and concerns
- Users: User accounts and preferences

**Data Access Patterns:**
- Use Airtable formulas and filtered views where possible to reduce API calls
- Implement client-side caching with React Query (5-minute default TTL)
- Use Airtable webhooks for real-time updates where available
- Batch operations to minimize API rate limit impact

### Type Safety

- Generate TypeScript interfaces for all Airtable record types
- Use Zod or similar for runtime validation of Airtable responses
- Maintain single source of truth for types in `/types/airtable.ts`
- Auto-generate types from Airtable schema when possible

## Development Standards

### Code Organization

```
project-root/
├── app/                    # Next.js App Router
│   ├── (dashboard)/        # Dashboard routes
│   ├── api/                # API routes
│   └── auth/               # Auth pages
├── components/             # React components
│   ├── ui/                 # shadcn/ui components
│   └── features/           # Feature-specific components
├── lib/                    # Utilities and services
│   ├── airtable/           # Airtable client and queries
│   ├── ai/                 # OpenAI integration
│   └── microsoft/          # Graph API integration
├── types/                  # TypeScript type definitions
├── hooks/                  # Custom React hooks
└── config/                 # Configuration files
```

### Naming Conventions

- Components: PascalCase (e.g., `MeetingCard.tsx`)
- API routes: kebab-case (e.g., `/api/action-items`)
- Utility functions: camelCase (e.g., `extractActionItems`)
- Types/Interfaces: PascalCase (e.g., `MeetingRecord`)
- Environment variables: SCREAMING_SNAKE_CASE (e.g., `AIRTABLE_API_KEY`)

### Error Handling

- All API routes MUST return consistent error format:
  ```typescript
  { error: string, code: string, details?: any }
  ```
- Client-side errors MUST be caught and displayed gracefully
- Log all errors to monitoring service (e.g., Sentry)
- Never expose internal error details to frontend

### Performance Requirements

- Page load time MUST be under 2 seconds (Web UI requirement from PRD)
- API routes MUST respond in under 1 second for reads
- AI processing MUST complete within 2 hours of meeting end (PRD requirement)
- Emails MUST be delivered at exactly 6:00 AM user timezone (PRD requirement)

## Governance

### Amendment Process

1. Proposed changes MUST be documented with rationale
2. Changes affecting architecture require approval before implementation
3. All amendments MUST update this constitution and increment version
4. Breaking changes to core principles require MAJOR version bump

### Compliance

- All pull requests MUST verify compliance with core principles
- Code reviews MUST check for prohibited technologies
- Deployment MUST fail if TypeScript errors exist
- Security scan MUST pass before production deployment

### Version Control

- This constitution follows semantic versioning: MAJOR.MINOR.PATCH
- MAJOR: Breaking changes to core principles or architecture
- MINOR: New principles added or significant expansions
- PATCH: Clarifications, typos, non-semantic changes

### Runtime Guidance

For implementation details, refer to:
- `/specs/[feature]/plan.md` - Feature-specific implementation plans
- `/specs/[feature]/spec.md` - Feature specifications
- This constitution for architecture decisions and constraints

**Version**: 1.0.0 | **Ratified**: 2025-11-15 | **Last Amended**: 2025-11-15
