# Quick Start - Connect Outlook Calendar (2 Minutes!)

## What You're Doing
Connecting your Outlook calendar without any Azure setup - just paste a URL!

---

## Step 1: Add Airtable Field (30 seconds)

In your Airtable **Users** table, add ONE field:

- **Field Name**: `iCalendar URL`
- **Field Type**: Long text
- Click **Create field**

Done with Airtable!

---

## Step 2: Start Your Servers

```bash
# Terminal 1 - API
cd apps/api
pnpm dev

# Terminal 2 - Web
cd apps/web
pnpm dev
```

---

## Step 3: Connect Your Calendar

### Option A: Use the Web UI (Easiest!)

1. Open browser: **http://localhost:3000/settings/calendar-simple**

2. Click **"Show Instructions"** - it will walk you through getting your Outlook URL

3. Paste the URL in the box

4. Click **"Connect Calendar"**

5. Done! Your meetings will appear instantly.

### Option B: Manual Steps

1. **Get Your Outlook iCal URL**:
   - Go to https://outlook.live.com/calendar
   - Settings → View all Outlook settings
   - Calendar → Shared calendars
   - Publish calendar → Copy ICS link

2. **Update User Record ID**:
   - Open: `apps/web/app/(dashboard)/settings/calendar-simple/page.tsx`
   - Line 24: Change `'rec123456789'` to your actual Airtable User Record ID
   - Save file

3. **Open the page**: http://localhost:3000/settings/calendar-simple

4. **Paste URL and click Connect**

---

## That's It!

You should now see:
- ✅ "Connected" status with green dot
- ✅ Your upcoming meetings listed below
- ✅ Events in Airtable Calendar Events table

---

## What You Get

- **Automatic sync** every hour (I can add this if you want)
- **No Azure** - no complexity
- **No OAuth** - no token expiration
- **Simple** - just a URL

---

## Navigation

The calendar page is in your sidebar as **"Calendar (Simple)"**

---

## Need Help?

Check `EASY_CALENDAR_SETUP.md` for detailed instructions and troubleshooting.

---

## Update Your User ID

Before using, update the user ID in the calendar page:

1. Get your User Record ID from Airtable (starts with `rec`)
2. Open: `apps/web/app/(dashboard)/settings/calendar-simple/page.tsx`
3. Line 24: `const demoUserId = 'YOUR_ACTUAL_RECORD_ID'`
4. Save and reload the page

Or I can help you implement proper authentication if you want!
