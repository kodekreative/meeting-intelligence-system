# Connect Your Calendar RIGHT NOW

You have your iCal URL! Let's connect it.

## Your Calendar URL:
```
https://outlook.office365.com/owa/calendar/de8758eb07184c479bd1b4940a8e9f9f@converselyai.com/f87c6f4b4aa3436c9b6da392774b57cd1206383154240992100/calendar.ics
```

---

## Step 1: Add Airtable Field (if not done yet)

Go to your Airtable **Users** table and add this field:

- **Field Name**: `iCalendar URL`
- **Type**: Long text
- Click **Create field**

---

## Step 2: Get Your User Record ID

1. Go to your Airtable Users table
2. Open your user record (Peter Schmitt / peter@converselyai.com)
3. Look at the URL - it will have something like `recXXXXXXXXXXXXXX`
4. Copy that Record ID

---

## Step 3: Update the Code

Open this file:
```
apps/web/app/(dashboard)/settings/calendar-simple/page.tsx
```

Find line 24 and replace with YOUR record ID:
```typescript
const demoUserId = 'recYOUR_ACTUAL_RECORD_ID_HERE' // Replace this!
```

---

## Step 4: Start Servers

```bash
# Terminal 1
cd apps/api
pnpm dev

# Terminal 2
cd apps/web
pnpm dev
```

---

## Step 5: Connect!

1. Open: http://localhost:3000/settings/calendar-simple

2. Paste this URL in the text box:
   ```
   https://outlook.office365.com/owa/calendar/de8758eb07184c479bd1b4940a8e9f9f@converselyai.com/f87c6f4b4aa3436c9b6da392774b57cd1206383154240992100/calendar.ics
   ```

3. Click **"Connect Calendar"**

4. Done! Your meetings should appear!

---

## Or Use API Directly

Once you have your User Record ID, you can also connect via API:

```bash
curl -X POST http://localhost:3001/api/v1/icalendar/connect \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_USER_RECORD_ID",
    "icalUrl": "https://outlook.office365.com/owa/calendar/de8758eb07184c479bd1b4940a8e9f9f@converselyai.com/f87c6f4b4aa3436c9b6da392774b57cd1206383154240992100/calendar.ics"
  }'
```

---

## What You'll See

- ✅ "Calendar connected!" success message
- ✅ Number of events synced
- ✅ List of upcoming meetings in the next 7 days
- ✅ Green "Connected" status

---

## Need Your User Record ID?

Tell me and I can help you find it in Airtable!
