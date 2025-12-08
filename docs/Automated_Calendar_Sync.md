# Automated Calendar Sync

## Overview

The system automatically syncs all user calendars every morning at 7:00 AM Eastern Time. This ensures your calendar events, including recurring meetings, are always up-to-date.

## Configuration

### Default Schedule

**When**: Every day at 7:00 AM
**Timezone**: America/New_York (Eastern Time)
**What**: Syncs all users with `Calendar Connected = TRUE` and an `iCalendar URL` configured

### Custom Schedule

You can customize the sync schedule by setting the `ICALENDAR_SYNC_SCHEDULE` environment variable in `.env`:

```bash
# Examples:
ICALENDAR_SYNC_SCHEDULE=0 7 * * *      # 7:00 AM daily (default)
ICALENDAR_SYNC_SCHEDULE=0 */4 * * *    # Every 4 hours
ICALENDAR_SYNC_SCHEDULE=0 8 * * 1-5    # 8:00 AM Monday-Friday only
ICALENDAR_SYNC_SCHEDULE=*/30 * * * *   # Every 30 minutes
```

### Cron Format

```
* * * * *
│ │ │ │ │
│ │ │ │ └─ Day of week (0-7, 0 and 7 = Sunday)
│ │ │ └─── Month (1-12)
│ │ └───── Day of month (1-31)
│ └─────── Hour (0-23)
└───────── Minute (0-59)
```

### Timezone

Change the timezone by setting:

```bash
TIMEZONE=America/Los_Angeles  # Pacific Time
TIMEZONE=America/Chicago      # Central Time
TIMEZONE=America/Denver       # Mountain Time
TIMEZONE=America/New_York     # Eastern Time (default)
```

## How It Works

### Every Morning at 7:00 AM

1. **Find Users**: Queries Airtable for all users with:
   - `Calendar Connected` = TRUE
   - `iCalendar URL` field populated

2. **Sync Each Calendar**:
   - Fetches the iCalendar feed from the URL
   - Parses events and expands recurring meetings (next 90 days)
   - Updates or creates events in Airtable
   - Logs results

3. **Summary**: Logs total users synced, events processed, and any errors

### What Gets Synced

- **All calendar events** from the published calendar
- **Recurring meeting instances** for the next 90 days
- **Meeting details**: Subject, start/end time, location, attendees, description
- **Updates**: Changes to existing meetings are reflected

## Monitoring

### View Sync Status

Check the API logs to see sync results:

```bash
# From the project root
tail -f apps/api/logs/*.log | grep "iCalendar sync"
```

Or check the console output where the API server is running.

### Successful Sync Output

```
[info]: Running iCalendar sync job...
[info]: Found 1 users with iCalendar configured
[info]: Synced iCalendar for user recJns5edTqex92I8: 55 events (51 created, 4 updated)
[info]: iCalendar sync completed: 1 succeeded, 0 failed, 55 total events synced
[info]: ✓ iCalendar sync job completed
```

### Error Handling

If a sync fails for a user:
- The error is logged
- Other users continue to sync
- The job completes and reports success/failure counts

## Manual Sync

### Via Web Interface

Visit `http://localhost:3000/settings/calendar-simple` and click **"Sync Now"**

### Via API

```bash
curl -X POST http://localhost:3001/api/v1/icalendar/sync \
  -H "Content-Type: application/json" \
  -d '{"userId": "recJns5edTqex92I8"}'
```

### Via Code

```typescript
import { icalendarService } from './services/icalendar.service.js'

const userId = 'recJns5edTqex92I8'
const icalUrl = 'https://outlook.office365.com/owa/calendar/...'
const result = await icalendarService.syncFromICalURL(userId, icalUrl)
```

## Multi-User Support

The automated sync works for **multiple users**:

1. Each user adds their iCalendar URL to their Airtable record
2. Checks the `Calendar Connected` checkbox
3. The scheduler automatically syncs all configured users

### Adding a New User

1. **Create User Record** in Airtable Users table
2. **Add Fields**:
   - `iCalendar URL`: The user's Outlook calendar ICS URL
   - `Calendar Connected`: Check the box
3. **Wait for Next Sync**: Or manually trigger sync

The scheduler will automatically pick up the new user on the next run.

## Performance

### Sync Time

- **Single user**: ~5-15 seconds for 400+ events
- **Multiple users**: Processes sequentially
- **Recurring expansion**: Adds ~1-2 seconds per recurring series

### Resource Usage

- **Network**: Downloads ICS file once per user (~100KB-1MB)
- **CPU**: Minimal (RRULE parsing is fast)
- **Database**: Only updates changed events (efficient)

### Scaling

- **1-10 users**: Completes in < 1 minute
- **10-50 users**: Completes in 1-5 minutes
- **50+ users**: Consider splitting into batches or increasing frequency

## Troubleshooting

### Sync Not Running

**Check**:
1. API server is running
2. Scheduler initialized (look for log: "✓ Scheduled iCalendar sync")
3. Current time matches schedule (7:00 AM ET by default)

**Test manually**:
```bash
curl -X POST http://localhost:3001/api/v1/icalendar/sync \
  -H "Content-Type: application/json" \
  -d '{"userId": "YOUR_USER_ID"}'
```

### No Events Synced

**Check**:
1. User has `Calendar Connected` = TRUE
2. User has `iCalendar URL` populated
3. iCalendar URL is accessible: `curl {url}` returns ICS data
4. Events fall within next 90 days
5. Airtable has all required fields

### Sync Errors

**Common Issues**:
- **Missing Airtable fields**: Add required fields (see Calendar_Integration.md)
- **Invalid iCalendar URL**: Verify URL is correct and accessible
- **Network timeout**: iCalendar feed may be slow or unreachable
- **RRULE parsing errors**: Some complex recurrence rules may fail

**Check logs** for specific error messages.

## Disabling Automated Sync

To disable the automated sync:

1. **Option 1**: Comment out in code
   ```typescript
   // In apps/api/src/services/scheduler.service.ts line ~32
   // this.scheduleICalendarSync()
   ```

2. **Option 2**: Set invalid schedule
   ```bash
   # In .env
   ICALENDAR_SYNC_SCHEDULE=0 0 31 2 *  # Feb 31 (never runs)
   ```

3. **Option 3**: Uncheck `Calendar Connected` for all users

## Advanced Configuration

### Different Schedules for Different Users

Currently not supported. All users sync on the same schedule.

**Workaround**:
- Create separate API instances with different schedules
- Use manual sync API calls with your own scheduling logic

### Sync Specific Users Only

Modify the Airtable filter in `scheduler.service.ts`:

```typescript
const users = await airtable.findRecords('Users', {
  filterByFormula: `AND(
    {Calendar Connected} = TRUE(),
    LEN({iCalendar URL}) > 0,
    {Email} = "specific@user.com"
  )`,
})
```

### Custom Sync Logic

Create your own sync function:

```typescript
// Example: Sync only if last sync was > 6 hours ago
const now = new Date()
const lastSync = new Date(user.fields['Last Synced'])
const hoursSinceSync = (now - lastSync) / (1000 * 60 * 60)

if (hoursSinceSync > 6) {
  await icalendarService.syncFromICalURL(userId, icalUrl)
}
```

## Best Practices

### 1. Monitor First Week
- Check logs daily for the first week
- Ensure all users sync successfully
- Verify event counts are reasonable

### 2. Set Appropriate Frequency
- **Daily (7 AM)**: Recommended for most use cases
- **Every 4-6 hours**: If you need more real-time updates
- **Every 30 minutes**: Only if absolutely necessary (may hit rate limits)

### 3. Handle Errors Gracefully
- Errors for one user don't stop others
- Failed syncs are logged but don't crash the app
- Users can manually sync if automated sync fails

### 4. Keep iCalendar URLs Secret
- Don't commit URLs to git
- Store securely in Airtable
- Treat like passwords (anyone with URL can read calendar)

### 5. Regular Maintenance
- Review sync logs weekly
- Remove inactive users
- Update URLs if they change

## Related Documentation

- [Calendar_Integration.md](./Calendar_Integration.md) - Full calendar integration docs
- [.env](../.env) - Environment variables configuration
- [apps/api/src/services/scheduler.service.ts](../apps/api/src/services/scheduler.service.ts) - Scheduler implementation

## Summary

✅ **Automated**: Runs every morning at 7 AM ET
✅ **Multi-user**: Syncs all configured users automatically
✅ **Reliable**: Error handling ensures one failure doesn't stop others
✅ **Configurable**: Customize schedule and timezone
✅ **Monitored**: Logs provide visibility into sync results

Your calendars will stay up-to-date automatically without manual intervention!
