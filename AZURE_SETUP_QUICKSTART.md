# Azure AD Calendar Integration - Quick Setup Guide

## Step 1: Register Your Application (5 minutes)

### 1.1 Go to Azure Portal
1. Open browser and go to: https://portal.azure.com
2. Sign in with your Microsoft account (any Microsoft account works - personal or work)

### 1.2 Navigate to App Registrations
1. In the search bar at the top, type "App registrations"
2. Click on **App registrations** in the results
3. Click **+ New registration** button

### 1.3 Fill Out Registration Form
```
Name: Meeting Intelligence Calendar Sync
(or any name you prefer)

Supported account types: Select ONE of these options:
  ○ Accounts in any organizational directory (Any Azure AD - Multitenant)
  ● Accounts in any organizational directory and personal Microsoft accounts
  ○ Personal Microsoft accounts only

Redirect URI:
  Platform: Web
  URI: http://localhost:3001/api/v1/auth/callback
```

4. Click **Register** button

### 1.4 Save Your Application (client) ID
On the Overview page, you'll see:
- **Application (client) ID**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- **Directory (tenant) ID**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

**Copy both of these** - you'll need them for your .env file

---

## Step 2: Create Client Secret

### 2.1 Navigate to Certificates & Secrets
1. In the left sidebar, click **Certificates & secrets**
2. Click the **Client secrets** tab
3. Click **+ New client secret**

### 2.2 Add Secret
```
Description: Calendar Sync Secret
Expires: 24 months (recommended)
```
4. Click **Add**

### 2.3 Copy the Secret Value
**IMPORTANT**: Copy the **Value** immediately - you can only see it once!
- The value looks like: `abc123~xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- Do NOT copy the "Secret ID" - copy the "Value"

---

## Step 3: Configure API Permissions

### 3.1 Navigate to API Permissions
1. In the left sidebar, click **API permissions**
2. You'll see "User.Read" already there - that's fine

### 3.2 Add Calendar Permission
1. Click **+ Add a permission**
2. Click **Microsoft Graph**
3. Click **Delegated permissions**
4. In the search box, type "Calendars"
5. Expand **Calendars** section
6. Check the box for **Calendars.Read**
7. In the search box, type "offline"
8. Check the box for **offline_access**
9. Click **Add permissions** button at the bottom

### 3.3 Grant Admin Consent (Optional but Recommended)
If you see a button that says **Grant admin consent for [Your Organization]**:
- Click it
- Click **Yes** to confirm
- You'll see green checkmarks appear

If you don't see this button, that's okay - users will consent individually when they connect their calendar.

---

## Step 4: Update Your .env File

Now let's configure your application with the credentials you just created.

### 4.1 Open your .env file
```bash
# In your MeetingNotes directory
code .env  # or open with your editor
```

### 4.2 Add/Update These Lines
Replace the placeholder values with your actual values from Azure:

```bash
# Microsoft Graph / Azure AD Configuration
MICROSOFT_CLIENT_ID=YOUR_APPLICATION_CLIENT_ID_FROM_STEP_1.4
MICROSOFT_CLIENT_SECRET=YOUR_SECRET_VALUE_FROM_STEP_2.3
MICROSOFT_TENANT_ID=common
MICROSOFT_REDIRECT_URI=http://localhost:3001/api/v1/auth/callback
MICROSOFT_SCOPES=Calendars.Read,offline_access

# Encryption key for storing tokens (32+ characters)
ENCRYPTION_KEY=change_this_to_random_32_char_key_abc123xyz789

# Frontend URL for OAuth redirects
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 4.3 Generate a Strong Encryption Key
You can generate a random key using this command:

**macOS/Linux:**
```bash
openssl rand -base64 32
```

**Or use this Node.js one-liner:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and use it as your `ENCRYPTION_KEY`

---

## Step 5: Set Up Airtable Schema

### 5.1 Update Users Table
Go to your Airtable base and open the **Users** table.

Add these new fields:

| Field Name | Field Type | Notes |
|------------|-----------|-------|
| Microsoft Access Token | Long text | Leave empty |
| Microsoft Refresh Token | Long text | Leave empty |
| Microsoft Token Expires At | Date (include time) | Leave empty |
| Calendar Connected | Checkbox | Leave unchecked |
| Last Calendar Sync | Date (include time) | Leave empty |

### 5.2 Create Calendar Events Table
Create a **new table** called **Calendar Events**:

**Primary Field:**
- Rename "Name" to "Calendar Event ID"
- Type: Single line text

**Add these fields:**

| Field Name | Field Type | Format/Options |
|------------|-----------|----------------|
| Subject | Single line text | - |
| Start Time | Date | Include time ✓ |
| End Time | Date | Include time ✓ |
| Location | Single line text | - |
| Attendees | Long text | - |
| Organizer | Email | - |
| Description | Long text | - |
| Is Online Meeting | Checkbox | - |
| Meeting URL | URL | - |
| User | Link to another record | Link to "Users" table |
| Last Synced | Date | Include time ✓ |

### 5.3 Create a Test User (if you don't have one)
In your **Users** table, make sure you have at least one user record with:
- Full Name: Your name
- Email: Your email
- Is Active: ✓ (checked)
- Copy the **Record ID** (looks like `recXXXXXXXXXXXXXX`) - you'll need this

---

## Step 6: Test the Integration

### 6.1 Start Your Servers
```bash
# Terminal 1 - API server
cd apps/api
pnpm dev

# Terminal 2 - Web app
cd apps/web
pnpm dev
```

### 6.2 Connect Your Calendar
1. Open browser to: http://localhost:3000/settings/calendar
2. Click **Connect Calendar** button
3. You'll be redirected to Microsoft login page
4. Sign in with your Microsoft/Outlook account
5. Click **Accept** to grant permissions
6. You should be redirected back to your app
7. Status should show **Connected** ✓
8. Your upcoming meetings should appear!

---

## Troubleshooting

### Error: "AADSTS50011: The redirect URI..."
**Problem**: Redirect URI doesn't match Azure configuration

**Solution**:
1. Go back to Azure Portal > Your App > Authentication
2. Make sure redirect URI is EXACTLY: `http://localhost:3001/api/v1/auth/callback`
3. Check for http vs https, trailing slashes, etc.

### Error: "Invalid client secret"
**Problem**: Client secret was copied incorrectly

**Solution**:
1. Go to Azure Portal > Your App > Certificates & secrets
2. Delete the old secret
3. Create a new secret
4. Copy the VALUE (not the ID)
5. Update .env file

### Error: "Calendar not connected"
**Problem**: User record doesn't exist or wrong userId

**Solution**:
1. Check your Airtable Users table
2. Make sure you have an active user
3. Copy the Record ID from Airtable
4. Update the `userId` in the frontend code (line 42 in calendar settings page)

### Calendar shows as connected but no events
**Problem**: No meetings in the next 7 days, or sync failed

**Solution**:
1. Check API logs for sync errors
2. Try clicking "Sync Now" button
3. Check Airtable Calendar Events table for records
4. Verify you have meetings in your Outlook calendar

---

## Quick Reference

### Your Azure App URLs
- **App registrations**: https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade
- **Your specific app**: https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/Overview/appId/YOUR_APP_ID

### Required .env Variables
```bash
MICROSOFT_CLIENT_ID=from_azure_overview_page
MICROSOFT_CLIENT_SECRET=from_certificates_and_secrets
MICROSOFT_TENANT_ID=common
MICROSOFT_REDIRECT_URI=http://localhost:3001/api/v1/auth/callback
MICROSOFT_SCOPES=Calendars.Read,offline_access
ENCRYPTION_KEY=random_32_character_string
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### API Endpoints
- Connect: `http://localhost:3001/api/v1/auth/login?userId=YOUR_USER_RECORD_ID`
- Status: `http://localhost:3001/api/v1/calendar/status?userId=YOUR_USER_RECORD_ID`
- Events: `http://localhost:3001/api/v1/calendar/events?userId=YOUR_USER_RECORD_ID`

---

## Next Steps After Setup

Once everything is working:

1. **Test the scheduled sync**: Wait an hour or check logs for automatic sync
2. **Add more users**: Create additional user records in Airtable
3. **Customize sync frequency**: Change `CALENDAR_SYNC_SCHEDULE` in .env
4. **Production setup**:
   - Update redirect URI in Azure
   - Generate new production encryption key
   - Update .env with production URLs

---

## Need Help?

Check the full setup guide in `CALENDAR_SETUP.md` for:
- Detailed troubleshooting
- Security best practices
- Advanced configuration options
- API documentation
