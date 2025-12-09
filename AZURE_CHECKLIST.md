# Azure Calendar Integration Checklist

## ✅ Pre-Setup (Already Done)
- [x] Calendar integration code implemented
- [x] Encryption key generated and added to .env
- [x] Redirect URI fixed in .env
- [x] NEXT_PUBLIC_APP_URL added to .env

## 📋 Azure Portal Setup (Do This Now)

### Step 1: Register Application
- [ ] Go to https://portal.azure.com
- [ ] Sign in with your Microsoft account
- [ ] Search for "App registrations"
- [ ] Click "New registration"
- [ ] Fill in details:
  ```
  Name: Meeting Intelligence Calendar Sync
  Account types: Any organizational directory and personal Microsoft accounts
  Redirect URI: http://localhost:3001/api/v1/auth/callback
  ```
- [ ] Click "Register"

### Step 2: Get Client ID and Tenant ID
- [ ] On the Overview page, copy these values:
  - [ ] Application (client) ID: `________________________________`
  - [ ] Directory (tenant) ID: `________________________________`

### Step 3: Create Client Secret
- [ ] Click "Certificates & secrets" in left sidebar
- [ ] Click "New client secret"
- [ ] Description: `Calendar Sync Secret`
- [ ] Expires: `24 months`
- [ ] Click "Add"
- [ ] **IMMEDIATELY** copy the Value (not Secret ID): `________________________________`

### Step 4: Add API Permissions
- [ ] Click "API permissions" in left sidebar
- [ ] Click "Add a permission"
- [ ] Click "Microsoft Graph"
- [ ] Click "Delegated permissions"
- [ ] Search and check: `Calendars.Read`
- [ ] Search and check: `offline_access`
- [ ] Click "Add permissions"
- [ ] Optional: Click "Grant admin consent" if available

## 📝 Update .env File

Open your `.env` file and update these three lines with the values you copied above:

```bash
MICROSOFT_CLIENT_ID=PASTE_YOUR_APPLICATION_CLIENT_ID_HERE
MICROSOFT_CLIENT_SECRET=PASTE_YOUR_SECRET_VALUE_HERE
MICROSOFT_TENANT_ID=common
```

**Note:** Keep `MICROSOFT_TENANT_ID=common` as is - don't change it.

## 🗄️ Airtable Setup

### Update Users Table
- [ ] Open your Airtable base
- [ ] Go to Users table
- [ ] Add these new fields (click + to add field):

| Field Name | Field Type | Settings |
|------------|-----------|----------|
| Microsoft Access Token | Long text | - |
| Microsoft Refresh Token | Long text | - |
| Microsoft Token Expires At | Date | Include time ✓ |
| Calendar Connected | Checkbox | - |
| Last Calendar Sync | Date | Include time ✓ |

### Create Calendar Events Table
- [ ] Create new table called "Calendar Events"
- [ ] Rename primary field to "Calendar Event ID"
- [ ] Add all these fields:

| Field Name | Field Type | Settings |
|------------|-----------|----------|
| Subject | Single line text | - |
| Start Time | Date | Include time ✓ |
| End Time | Date | Include time ✓ |
| Location | Single line text | - |
| Attendees | Long text | - |
| Organizer | Email | - |
| Description | Long text | - |
| Is Online Meeting | Checkbox | - |
| Meeting URL | URL | - |
| User | Link to table | Link to "Users" |
| Last Synced | Date | Include time ✓ |

### Get Your User Record ID
- [ ] In Users table, find your user record
- [ ] Click on the record to expand it
- [ ] Look at the URL - it contains `rec...` - that's your Record ID
- [ ] Copy it: `________________________________`

## 🧪 Test the Integration

### Start the Servers
```bash
# Terminal 1 - API
cd apps/api
pnpm dev

# Terminal 2 - Web
cd apps/web
pnpm dev
```

### Test Calendar Connection
- [ ] Open browser: http://localhost:3000/settings/calendar
- [ ] Click "Connect Calendar"
- [ ] Sign in with Microsoft account
- [ ] Accept permissions
- [ ] Verify you're redirected back
- [ ] Check status shows "Connected"
- [ ] Verify upcoming meetings appear

## 🔧 If Something Goes Wrong

### Check API Logs
Look for errors in Terminal 1 (API server)

### Common Issues:

**"Redirect URI mismatch"**
- Make sure Azure redirect URI is EXACTLY: `http://localhost:3001/api/v1/auth/callback`
- No trailing slash, must include `/api/v1`

**"Invalid client secret"**
- Secret might have been copied wrong
- Go back to Azure, create new secret, update .env

**"No upcoming events"**
- Check if you have meetings in your Outlook calendar in next 7 days
- Try clicking "Sync Now"
- Check Airtable Calendar Events table

**"Calendar Connected but no user"**
- Update the userId in frontend code:
  - File: `apps/web/app/(dashboard)/settings/calendar/page.tsx`
  - Line 42: Change `const demoUserId = 'rec123456789'` to your actual Record ID

## ✨ You're Done!

Once you see:
- ✅ Status: Connected
- ✅ Upcoming meetings displayed
- ✅ Events in Airtable Calendar Events table

Your calendar integration is working! The system will automatically sync every hour.

---

## 📚 Reference Links

- Azure setup guide: `AZURE_SETUP_QUICKSTART.md`
- Detailed docs: `CALENDAR_SETUP.md`
- Azure Portal: https://portal.azure.com
- Your app: https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade
