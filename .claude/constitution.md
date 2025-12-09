# Project Constitution: Meeting Intelligence System

## Project Identity

**Project Name**: Meeting Intelligence System
**Primary Goal**: Transform meeting transcripts into actionable intelligence with daily briefings, task tracking, and relationship management
**Target User**: Managing Partners and team members at Pine Lake Capital
**Code Quality Standard**: Production-ready, enterprise-grade code with comprehensive error handling and testing

## Technology Stack

### Frontend Stack (Contemporary & Modern)

**Core Framework**
- **Next.js 14** (App Router) - React framework with server-side rendering, API routes, and optimal performance
- **React 18** - Component-based UI with hooks and modern patterns
- **TypeScript 5.3** - Type safety across the entire frontend codebase

**Styling & UI Components**
- **Tailwind CSS 3.4** - Utility-first CSS framework for rapid, consistent development
- **shadcn/ui** - High-quality, accessible component library built on Radix UI
- **Framer Motion** - Smooth animations and transitions for enhanced UX
- **Lucide React** - Modern, consistent icon system

**State Management & Data Fetching**
- **TanStack Query (React Query) v5** - Server state management with caching, background updates, and optimistic updates
- **Zustand** - Lightweight client state management for UI state
- **SWR** - Alternative data fetching strategy for real-time updates

**Forms & Validation**
- **React Hook Form** - Performant form handling with minimal re-renders
- **Zod** - TypeScript-first schema validation for forms and API responses

**Date & Time**
- **date-fns** - Modern date utility library (lighter alternative to moment.js)
- **react-day-picker** - Flexible date picker component

### Backend Stack (Node.js + Airtable)

**Runtime & Framework**
- **Node.js 20 LTS** - JavaScript runtime with native ES modules support
- **Express.js 4.18** - Web framework for API endpoints and middleware
- **TypeScript 5.3** - Type safety across backend services

**Data Layer**
- **Airtable API** - Primary data store and source of truth
- **@airtable/blocks** - Official Airtable SDK for JavaScript
- **Redis 7** - Caching layer for improved performance and session storage

**Authentication & Security**
- **Passport.js** - OAuth 2.0 authentication middleware
- **@azure/msal-node** - Microsoft Authentication Library for Outlook/Calendar integration
- **jsonwebtoken** - JWT token generation and validation
- **bcrypt** - Password hashing (if needed for future user management)

**AI & Processing**
- **OpenAI Node.js SDK v4** - GPT-4 integration for extraction tasks
- **LangChain.js** - LLM orchestration and prompt management
- **Bull** - Redis-based job queue for async AI processing

**Email & Calendar Integration**
- **@microsoft/microsoft-graph-client** - Microsoft Graph API for Outlook calendar and email
- **nodemailer** - Email sending with HTML templates
- **handlebars** - Email template engine

**Task Scheduling**
- **node-cron** - Scheduled tasks for daily emails (6 AM delivery)
- **Bull** - Job queue with retry logic and monitoring

**Utilities**
- **zod** - Runtime type validation for API requests/responses
- **winston** - Structured logging with multiple transports
- **dotenv** - Environment variable management
- **axios** - HTTP client for external API calls

### Development Tools

**Code Quality**
- **ESLint** - JavaScript/TypeScript linting with Airbnb config
- **Prettier** - Code formatting with consistent style
- **husky** - Git hooks for pre-commit quality checks
- **lint-staged** - Run linters on staged files only

**Testing**
- **Vitest** - Fast unit testing framework (Vite-native)
- **Testing Library (React/Node)** - Component and integration testing
- **Playwright** - End-to-end testing for critical user flows
- **MSW (Mock Service Worker)** - API mocking for tests

**Build & Deployment**
- **Turbo** - Monorepo build system for frontend + backend
- **Docker** - Containerization for consistent deployment
- **Docker Compose** - Local development environment
- **GitHub Actions** - CI/CD pipeline

## Architecture Principles

### 1. Separation of Concerns
- Clear boundaries between frontend (Next.js), backend API (Express), and data layer (Airtable)
- API-first design: all functionality exposed via REST/GraphQL endpoints
- Frontend consumes APIs only, never directly accesses Airtable

### 2. Airtable as Single Source of Truth
- Airtable stores all persistent data: meetings, action items, personal intelligence, business issues
- Backend caches frequently accessed data in Redis (5-minute TTL)
- All data mutations sync back to Airtable immediately
- Maintain existing Airtable schema and relationships

### 3. Event-Driven Processing
- Async job queue (Bull) for AI processing and email generation
- Webhook listeners for real-time Airtable updates
- Background workers for transcript analysis and extraction
- Scheduled jobs for daily email delivery at 6 AM

### 4. Performance & Scalability
- Redis caching for frequently accessed data (meeting prep context, task lists)
- Optimistic UI updates with background sync
- Cursor-based pagination for large datasets
- Code splitting and lazy loading in Next.js

### 5. Security & Privacy
- OAuth 2.0 for Microsoft Graph authentication
- JWT tokens for API authentication (1-hour expiration)
- Secure token storage (httpOnly cookies)
- Environment variables for all secrets (never commit credentials)
- CORS configuration for frontend-backend communication

### 6. Type Safety End-to-End
- TypeScript across frontend and backend
- Zod schemas for runtime validation
- Shared type definitions between frontend and backend
- Auto-generated API types from OpenAPI spec

## Code Quality Standards

### TypeScript Guidelines
- **Strict Mode**: Enable all strict type checking options
- **No Any**: Avoid `any` type; use `unknown` or proper types
- **Explicit Return Types**: All functions must declare return types
- **Interface over Type**: Use interfaces for object shapes, types for unions/intersections

### Component Standards (React/Next.js)
- **Functional Components**: Use function components with hooks (no class components)
- **Server Components by Default**: Use React Server Components in Next.js App Router unless interactivity required
- **Client Components When Needed**: Mark with `'use client'` directive for interactive components
- **Custom Hooks**: Extract reusable logic into custom hooks (prefix with `use`)
- **Prop Types**: Define explicit interfaces for all component props

### API Design Standards
- **RESTful Conventions**: Follow REST principles (GET, POST, PATCH, DELETE)
- **Consistent Response Format**: `{ success: boolean, data?: T, error?: string }`
- **HTTP Status Codes**: Use appropriate codes (200, 201, 400, 401, 404, 500)
- **Error Handling**: Centralized error middleware with detailed error messages
- **Validation**: Validate all inputs with Zod before processing

### Testing Requirements
- **Unit Test Coverage**: Minimum 80% for backend, 70% for frontend
- **Critical Path E2E**: Playwright tests for: meeting prep flow, task management, email generation
- **Mock External APIs**: Mock Airtable, OpenAI, Microsoft Graph in tests
- **Test Data Fixtures**: Maintain realistic test data that mirrors production schema

### Documentation Standards
- **JSDoc Comments**: Document all public functions and complex logic
- **README per Directory**: Each major directory has README explaining its purpose
- **API Documentation**: Auto-generated from OpenAPI spec
- **Architecture Diagrams**: Maintain Mermaid diagrams in docs/ for system architecture

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
│   ├── shared/                 # Shared code between frontend and backend
│   │   ├── types/              # Shared TypeScript types
│   │   ├── schemas/            # Zod validation schemas
│   │   └── constants/          # Shared constants
│   │
│   └── airtable/               # Airtable SDK wrapper
│       ├── schema.ts           # Airtable table definitions
│       ├── client.ts           # Airtable API client
│       └── types.ts            # Airtable record types
│
├── docker/
│   ├── Dockerfile.web          # Frontend container
│   ├── Dockerfile.api          # Backend container
│   └── docker-compose.yml      # Local development setup
│
├── docs/
│   ├── architecture.md         # System architecture overview
│   ├── api.md                  # API documentation
│   └── deployment.md           # Deployment guide
│
└── .github/
    └── workflows/              # CI/CD pipelines
```

## Feature Development Workflow

### 1. Feature Planning
- Review feature spec in `/specs/{feature-id}/spec.md`
- Understand acceptance criteria and edge cases
- Identify Airtable schema changes needed (if any)
- Plan API endpoints and data flow

### 2. Backend-First Development
- Define Zod schemas for request/response validation
- Implement API endpoints in Express
- Create Airtable client methods for data access
- Write unit tests for services and routes
- Test manually with Postman/Thunder Client

### 3. Frontend Development
- Create React Query hooks for API endpoints
- Build UI components with shadcn/ui
- Implement forms with React Hook Form + Zod
- Add optimistic updates for better UX
- Write component tests with Testing Library

### 4. Integration & Testing
- Run E2E tests with Playwright
- Test error scenarios and edge cases
- Verify Airtable sync works correctly
- Test email generation and delivery
- Performance testing with Lighthouse

### 5. Code Review & Deployment
- Create PR with detailed description
- Address code review feedback
- Ensure all tests pass in CI
- Deploy to staging environment
- Manual QA testing before production

## AI Processing Guidelines

### Extraction Principles
- **High Precision Over Recall**: Better to miss an item than create false positives
- **Confidence Thresholds**: Only save extracted items with confidence > 70%
- **Clear Prompts**: Use structured prompts with examples for consistent extraction
- **Fallback Handling**: Gracefully handle extraction failures without blocking pipeline

### Prompt Engineering
- **Action Items**: Extract only clear commitments with assignee and task
- **Personal Intelligence**: Be respectful; only extract voluntarily shared details
- **Business Issues**: Focus on substantive challenges, not minor operational details
- **Due Date Parsing**: Parse natural language dates ("by Friday", "end of month")

### Error Handling
- **Rate Limits**: Exponential backoff with max 3 retries for OpenAI API
- **Parsing Errors**: Log failed extractions for manual review, don't fail pipeline
- **Network Errors**: Queue for retry with dead letter queue after 5 attempts
- **Validation**: Validate all AI outputs against Zod schemas before saving

## Airtable Integration Rules

### Data Sync Strategy
- **Airtable is Canonical**: Always treat Airtable as source of truth
- **Cache Aggressively**: Cache reads in Redis with 5-minute TTL
- **Immediate Writes**: All mutations sync to Airtable immediately, no queueing
- **Idempotent Operations**: Design all Airtable operations to be safely retryable

### Schema Preservation
- **No Breaking Changes**: Never modify existing Airtable field types or relationships
- **Additive Only**: Only add new fields/tables, never remove existing ones
- **Field Mapping**: Maintain explicit mapping between Airtable fields and app types
- **Validation**: Validate data matches Airtable schema before writing

### Performance Optimization
- **Batch Reads**: Use Airtable's bulk API for reading multiple records
- **Selective Fields**: Only fetch needed fields to reduce payload size
- **Webhook Integration**: Use Airtable webhooks for real-time updates instead of polling
- **Connection Pooling**: Reuse Airtable API client instances

## Email System Requirements

### Daily Email Delivery
- **Exact Timing**: 6:00 AM in user's configured timezone (default: America/New_York)
- **Reliability**: 99.5% on-time delivery rate required
- **Five Separate Emails**: Meeting Prep, My Tasks, Follow-Ups, Business Issues, Personal Intel
- **Fallback**: If Microsoft Graph fails, queue for retry every 15 minutes up to 3 hours

### Email Design Standards
- **Mobile-First**: Responsive HTML that works on all email clients
- **Plain Text Fallback**: Always include plain text version
- **Accessibility**: ARIA labels, semantic HTML, sufficient color contrast
- **Brand Consistency**: Use Pine Lake Capital branding and color scheme
- **Action Buttons**: Deep links to web UI for each item

### Template Rendering
- **Handlebars Templates**: Use Handlebars for email HTML generation
- **Template Validation**: Validate rendered HTML with linting tools
- **Test Across Clients**: Test in Gmail, Outlook, Apple Mail, mobile clients
- **Preview Feature**: Web UI preview of generated emails before sending

## Calendar Integration Requirements

### Microsoft Graph Authentication
- **OAuth 2.0 PKCE Flow**: Secure authentication for calendar and email access
- **Scopes Requested**: `Calendars.Read`, `Mail.Send`, `offline_access`
- **Token Refresh**: Automatic token refresh before expiration
- **Multi-Calendar Support**: Allow users to select multiple calendars to sync

### Sync Strategy
- **Polling Frequency**: Every 60 minutes for calendar updates
- **Delta Queries**: Use Microsoft Graph delta queries for efficiency
- **Conflict Resolution**: Calendar event ID is source of truth for matching
- **Placeholder Creation**: Create Airtable meeting records when new events detected

## Security Checklist

- [ ] All API keys stored in environment variables
- [ ] OAuth tokens encrypted at rest (AES-256)
- [ ] HTTPS/TLS 1.3 for all external communication
- [ ] JWT tokens with 1-hour expiration
- [ ] CORS configured with specific origins (no `*`)
- [ ] Input validation on all API endpoints
- [ ] SQL injection prevention (N/A - using Airtable)
- [ ] XSS prevention (React auto-escapes by default)
- [ ] Rate limiting on public API endpoints
- [ ] Audit logging for sensitive operations

## Performance Targets

- **Web UI Page Load**: < 2 seconds (95th percentile)
- **API Response Time**: < 500ms for dashboard endpoints
- **Email Delivery**: 6:00 AM ± 2 minutes
- **Transcript Processing**: < 2 hours from meeting end to completion
- **Cache Hit Rate**: > 80% for frequently accessed data
- **Uptime**: 99.5% availability

## Deployment Strategy

### Development Environment
- Docker Compose with hot reload for frontend and backend
- Local Redis and mock Airtable for isolated development
- Environment variables in `.env.local` (gitignored)

### Staging Environment
- Production-like environment for testing
- Real Airtable workspace (separate from production)
- Test Microsoft Graph integration with sandbox accounts

### Production Environment
- **Hosting**: Vercel for Next.js frontend, Railway/Render for Express backend
- **Database**: Airtable production workspace, Upstash Redis for caching
- **Monitoring**: Sentry for error tracking, Vercel Analytics for performance
- **CI/CD**: GitHub Actions for automated testing and deployment
- **Secrets**: Managed via Vercel Environment Variables and Railway Config

## Success Criteria

### User Experience
- Users reduce meeting prep time from 10 minutes to 2 minutes (80% reduction)
- 90% of users open daily digest emails within 2 hours of delivery
- 95% of tracked action items completed by due date

### Technical Performance
- 95% AI extraction precision, 85% recall for action items
- 90% assignee identification accuracy
- Zero data loss when syncing to Airtable

### Code Quality
- All PR checks pass (lint, type-check, tests)
- Test coverage meets minimums (80% backend, 70% frontend)
- No critical security vulnerabilities in dependencies

## Constraints & Limitations

- **Airtable Rate Limits**: Max 5 requests/second per base
- **OpenAI API Costs**: Budget $200/month for AI processing initially
- **Email Sending Limits**: Microsoft Graph has 30 messages/minute limit
- **Transcript Size**: Meetings longer than 2 hours may exceed GPT-4 context window
- **Calendar Sync**: Limited to Microsoft Outlook calendars only (no Google Calendar)

## Future Considerations

- **Multi-Tenancy**: Design with future multi-tenant architecture in mind
- **Mobile Apps**: API designed to support future iOS/Android native apps
- **Real-Time Updates**: WebSocket infrastructure for live dashboard updates
- **Advanced Analytics**: Event tracking for product analytics and user insights
- **Voice Interface**: API structure supports future voice-activated queries

---

**Constitution Version**: 1.0
**Last Updated**: 2025-11-15
**Review Cycle**: Update as project evolves, review before each major milestone
