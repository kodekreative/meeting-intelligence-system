# Add Calendar Fields to Existing Users Table

## Step 1: Add 2 Fields to Users Table

Go to your existing Users table in Airtable and add these fields:

1. Click the **+** button to add a field
2. **Field Name**: `iCalendar URL`
   - **Type**: Long text
   - Click **Create field**

3. Click **+** again
4. **Field Name**: `Calendar Connected`
   - **Type**: Checkbox
   - Click **Create field**

Done! Your Users table now has calendar support.

---

## Step 2: Create Calendar Events Table

1. Click **Add or import** → **Create empty table**
2. Name: **Calendar Events**
3. Rename the default "Name" field to: **Calendar Event ID**
4. Add these 4 fields:

| # | Field Name | Type | Options |
|---|------------|------|---------|
| 2 | Subject | Single line text | - |
| 3 | Start Time | Date | ✓ Include time |
| 4 | End Time | Date | ✓ Include time |
| 5 | User | Link to another record | Link to "Users" table |

---

## Step 3: Run the Setup Script

This will automatically add your calendar URL to your user record:

```bash
cd apps/api
pnpm exec tsx scripts/add-calendar-url.ts
```

The script will:
- ✅ Find your existing user in the Users table
- ✅ Add your calendar URL to the `iCalendar URL` field
- ✅ Set `Calendar Connected` to true
- ✅ Show you your User Record ID

**Copy the Record ID** it shows you (starts with `rec`)

---

## Step 4: Update Frontend Code

Open: `apps/web/app/(dashboard)/settings/calendar-simple/page.tsx`

Line 24, replace with your Record ID:
```typescript
const demoUserId = 'recYOUR_ID_HERE'  // Paste the ID from Step 3
```

Save the file.

---

## Step 5: Start & Test

```bash
# Terminal 1 - API
cd apps/api
pnpm dev

# Terminal 2 - Web
cd apps/web
pnpm dev
```

Open browser: **http://localhost:3000/settings/calendar-simple**

You should see:
- ✅ "Connected" status
- ✅ Your upcoming meetings

Done! 🎉

---

## If the Script Fails

If the script can't find your Users table or user, just manually:

1. Go to your Users table in Airtable
2. Find your user record
3. Paste this in the `iCalendar URL` field:
   ```
   https://outlook.office365.com/owa/calendar/de8758eb07184c479bd1b4940a8e9f9f@converselyai.com/f87c6f4b4aa3436c9b6da392774b57cd1206383154240992100/calendar.ics
   ```
4. Check the `Calendar Connected` box
5. Click on the record → copy the `recXXXXX` from the URL
6. Update the frontend code (Step 4)
7. Start the servers (Step 5)

That's it!
