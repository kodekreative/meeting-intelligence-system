# The EASY Way - Outlook Calendar Without Azure

## What I Just Built For You

A **super simple** Outlook calendar connection that requires:
- ❌ NO Azure Portal
- ❌ NO OAuth
- ❌ NO App Registration
- ❌ NO Client Secrets
- ✅ Just paste a URL and you're done!

---

## How to Set It Up (5 Minutes Total)

### Step 1: Get Your Outlook Calendar URL (2 min)

1. **Go to**: https://outlook.live.com/calendar

2. **Click** the Settings gear icon (top right)

3. **Click** "View all Outlook settings"

4. **Go to**: Calendar → Shared calendars

5. **Select** your calendar from the dropdown

6. **Click** "Publish"

7. **Under** "ICS", click the link quality you want (recommended: "Can view all details")

8. **Copy** the ICS link - looks like:
   ```
   https://outlook.live.com/owa/calendar/yourname@outlook.com/xxx/calendar.ics
   ```

### Step 2: Update Airtable (1 min)

In your **Users** table, add ONE new field:

- **Field Name**: `iCalendar URL`
- **Type**: Long text
- Click Create

(You can skip the Microsoft token fields from the Azure setup - you don't need them!)

### Step 3: Connect (2 min)

Run this command (replace with your values):

```bash
curl -X POST http://localhost:3001/api/v1/icalendar/connect \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_AIRTABLE_USER_RECORD_ID",
    "icalUrl": "YOUR_ICS_URL_FROM_STEP_1"
  }'
```

**That's it!** Your calendar is connected.

---

## Test It

Get your upcoming meetings:

```bash
curl "http://localhost:3001/api/v1/icalendar/events?userId=YOUR_USER_ID&days=7"
```

You should see all your meetings!

---

## API Endpoints

All the same endpoints work, just use `/icalendar` instead of `/calendar`:

- **Connect**: `POST /api/v1/icalendar/connect`
- **Sync**: `POST /api/v1/icalendar/sync`
- **Get Events**: `GET /api/v1/icalendar/events?userId=X&days=7`
- **Disconnect**: `DELETE /api/v1/icalendar/disconnect`
- **Status**: `GET /api/v1/icalendar/status?userId=X`

---

## Pros & Cons

### ✅ Pros:
- **Incredibly simple** - no Azure complexity
- **Works immediately** - no waiting for OAuth approval
- **Reliable** - standard iCalendar format
- **Perfect for read-only** - which is what you need!
- **No token expiration** - URL doesn't expire

### ⚠️ Limitations:
- **Read-only** - can't create/edit calendar events (but you don't need to)
- **30-60 min delay** - Outlook updates the iCal feed every 30-60 minutes
- **Public URL** - anyone with the URL can view your calendar (keep it secret!)

---

## Want a UI?

I can quickly build a simple web page where you:
1. Paste your iCal URL into a text box
2. Click "Connect Calendar"
3. See your upcoming meetings

Want me to create that? It'll take 5 minutes.

---

## Already Have the Azure Calendar Setup?

No problem! Both methods can coexist. You can use:
- `/api/v1/calendar/*` for OAuth/Azure method
- `/api/v1/icalendar/*` for this simple iCal method

---

## Quick Start

1. Get your ICS URL from Outlook.com (see Step 1 above)
2. Add `iCalendar URL` field to Airtable Users table
3. Run the connect command with your URL
4. Done!

Much easier than Azure, right? 😊
