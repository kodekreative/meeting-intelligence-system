# Start Your Servers - Final Step!

The code is all ready, but the API server needs to be started with the new changes.

## Open 2 Terminal Windows

### Terminal 1 - API Server

```bash
cd /Users/peterschmitt/Documents/MeetingNotes/apps/api
pnpm dev
```

Wait for this message:
```
🚀 Meeting Intelligence API Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Environment: development
Port: 3001
```

**Keep this terminal open!**

---

### Terminal 2 - Web App

```bash
cd /Users/peterschmitt/Documents/MeetingNotes/apps/web
pnpm dev
```

Wait for this message:
```
▲ Next.js 14.x.x
- Local: http://localhost:3000
✓ Ready in X.Xs
```

**Keep this terminal open too!**

---

## Test It!

Open your browser: **http://localhost:3000/settings/calendar-simple**

You should see:
- ✅ **"Connected"** status (green dot)
- ✅ **Your upcoming meetings** listed

If you see meetings, it works! 🎉

---

## If It Says "Not Connected"

The page will automatically try to connect. If it doesn't:

1. The "Connect Calendar" button will appear
2. Your calendar URL should already be in Airtable from the script
3. Just reload the page - it should detect the connection

---

## Manual Test (if needed)

If the UI doesn't work, test the API directly:

```bash
# Check connection status
curl "http://localhost:3001/api/v1/icalendar/status?userId=recJns5edTqex92I8"

# Should return: {"success":true,"data":{"connected":true,"userId":"recJns5edTqex92I8"}}
```

If connected=true, the calendar is working! Just refresh the web page.

---

## Your Setup

- **User ID**: `recJns5edTqex92I8`
- **Calendar URL**: Already in Airtable
- **Frontend**: Already configured
- **Page**: http://localhost:3000/settings/calendar-simple

Just start the servers and go! 🚀
