# Minimal Airtable Setup for Calendar

## Users Table (3 fields)

1. Click **Add or import** → **Create empty table**
2. Name it: **Users**
3. Rename "Name" field to **Full Name**
4. Add these 2 fields:

| Field Name | Field Type |
|------------|-----------|
| iCalendar URL | Long text |
| Calendar Connected | Checkbox |

**Create your record:**
- **Full Name**: `Peter Schmitt`
- **iCalendar URL**: (leave empty - we'll add via API)
- **Calendar Connected**: (leave unchecked)

**Get your Record ID**: Click the record → look at URL → copy the `recXXXXXXXXXXXXXX`

---

## Calendar Events Table (5 fields)

1. Create table: **Calendar Events**
2. Rename "Name" to **Calendar Event ID**
3. Add these 4 fields:

| Field Name | Field Type | Options |
|------------|-----------|---------|
| Subject | Single line text | - |
| Start Time | Date | ✓ Include time |
| End Time | Date | ✓ Include time |
| User | Link to another record | Link to Users table |

Done! Just 3 + 5 = 8 fields total.

---

## Quick Test

Once you have your User Record ID, run:

```bash
cd apps/api

# This will populate your calendar URL
pnpm exec tsx scripts/add-calendar-url.ts
```

It will:
1. Find your user record
2. Add your calendar URL
3. Set Calendar Connected to true
4. Give you your Record ID

Then update line 24 in `apps/web/app/(dashboard)/settings/calendar-simple/page.tsx` with that Record ID.

---

## Start & Test

```bash
# Terminal 1
cd apps/api && pnpm dev

# Terminal 2
cd apps/web && pnpm dev

# Open browser
http://localhost:3000/settings/calendar-simple
```

You should see your meetings!

---

## Why So Minimal?

The code will still work perfectly with just these fields. Everything else (Location, Attendees, Description, Email, Last Sync, etc.) is stored but not required. They make the UI nicer but aren't needed for basic functionality.

You can always add more fields later as you need them!
