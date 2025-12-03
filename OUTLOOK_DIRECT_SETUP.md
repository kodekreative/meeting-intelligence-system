# Outlook Calendar - Direct OAuth Setup (No Azure)

## Alternative Method: Microsoft Account Developer Center

This method uses Microsoft's simpler developer portal instead of Azure.

### Step 1: Register App at Microsoft Account Developer Center

1. Go to: https://account.live.com/developers/applications

2. Sign in with your Microsoft account

3. Click **Create application**

4. Fill in:
   - Application name: `Meeting Intelligence`
   - Click **I accept**

5. You'll see your **Application ID** - copy this

### Step 2: Generate Application Secret

1. Under **Application Secrets**, click **Generate New Password**

2. **COPY THE PASSWORD IMMEDIATELY** - you can't see it again

3. Click **OK**

### Step 3: Add Platform

1. Under **Platforms**, click **Add Platform**

2. Select **Web**

3. Enter Redirect URL: `http://localhost:3001/api/v1/auth/callback`

4. Click **Save**

### Step 4: Add Permissions

1. Under **Microsoft Graph Permissions**, click **Add** next to **Delegated Permissions**

2. Check these boxes:
   - `Calendars.Read`
   - `offline_access`

3. Click **Save** at the bottom

### Step 5: Update .env

```bash
MICROSOFT_CLIENT_ID=your_application_id_from_step_1
MICROSOFT_CLIENT_SECRET=your_password_from_step_2
MICROSOFT_TENANT_ID=common
MICROSOFT_REDIRECT_URI=http://localhost:3001/api/v1/auth/callback
MICROSOFT_SCOPES=Calendars.Read,offline_access
```

---

## If That Also Doesn't Work...

Let me know and I'll implement one of these alternatives:

1. **Nylas API** - Third-party service that handles all OAuth complexity
2. **CalDAV** - Direct connection using just URL + password
3. **Outlook.com iCal URL** - Read-only calendar feed (simplest, but limited)

Which would you prefer if the Microsoft Account Developer Center doesn't work?
