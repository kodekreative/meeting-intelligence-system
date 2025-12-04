# Team Member Task Pages - Secure Access System

## Overview

This feature provides secure, individual task pages for team members. Each team member receives a unique, cryptographically secure URL that shows **only their tasks** - no cross-access between team members is possible.

## Security Design

### Token-Based Access

- **Unique Tokens**: Each team member gets a UUID v4 token (cryptographically secure, 36 characters)
- **Non-Guessable**: Tokens are generated using `crypto.randomUUID()` - impossible to guess or enumerate
- **One Token Per Person**: Each assignee name maps to exactly one token
- **Revocable**: Tokens can be deactivated by setting `Is Active = false` in the database

### Access Control

- **Strict Isolation**: When accessing `/team-tasks/{token}`:
  1. Token is validated against the database
  2. Only active tokens are accepted
  3. Tasks are filtered to match ONLY the token holder's assignee name
  4. Updates are validated to ensure the user can only modify their own tasks

- **No Cross-Access**: Tim cannot see Bill's tasks, even if Tim knows Bill's name. The URL contains a secret token, not the assignee name.

### Audit Trail

- `Last Accessed`: Timestamp of when the page was last viewed
- `Access Count`: Running count of page views
- Token can be regenerated if compromised

## Architecture

### Database Schema

**Table: Team Member Tokens** (Airtable)

| Field | Type | Description |
|-------|------|-------------|
| Assignee Name | Text | Canonical name (e.g., "Bill Shansky") |
| Token | Text | UUID v4 token |
| Email | Text | Optional email for the team member |
| Is Active | Checkbox | Whether token is valid |
| Last Accessed | DateTime | Last page access time |
| Access Count | Number | Total page views |

### API Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/v1/team-tasks/:token` | GET | Get tasks for token holder | Token in URL |
| `/api/v1/team-tasks/:token/items/:id` | PATCH | Update task status | Token in URL |
| `/api/v1/team-tasks/tokens` | POST | Create/get token | Admin |
| `/api/v1/team-tasks/tokens` | GET | List all tokens | Admin |
| `/api/v1/team-tasks/tokens/:id` | DELETE | Revoke token | Admin |
| `/api/v1/team-tasks/tokens/:id/regenerate` | POST | Generate new token | Admin |

### Frontend Page

Located at: `/team-tasks/[token]/page.tsx`

Features:
- No authentication required (token IS the authentication)
- Mobile-friendly responsive design
- Tasks grouped by: Overdue, Due Today, Upcoming, No Due Date
- One-click status updates (mark complete/incomplete)
- Meeting context shown for each task

## Email Integration

When follow-up emails are sent, each team member's email contains their unique secure URL:

```
"View & Update My Tasks" button -> https://yourdomain.com/team-tasks/{unique-token}
```

The token is generated (or retrieved if existing) when the email is sent:

```typescript
// In email service
const secureTasksUrl = await getSecureTasksUrl(assigneeName)
```

## How It Works

### Flow for Team Member

1. Team member receives email with tasks
2. Clicks "View & Update My Tasks" button
3. URL contains their unique token: `/team-tasks/abc123-def456...`
4. Backend validates token, returns ONLY their tasks
5. Team member can view and mark tasks complete

### Flow for Admin/Email Sender

1. System sends follow-up email to team member
2. `getSecureTasksUrl(assigneeName)` is called
3. If token exists for this assignee, returns it
4. If no token exists, creates new UUID token
5. URL is embedded in email

## Security Guarantees

1. **Tokens are secrets**: Treat them like passwords
2. **No enumeration**: Can't guess valid tokens
3. **No escalation**: Token only grants access to that person's tasks
4. **Revocable**: Tokens can be disabled without deletion
5. **Regeneratable**: Compromised tokens can be replaced
6. **Auditable**: Access is logged

## Token Lifecycle

```
[New Team Member Email Sent]
         |
         v
  Token exists? --No--> Create new UUID token
         |                      |
         | Yes                  v
         v               Store in database
   Return existing              |
       token                    |
         |                      |
         +----------+-----------+
                    |
                    v
         [Include in Email URL]
                    |
                    v
    [Team Member Clicks Link]
                    |
                    v
         Validate token
                    |
         +----------+-----------+
         |                      |
     Invalid               Valid
         |                      |
         v                      v
    Show error          Show their tasks
                               |
                               v
                     Log access (timestamp, count)
```

## Management

### Viewing All Tokens

```bash
GET /api/v1/team-tasks/tokens
```

Returns list of all tokens with access stats.

### Revoking Access

```bash
DELETE /api/v1/team-tasks/tokens/:id
```

Sets `Is Active = false`. User will see "Access Denied" on next visit.

### Regenerating Token

```bash
POST /api/v1/team-tasks/tokens/:id/regenerate
```

Creates new UUID, old links stop working. Use if token may be compromised.

## Files Modified/Created

### Backend

- `apps/api/src/lib/schema.ts` - Added TeamMemberTokenRecord interface
- `apps/api/src/routes/team-member-tasks.ts` - New route handler
- `apps/api/src/services/team-token.service.ts` - Token management service
- `apps/api/src/services/email.service.ts` - Updated to use secure URLs
- `apps/api/src/index.ts` - Register new routes

### Frontend

- `apps/web/app/team-tasks/[token]/page.tsx` - Public team member task page

### Airtable

Create table "Team Member Tokens" with fields:
- Assignee Name (Single line text)
- Token (Single line text)
- Email (Email)
- Is Active (Checkbox, default: checked)
- Last Accessed (Date with time)
- Access Count (Number)
