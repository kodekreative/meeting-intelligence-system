# Create Users Table in Airtable

## Step 1: Create the Table

1. Go to your Airtable base
2. Click **"Add or import"** → **"Create empty table"**
3. Name it: **Users**

## Step 2: Create Fields

The table will have a default "Name" field. Rename it and add others:

### Rename "Name" to "Full Name"
1. Click on "Name" column header
2. Click "Customize field type"
3. Change name to: **Full Name**
4. Click **Save**

### Add These Fields:

Click the **+** button to add each field:

| # | Field Name | Field Type | Options |
|---|------------|-----------|---------|
| 2 | Email | Email | - |
| 3 | Is Active | Checkbox | - |
| 4 | iCalendar URL | Long text | - |
| 5 | Calendar Connected | Checkbox | - |
| 6 | Last Calendar Sync | Date | ✓ Include a time field |

## Step 3: Create Your User Record

Click **"Add record"** and fill in:

- **Full Name**: `Peter Schmitt`
- **Email**: `peter@converselyai.com`
- **Is Active**: ✓ (checked)
- **iCalendar URL**:
  ```
  https://outlook.office365.com/owa/calendar/de8758eb07184c479bd1b4940a8e9f9f@converselyai.com/f87c6f4b4aa3436c9b6da392774b57cd1206383154240992100/calendar.ics
  ```
- **Calendar Connected**: ✓ (checked)
- **Last Calendar Sync**: (leave empty for now)

## Step 4: Get Your Record ID

1. Click on your user record to expand it
2. Look at the URL in your browser
3. Find the part that starts with `rec` - this is your Record ID
4. It looks like: `recXXXXXXXXXXXXXX`
5. Copy it!

## Step 5: Update the Frontend Code

Open: `apps/web/app/(dashboard)/settings/calendar-simple/page.tsx`

Find line 24 and replace with your Record ID:

```typescript
const demoUserId = 'recYOUR_RECORD_ID_HERE'  // Paste your ID here!
```

Save the file.

## Step 6: Test It!

1. Make sure your servers are running:
   ```bash
   # Terminal 1
   cd apps/api && pnpm dev

   # Terminal 2
   cd apps/web && pnpm dev
   ```

2. Open: http://localhost:3000/settings/calendar-simple

3. You should see:
   - ✅ "Connected" status (green dot)
   - ✅ Your upcoming meetings listed

That's it! Your calendar is now connected and will sync automatically.

---

## Already Have the Table?

If you already created a Users table with an `iCalendar URL` field, just:

1. Paste your calendar URL into the field:
   ```
   https://outlook.office365.com/owa/calendar/de8758eb07184c479bd1b4940a8e9f9f@converselyai.com/f87c6f4b4aa3436c9b6da392774b57cd1206383154240992100/calendar.ics
   ```

2. Check the "Calendar Connected" box

3. Get your Record ID from the URL

4. Update line 24 in the frontend code

5. Reload the page!
