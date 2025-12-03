# 🚀 Start Here - Calendar Integration Setup

## What You're Setting Up

You're connecting your Outlook/Exchange calendar so your Meeting Intelligence System can:
- See your upcoming meetings
- Display them in the dashboard
- Sync automatically every hour

**Time needed:** 10-15 minutes

---

## Step-by-Step Guide

### 1️⃣ Azure Portal Setup (5 minutes)

**Go to:** https://portal.azure.com (opens in new tab)

You'll see a search bar at the top. Type: **app registrations**

Click on **App registrations** in the dropdown.

Click the **+ New registration** button (blue button at top).

Fill in the form:
```
Name: Meeting Intelligence Calendar Sync

Supported account types:
  Select: "Accounts in any organizational directory and personal Microsoft accounts"

Redirect URI:
  Platform: Web
  URL: http://localhost:3001/api/v1/auth/callback
```

Click **Register** (blue button at bottom).

---

### 2️⃣ Copy Your Credentials

You'll see an "Overview" page with important information.

**Find and copy these TWO values:**

1. **Application (client) ID**
   - Long string like: `12345678-1234-1234-1234-123456789abc`
   - Copy this entire string

2. **Directory (tenant) ID**
   - Another long string
   - Copy this too (but we'll use "common" instead)

**Keep these safe** - you'll need them in a minute.

---

### 3️⃣ Create a Secret

In the left sidebar, click **Certificates & secrets**.

Click the **+ New client secret** button.

Fill in:
```
Description: Calendar Sync Secret
Expires: 24 months
```

Click **Add**.

**⚠️ IMPORTANT:** You'll see a new secret appear with a "Value" column.

**COPY THE VALUE IMMEDIATELY** - you can only see it once!
- It looks like: `abc123~xxxxxxxxxxxxxxxxxxxxxxxxxxx`
- Don't copy the "Secret ID" - copy the "Value"

---

### 4️⃣ Add Permissions

In the left sidebar, click **API permissions**.

Click **+ Add a permission**.

Click **Microsoft Graph** (big blue tile).

Click **Delegated permissions**.

In the search box, type: **calendars**

Expand the **Calendars** section and check:
- ✅ **Calendars.Read**

In the search box, type: **offline**

Check:
- ✅ **offline_access**

Click **Add permissions** (blue button at bottom).

**Optional:** If you see a button "Grant admin consent for...", click it.

---

### 5️⃣ Update Your .env File

Open your `.env` file in the project root:
```bash
code .env
```

Find these lines (around line 38):
```bash
MICROSOFT_CLIENT_ID=your_azure_ad_client_id_here
MICROSOFT_CLIENT_SECRET=your_azure_ad_client_secret_here
```

Replace with YOUR values:
```bash
MICROSOFT_CLIENT_ID=paste_your_application_client_id_here
MICROSOFT_CLIENT_SECRET=paste_your_secret_value_here
```

**Save the file** (Cmd+S or Ctrl+S).

---

### 6️⃣ Setup Airtable Tables

**Open your Airtable base** in browser.

#### A. Update Users Table

Go to your **Users** table.

Click the **+** button to add new fields. Add these 5 fields:

1. **Microsoft Access Token**
   - Type: Long text
   - Click Create

2. **Microsoft Refresh Token**
   - Type: Long text
   - Click Create

3. **Microsoft Token Expires At**
   - Type: Date
   - ✅ Include a time field
   - Click Create

4. **Calendar Connected**
   - Type: Checkbox
   - Click Create

5. **Last Calendar Sync**
   - Type: Date
   - ✅ Include a time field
   - Click Create

#### B. Create Calendar Events Table

Click **Add or import** > **Create empty table**.

Name it: **Calendar Events**

The first field will be "Name" - **rename it to "Calendar Event ID"**.

Add these fields (click + button for each):

| Name | Type | Options |
|------|------|---------|
| Subject | Single line text | - |
| Start Time | Date | ✅ Include time |
| End Time | Date | ✅ Include time |
| Location | Single line text | - |
| Attendees | Long text | - |
| Organizer | Email | - |
| Description | Long text | - |
| Is Online Meeting | Checkbox | - |
| Meeting URL | URL | - |
| User | Link to another record | Link to Users table |
| Last Synced | Date | ✅ Include time |

#### C. Get Your User Record ID

Go back to **Users** table.

Click on your user record (or create one if you don't have one).

Look at the URL in your browser. It will look like:
```
https://airtable.com/appXXXX/tblYYYY/viwZZZZ/recABC123XYZ456
                                                 ^^^^^^^^^^^^^^
                                                 This is your Record ID
```

**Copy the part that starts with `rec`** - this is your User Record ID.

---

### 7️⃣ Start Your Application

Open two terminal windows:

**Terminal 1 - API Server:**
```bash
cd /Users/peterschmitt/Documents/MeetingNotes/apps/api
pnpm dev
```

Wait until you see: `🚀 Meeting Intelligence API Server`

**Terminal 2 - Web App:**
```bash
cd /Users/peterschmitt/Documents/MeetingNotes/apps/web
pnpm dev
```

Wait until you see: `Ready on http://localhost:3000`

---

### 8️⃣ Connect Your Calendar

**Open your browser:** http://localhost:3000/settings/calendar

You should see a page titled "Calendar Settings".

**IMPORTANT BEFORE CLICKING "CONNECT":**

We need to update the user ID in the code. Open this file:
```
apps/web/app/(dashboard)/settings/calendar/page.tsx
```

Find line 42 (around there):
```typescript
const demoUserId = 'rec123456789' // Replace with actual user ID from auth
```

Replace `rec123456789` with YOUR User Record ID from step 6C:
```typescript
const demoUserId = 'recYOUR_ACTUAL_RECORD_ID' // Your real ID here
```

Save the file. The web app will automatically reload.

**Now click "Connect Calendar"**.

You'll be redirected to Microsoft login:
1. Sign in with your Microsoft/Outlook account
2. You'll see permission request - click **Accept**
3. You'll be redirected back to your app

You should see:
- ✅ Status: **Connected**
- ✅ A green success message
- ✅ Your upcoming meetings listed below

---

### 9️⃣ Verify Everything Works

**Check 1: Web UI**
- Status shows "Connected" with green dot
- Upcoming meetings are displayed

**Check 2: Airtable**
- Go to Calendar Events table
- You should see your meetings synced there

**Check 3: API Logs**
- Look at Terminal 1
- Should see: "Calendar connected for user recXXX, synced N events"

---

## ✅ Done!

If you see all three checks above, you're all set! 🎉

Your calendar will now:
- Sync automatically every hour
- Show upcoming meetings in the dashboard
- Store events in Airtable

---

## 🆘 Troubleshooting

### "Redirect URI mismatch" error
**Fix:** Go back to Azure Portal > Your App > Authentication
- Make sure redirect URI is EXACTLY: `http://localhost:3001/api/v1/auth/callback`

### "Invalid client secret" error
**Fix:**
- Go to Azure Portal > Your App > Certificates & secrets
- Create a new secret
- Copy the Value
- Update .env file

### Calendar connected but no events show
**Fix:**
1. Make sure you have meetings in your Outlook calendar in next 7 days
2. Click "Sync Now" button
3. Check API logs (Terminal 1) for errors
4. Verify events appear in Airtable Calendar Events table

### "No valid tokens found" error
**Fix:**
- Make sure you updated the `demoUserId` in step 8
- Use the actual Record ID from your Airtable Users table

---

## 📚 Additional Resources

- **Detailed Azure Guide:** `AZURE_SETUP_QUICKSTART.md`
- **Complete Documentation:** `CALENDAR_SETUP.md`
- **Checklist:** `AZURE_CHECKLIST.md`

---

## Need Help?

Check the troubleshooting section in `CALENDAR_SETUP.md` for more detailed error solutions.
