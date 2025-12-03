# Run This To Start Your Calendar

## Step 1: Kill any old servers

```bash
lsof -ti:3001 | xargs kill -9 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null
pkill -f "pnpm.*dev"
pkill -f "turbo"
pkill -f "next"
```

## Step 2: Open TWO terminal windows

### Terminal 1 - Start Everything

```bash
cd /Users/peterschmitt/Documents/MeetingNotes
pnpm dev
```

Wait for these messages:
- `✓ Airtable client initialized`
- `✓ Redis connection established`
- `Ready on http://localhost:3000`

**Keep this terminal open!**

## Step 3: Open Browser

Go to: **http://localhost:3000/settings/calendar-simple**

You should see:
- ✅ "Connected" status
- ✅ Your upcoming meetings

## If it still doesn't work

Try going to the root page first: **http://localhost:3000**

Then click "Calendar (Simple)" in the sidebar.

---

Your setup:
- User ID: `recJns5edTqex92I8` ✅
- Calendar URL: In Airtable ✅
- Calendar Connected: Checked ✅
- Code: Updated ✅

Everything is ready - just need to start the servers!
