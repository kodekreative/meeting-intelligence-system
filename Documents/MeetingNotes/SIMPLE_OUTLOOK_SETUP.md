# Simple Outlook Calendar Setup - NO AZURE NEEDED

## Method: iCalendar URL (Read-Only, No OAuth)

This is the SIMPLEST way to connect your Outlook calendar. No Azure, no OAuth, just a URL.

### What You Need
- Your Outlook.com calendar
- 2 minutes

---

## Step 1: Get Your Outlook Calendar URL

### For Outlook.com / Microsoft 365:

1. Go to https://outlook.live.com/calendar

2. Click the **Settings** gear icon (top right)

3. Click **View all Outlook settings** at the bottom

4. Go to **Calendar** > **Shared calendars**

5. Under **Publish a calendar**, select your calendar from the dropdown

6. Click **Publish**

7. Under **ICS**, click **Can view all details**

8. Copy the **ICS link** - it looks like:
   ```
   https://outlook.live.com/owa/calendar/xxx@outlook.com/xxx/calendar.ics
   ```

---

## Step 2: Update Airtable

Add one new field to your Users table:

| Field Name | Field Type |
|------------|-----------|
| iCalendar URL | Long text |

---

## Step 3: Connect Your Calendar

### Option A: Using the API directly

```bash
curl -X POST http://localhost:3001/api/v1/icalendar/connect \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_AIRTABLE_USER_RECORD_ID",
    "icalUrl": "YOUR_ICS_URL_FROM_STEP_1"
  }'
```

### Option B: Using the simple web interface

I can create a simple form for you where you just paste the URL and click Connect.

---

## Step 4: Test

Get your upcoming meetings:

```bash
curl "http://localhost:3001/api/v1/icalendar/events?userId=YOUR_USER_ID&days=7"
```

You should see your calendar events!

---

## Limitations

This method is:
- ✅ **Super simple** - no Azure, no OAuth
- ✅ **Works immediately** - just paste URL
- ✅ **Reliable** - standard iCalendar format
- ⚠️ **Read-only** - can't create/edit events (perfect for your use case!)
- ⚠️ **Delayed** - may take 30-60 minutes for Outlook to update the iCal URL after changes

---

## Automatic Syncing

To enable automatic syncing, I'll update the scheduler to check iCal URLs hourly.

---

## Want a UI for this?

I can quickly create a simple web page where you:
1. Paste your iCal URL
2. Click "Connect"
3. See your upcoming meetings

Let me know if you want me to build that!

---

## Troubleshooting

### "Failed to fetch calendar"
- Make sure the URL starts with `https://outlook.live.com/owa/calendar/`
- The calendar must be published (see Step 1.6)
- Try opening the URL in your browser - it should download a `.ics` file

### "No events found"
- Check if you have meetings in the next 30 days
- The iCal URL updates every 30-60 minutes, so recent changes may not appear yet

---

## This is WAY simpler than Azure!

No app registration, no OAuth, no permissions, no secrets. Just a URL.
