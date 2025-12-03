# Outlook/Exchange Calendar Integration Setup Guide

This guide will help you set up the Microsoft Outlook/Exchange calendar integration for the Meeting Intelligence System.

## Overview

The calendar integration allows you to:
- Connect your Microsoft Outlook/Exchange calendar via OAuth
- Automatically sync upcoming meetings (next 30 days)
- View all upcoming calendar events in the dashboard
- Sync calendar events hourly via scheduled job
- Manually trigger calendar syncs

## Prerequisites

1. Microsoft Azure AD application with appropriate permissions
2. Airtable base with required tables
3. Environment variables configured
4. Redis instance running (for caching and background jobs)

## Step 1: Azure AD Application Setup

### 1.1 Create Azure AD Application

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Fill in the details:
   - Name: `Meeting Intelligence Calendar Sync`
   - Supported account types: `Accounts in any organizational directory (Any Azure AD directory - Multitenant)`
   - Redirect URI:
     - Platform: `Web`
     - URI: `http://localhost:3001/api/v1/auth/callback` (development)
     - URI: `https://your-production-domain.com/api/v1/auth/callback` (production)
5. Click **Register**

### 1.2 Configure API Permissions

1. In your app registration, go to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph** > **Delegated permissions**
4. Add the following permissions:
   - `Calendars.Read` - Read user calendars
   - `offline_access` - Maintain access to data you have given it access to
   - `User.Read` - Sign in and read user profile (optional)
5. Click **Add permissions**
6. Click **Grant admin consent** (if you have admin privileges)

### 1.3 Create Client Secret

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Add description: `Calendar Sync Secret`
4. Select expiration: `24 months` (recommended)
5. Click **Add**
6. **IMPORTANT**: Copy the secret value immediately - you won't be able to see it again

### 1.4 Note Your Application Details

You'll need these values for your `.env` file:
- **Application (client) ID**: Found on the Overview page
- **Directory (tenant) ID**: Found on the Overview page
- **Client secret**: The value you just copied

## Step 2: Airtable Schema Setup

### 2.1 Update Users Table

Add the following fields to your existing **Users** table:

| Field Name | Field Type | Description |
|------------|-----------|-------------|
| Microsoft Access Token | Long text | Encrypted OAuth access token |
| Microsoft Refresh Token | Long text | Encrypted OAuth refresh token |
| Microsoft Token Expires At | Date | Token expiration timestamp |
| Calendar Connected | Checkbox | Whether calendar is connected |
| Last Calendar Sync | Date | Last successful sync timestamp |

### 2.2 Create Calendar Events Table

Create a new table called **Calendar Events** with these fields:

| Field Name | Field Type | Description |
|------------|-----------|-------------|
| Calendar Event ID | Single line text | Microsoft Graph event ID (Primary field) |
| Subject | Single line text | Meeting subject/title |
| Start Time | Date (with time) | Event start date and time |
| End Time | Date (with time) | Event end date and time |
| Location | Single line text | Meeting location |
| Attendees | Long text | Comma-separated email addresses |
| Organizer | Email | Organizer email address |
| Description | Long text | Event body/description |
| Is Online Meeting | Checkbox | Whether it's an online meeting |
| Meeting URL | URL | Online meeting URL (Teams, etc.) |
| User | Link to Users table | User who owns this calendar event |
| Last Synced | Date (with time) | Last sync timestamp |
| Created | Created time | Auto-generated |
| Last Modified | Last modified time | Auto-generated |

## Step 3: Environment Variables

Update your `.env` file with the following variables:

```bash
# Microsoft Graph / Azure AD Configuration
MICROSOFT_CLIENT_ID=your_application_client_id_here
MICROSOFT_CLIENT_SECRET=your_client_secret_here
MICROSOFT_TENANT_ID=common  # Use "common" for multi-tenant or your specific tenant ID
MICROSOFT_REDIRECT_URI=http://localhost:3001/api/v1/auth/callback
MICROSOFT_SCOPES=Calendars.Read,offline_access

# Encryption key for storing tokens (MUST be 32 characters or more)
ENCRYPTION_KEY=your_secure_32_char_encryption_key_change_in_production

# Calendar sync schedule (cron format, default: every hour)
CALENDAR_SYNC_SCHEDULE=0 * * * *

# Frontend URL for OAuth redirects
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Production Environment Variables

For production, update these values:

```bash
MICROSOFT_REDIRECT_URI=https://your-production-domain.com/api/v1/auth/callback
ENCRYPTION_KEY=generate_a_strong_random_32_character_key_here
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
NEXT_PUBLIC_API_URL=https://api.your-production-domain.com
```

## Step 4: Test the Integration

### 4.1 Start the Development Servers

```bash
# Start the API server
cd apps/api
pnpm dev

# In another terminal, start the web app
cd apps/web
pnpm dev
```

### 4.2 Connect Your Calendar

1. Navigate to `http://localhost:3000/settings/calendar`
2. Click the **Connect Calendar** button
3. You'll be redirected to Microsoft login
4. Sign in with your Microsoft account
5. Grant the requested permissions
6. You'll be redirected back to the app
7. Your calendar should now show as "Connected"
8. Upcoming meetings should appear automatically

### 4.3 Manual Sync Test

You can manually trigger a calendar sync:

```bash
# Using curl
curl -X POST http://localhost:3001/api/v1/calendar/sync \
  -H "Content-Type: application/json" \
  -d '{"userId": "YOUR_AIRTABLE_USER_RECORD_ID"}'
```

Or use the "Sync Now" button in the Calendar Settings UI.

### 4.4 Check Scheduled Sync

The calendar sync runs automatically every hour. Check the logs to verify:

```bash
# API logs will show:
✓ Scheduled calendar sync: 0 * * * * (America/Los_Angeles)
Running calendar sync job...
Found 1 users with connected calendars
Synced calendar for user recXXXX: 15 events
✓ Calendar sync job completed
```

## Step 5: API Endpoints Reference

### Authentication Endpoints

- `GET /api/v1/auth/login?userId=<userId>`
  - Initiates OAuth flow
  - Redirects to Microsoft login

- `GET /api/v1/auth/callback?code=<code>&state=<state>`
  - OAuth callback handler
  - Exchanges code for tokens
  - Redirects to frontend with success/error

- `POST /api/v1/auth/refresh`
  - Refresh expired access token
  - Body: `{ userId: string }`

- `GET /api/v1/auth/status?userId=<userId>`
  - Check if user's calendar is connected

### Calendar Endpoints

- `POST /api/v1/calendar/sync`
  - Manually trigger calendar sync
  - Body: `{ userId: string, daysAhead?: number }`

- `GET /api/v1/calendar/events?userId=<userId>&days=<days>`
  - Get upcoming calendar events
  - Query params: `userId` (required), `days` (optional, default: 7)

- `DELETE /api/v1/calendar/disconnect`
  - Disconnect user's calendar
  - Body: `{ userId: string }`

- `GET /api/v1/calendar/status?userId=<userId>`
  - Get calendar connection status

## Troubleshooting

### Issue: "Failed to acquire token"

**Causes:**
- Invalid client ID or secret
- Redirect URI mismatch
- Missing API permissions

**Solutions:**
1. Verify your Azure AD app credentials in `.env`
2. Ensure redirect URI in Azure matches exactly (including http/https)
3. Check that API permissions are granted and admin consent is provided

### Issue: "No valid tokens found"

**Causes:**
- User hasn't connected their calendar
- Tokens expired and refresh failed
- Encryption key changed

**Solutions:**
1. Reconnect the calendar via the UI
2. Check that `ENCRYPTION_KEY` hasn't changed
3. Verify refresh token is still valid in Airtable

### Issue: "Calendar not syncing automatically"

**Causes:**
- Scheduled jobs not enabled
- Redis not running
- Cron schedule invalid

**Solutions:**
1. Check that `ENABLE_SCHEDULED_JOBS` is not set to `false`
2. Verify Redis is running: `redis-cli ping` (should return "PONG")
3. Check API logs for scheduler initialization messages
4. Verify cron schedule format: `0 * * * *` (every hour)

### Issue: "Events not appearing in UI"

**Causes:**
- Events are outside the date range
- Airtable query filtering events
- Frontend API URL misconfigured

**Solutions:**
1. Check the `days` parameter in the API call (default: 7 days)
2. Verify events exist in Airtable Calendar Events table
3. Check browser console for API errors
4. Verify `NEXT_PUBLIC_API_URL` is correct

## Security Best Practices

1. **Never commit secrets to git**
   - Use `.env` files (already in `.gitignore`)
   - Use environment variables in production

2. **Rotate client secrets regularly**
   - Azure AD secrets expire after 24 months
   - Set calendar reminder to rotate before expiration

3. **Use strong encryption key**
   - Minimum 32 characters
   - Use random, cryptographically secure key
   - Never reuse across environments

4. **Enable HTTPS in production**
   - OAuth requires secure redirect URIs
   - Use SSL/TLS certificates

5. **Restrict API permissions**
   - Only request `Calendars.Read` (not write)
   - Don't request unnecessary scopes

## Advanced Configuration

### Custom Sync Interval

To change the sync frequency, update the cron schedule:

```bash
# Every 30 minutes
CALENDAR_SYNC_SCHEDULE=*/30 * * * *

# Every 6 hours
CALENDAR_SYNC_SCHEDULE=0 */6 * * *

# Daily at 9 AM
CALENDAR_SYNC_SCHEDULE=0 9 * * *

# Weekdays only, every hour
CALENDAR_SYNC_SCHEDULE=0 * * * 1-5
```

### Sync More Days Ahead

To sync more than 30 days of events:

```typescript
// In calendar.service.ts, update the default parameter:
async syncCalendarEvents(
  userId: string,
  accessToken: string,
  daysAhead: number = 90  // Changed from 30 to 90
): Promise<SyncResult>
```

### Multi-Calendar Support

To sync multiple calendars per user, modify the Graph API call:

```typescript
// Fetch from specific calendar
const response = await graphClient
  .api(`/me/calendars/${calendarId}/events`)
  .select([...])
  .get()
```

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review API logs for detailed error messages
3. Verify Airtable schema matches the documentation
4. Ensure all environment variables are set correctly

## Next Steps

Once calendar integration is working:
1. Consider adding calendar event creation from action items
2. Link calendar events to existing meetings in Airtable
3. Add notifications for upcoming meetings
4. Build calendar view in the dashboard
5. Implement meeting preparation emails with calendar context
