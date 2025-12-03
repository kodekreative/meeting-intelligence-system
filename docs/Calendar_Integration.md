# Calendar Integration Documentation

## Overview

The Meeting Intelligence System integrates with Outlook calendars using the **iCalendar (ICS) URL** approach. This integration syncs your calendar events, including recurring meetings, without requiring Azure AD or OAuth setup.

## How It Works

1. **iCalendar URL Publishing**: You publish your Outlook calendar as an iCalendar feed
2. **Recurring Event Expansion**: The system parses RRULE (recurrence rules) and generates individual instances
3. **Airtable Storage**: Events are stored in the Calendar Events table in Airtable
4. **API Access**: Events are accessible via REST API endpoints
5. **Web Dashboard**: View upcoming meetings in the web interface

## Setup Instructions

### Step 1: Publish Your Outlook Calendar

1. Go to https://outlook.office365.com/calendar
2. Click the **Settings** gear icon (top right)
3. Click **View all Outlook settings**
4. Navigate to **Calendar** → **Shared calendars**
5. Under **Publish a calendar**, select your calendar
6. Click **Publish**
7. Under **ICS**, click **Can view all details**
8. Copy the ICS URL (starts with `https://outlook.office365.com/owa/calendar/...`)

### Step 2: Add Airtable Fields

Add these fields to your **Calendar Events** table in Airtable:

| Field Name | Type | Options |
|------------|------|---------|
| Calendar Event ID | Single line text | Primary field |
| Subject | Single line text | - |
| Start Time | Date | Include time |
| End Time | Date | Include time |
| Location | Long text | - |
| Attendees | Long text | - |
| Organizer | Single line text | - |
| Description | Long text | - |
| Is Online Meeting | Checkbox | - |
| Meeting URL | URL | - |
| User | Link to another record | Link to Users table |
| Last Synced | Date | Include time |

### Step 3: Configure User Record

In your **Users** table in Airtable:

1. Add the `iCalendar URL` field (Long text)
2. Add the `Calendar Connected` field (Checkbox)
3. Paste your ICS URL into the `iCalendar URL` field
4. Check the `Calendar Connected` checkbox

### Step 4: Update Configuration

The system should already be configured with your User ID: `recJns5edTqex92I8`

To sync calendar events, the API will automatically use the iCalendar URL from your user record.

## Using the Calendar Integration

### Web Interface

Visit: `http://localhost:3000/settings/calendar-simple`

Features:
- **Connection Status**: Shows if your calendar is connected
- **Upcoming Meetings**: Displays meetings for the next 7 days
- **Sync Now**: Manually trigger a calendar sync
- **Disconnect**: Remove calendar connection

### API Endpoints

#### Check Connection Status
```bash
GET /api/v1/icalendar/status?userId={userId}
```

Response:
```json
{
  "success": true,
  "data": {
    "connected": true,
    "userId": "recJns5edTqex92I8"
  }
}
```

#### Sync Calendar Events
```bash
POST /api/v1/icalendar/sync
Content-Type: application/json

{
  "userId": "recJns5edTqex92I8"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "eventsSynced": 55,
    "eventsCreated": 51,
    "eventsUpdated": 4,
    "errors": []
  }
}
```

#### Get Upcoming Events
```bash
GET /api/v1/icalendar/events?userId={userId}&days=7
```

Response:
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "unique-event-id",
        "subject": "FW: True Choice Morning Huddle",
        "startTime": "2025-11-18T14:30:00.000Z",
        "endTime": "2025-11-18T15:30:00.000Z",
        "location": "Microsoft Teams Meeting",
        "attendees": [],
        "organizer": "organizer@example.com",
        "description": "Meeting description..."
      }
    ],
    "count": 1
  }
}
```

## Recurring Events

The system fully supports recurring meetings using the **rrule** library to parse RRULE specifications.

### How Recurring Events Work

1. **RRULE Parsing**: The iCalendar feed includes recurrence rules (e.g., `RRULE:FREQ=WEEKLY;BYDAY=MO`)
2. **Instance Generation**: The system generates individual instances for the next 90 days
3. **Unique IDs**: Each instance gets a unique ID: `{original-id}-{timestamp}`
4. **Automatic Updates**: When you sync, recurring instances are updated or created as needed

### Supported Recurrence Patterns

- **Daily**: Every day, every N days
- **Weekly**: Specific days of the week (e.g., every Monday)
- **Monthly**: Specific day of month or week pattern
- **Yearly**: Annual events
- **Custom**: Any valid RRULE specification

### Example RRULE

```
RRULE:FREQ=WEEKLY;UNTIL=20260629T180000Z;INTERVAL=1;BYDAY=MO;WKST=SU
```

This means: **Every Monday until June 29, 2026**

## Limitations

### 1. **Historical Event Window**
- **Limitation**: The system only generates recurring instances for the **next 90 days**
- **Impact**: Past recurring instances are not stored
- **Workaround**: Sync regularly to maintain current events
- **Reason**: Prevents database bloat from generating infinite historical instances

### 2. **Published Calendar Scope**
- **Limitation**: Only events from the **published calendar** are synced
- **Impact**: Events from other calendars (shared, delegated) may not appear
- **Workaround**: Publish each calendar separately and add them as different users
- **Reason**: Outlook's iCalendar publishing is per-calendar, not per-account

### 3. **Sync Frequency**
- **Limitation**: Changes in Outlook are not real-time
- **Impact**: Must manually sync or wait for scheduled sync to see updates
- **Workaround**: Use "Sync Now" button or set up automatic hourly sync
- **Reason**: iCalendar is a pull-based protocol, not push-based

### 4. **Meeting Updates**
- **Limitation**: Canceled meetings may still appear if not removed from the published feed
- **Impact**: Stale events might linger until next full sync
- **Workaround**: Sync regularly to get latest status
- **Reason**: iCalendar feeds don't have explicit "deleted" events

### 5. **Attendee Information**
- **Limitation**: Attendee details may be limited in the iCalendar feed
- **Impact**: May not see full attendee list or RSVP status
- **Workaround**: N/A - this is an Outlook publishing limitation
- **Reason**: Outlook may not include full attendee details in published feeds for privacy

### 6. **No Admin Access Required**
- **Benefit**: Works without Azure AD permissions
- **Trade-off**: Less real-time than Microsoft Graph API
- **Alternative**: For enterprise deployments with IT support, Microsoft Graph API provides superior integration

### 7. **Recurrence Modifications**
- **Limitation**: Modified instances of recurring events (exceptions) may not be handled perfectly
- **Impact**: If you change one instance of a recurring meeting, it might not reflect correctly
- **Workaround**: Treat modified instances as separate meetings
- **Reason**: iCalendar EXDATE handling is complex

### 8. **Timezone Handling**
- **Limitation**: All times are stored in UTC and converted based on the event's timezone
- **Impact**: May see slight discrepancies if Outlook and system timezones differ
- **Workaround**: Ensure consistent timezone configuration
- **Reason**: iCalendar uses VTIMEZONE definitions which can be complex

## Best Practices

### 1. Regular Syncing
- **Recommended**: Sync at least once per day
- **Method**: Enable automatic hourly sync (see below)
- **Benefit**: Ensures calendar stays up-to-date

### 2. Event ID Management
- Recurring event instances have IDs like: `{base-id}-{timestamp}`
- Non-recurring events use the original UID from Outlook
- Don't rely on IDs staying constant across syncs for recurring events

### 3. Manual Sync Before Important Views
- Always sync before viewing today's meetings
- Use the "Sync Now" button in the web interface
- Or call the sync API endpoint programmatically

### 4. Monitor Sync Errors
- Check the sync response for `errors` array
- Common errors: Missing Airtable fields, invalid event data
- Fix issues promptly to maintain data quality

## Enabling Automatic Sync

To enable automatic hourly calendar sync:

1. Open: `apps/api/src/services/scheduler.service.ts`
2. Find line ~30 (commented out):
```typescript
// this.scheduleCalendarSync()
```
3. Uncomment it:
```typescript
this.scheduleCalendarSync()
```
4. Restart the API server

This will sync all connected calendars every hour automatically.

## Troubleshooting

### Calendar Not Connecting

**Problem**: "Not Connected" status in UI

**Solutions**:
1. Verify iCalendar URL is correct in Airtable Users table
2. Check that `Calendar Connected` checkbox is checked
3. Test the URL directly: `curl {your-ics-url}` should return iCalendar data
4. Ensure User ID matches in frontend code

### No Events Showing

**Problem**: Calendar connected but no events appear

**Solutions**:
1. Click "Sync Now" to manually trigger sync
2. Check that events exist in the published calendar (visit Outlook web)
3. Verify the next 90 days have meetings (historical events aren't shown)
4. Check API logs for sync errors: `grep "Failed to save" logs`
5. Ensure all required Airtable fields exist (see Step 2)

### Recurring Meetings Missing

**Problem**: Some recurring meetings don't appear

**Solutions**:
1. Verify the event has an RRULE in the ICS feed: `curl {url} | grep -A5 "SUMMARY:Meeting Name"`
2. Check API logs for RRULE parsing warnings
3. Ensure the recurrence falls within the next 90 days
4. Re-sync to regenerate instances

### Sync Errors

**Problem**: Sync returns errors in the response

**Common Errors**:
- `Unknown field name: "Location"` → Add missing field to Airtable
- `Invalid date format` → Check event date/time data
- `User not found` → Verify User ID exists in Airtable

**Solution**: Read error messages and fix the underlying issue

## Technical Implementation

### Architecture

```
Outlook Calendar (iCalendar URL)
         ↓
    iCalendar Service
         ↓
    RRULE Expansion (rrule library)
         ↓
    Airtable Storage
         ↓
    REST API
         ↓
    Web Dashboard
```

### Key Dependencies

- **ical**: Parse iCalendar (.ics) format
- **rrule**: Parse and expand recurrence rules
- **node-fetch**: HTTP requests to fetch calendar feed
- **Airtable Client**: Store events in Airtable

### Data Flow

1. **Fetch**: Download ICS file from Outlook URL
2. **Parse**: Extract VEVENT entries and RRULE specifications
3. **Expand**: Generate individual instances for recurring events (next 90 days)
4. **Filter**: Only process events for connected users
5. **Store**: Upsert events to Airtable (create new or update existing)
6. **Serve**: API returns filtered events based on date range

### Performance Considerations

- **Sync Time**: ~5-15 seconds for 400+ events
- **Recurring Expansion**: Adds ~1-2 seconds per recurring series
- **Database Load**: Minimal - only updates changed events
- **API Response**: Sub-second for typical queries (7-day window)

## Comparison with Microsoft Graph API

| Feature | iCalendar Approach | Microsoft Graph API |
|---------|-------------------|---------------------|
| **Setup Complexity** | Easy (just URL) | Complex (Azure AD required) |
| **Admin Permissions** | None required | Requires IT admin access |
| **Real-time Updates** | No (pull-based) | Yes (webhooks available) |
| **Recurring Events** | Full support via RRULE | Full support |
| **Attendee Details** | Limited | Complete |
| **RSVP Status** | Not available | Available |
| **Calendar Types** | Published calendars only | All calendars |
| **Rate Limits** | None (your own URL) | Microsoft API limits |
| **Authentication** | None | OAuth 2.0 required |
| **Best For** | Individual users, no IT access | Enterprise deployments |

## Security Considerations

1. **iCalendar URL Security**
   - The URL is publicly accessible if shared
   - Anyone with the URL can read your calendar
   - Don't share the URL publicly
   - Outlook provides options to unpublish/regenerate URLs

2. **Data Storage**
   - Events stored in Airtable (check Airtable security settings)
   - No sensitive authentication credentials stored
   - Event data includes meeting titles, times, locations

3. **Access Control**
   - Implement user authentication in production
   - Currently uses hardcoded User ID (development only)
   - Add proper access controls before production deployment

## Future Enhancements

### Potential Improvements

1. **Webhook Support**: Real-time updates if Outlook adds webhook support
2. **Multi-Calendar**: Support multiple calendars per user
3. **Conflict Detection**: Detect scheduling conflicts
4. **Meeting Analytics**: Track meeting patterns and time usage
5. **AI Integration**: Automatic meeting summaries and action items
6. **Mobile App**: Native mobile calendar view
7. **Calendar Write**: Create/update meetings (requires different approach)

### Known Issues

- **Large Calendars**: Calendars with 1000+ events may be slow to sync
- **Timezone Edge Cases**: Some complex timezone scenarios may have discrepancies
- **Modified Recurrences**: EXDATE handling for modified recurring instances is basic

## Support

For issues or questions:
1. Check the Troubleshooting section above
2. Review API logs for detailed error messages
3. Verify Airtable field configuration
4. Test the iCalendar URL directly with curl

## Version History

- **v1.0** (2025-11-17): Initial implementation with iCalendar support
- **v1.1** (2025-11-17): Added recurring event support via RRULE parsing
