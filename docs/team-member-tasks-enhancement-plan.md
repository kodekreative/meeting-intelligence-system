# Team Member Task Page Enhancement Plan

## Overview
Transform the basic team member task page into a robust task administration interface with full task management, organization, communication, and notification features.

---

## Phase 1: Core Task Management

### 1.1 Status Workflow
**Goal**: Allow team members to set meaningful statuses beyond just complete/incomplete

**Backend Changes**:
- Update `PATCH /api/v1/team-tasks/:token/items/:id` to accept full status values
- Supported statuses: `Open`, `In Progress`, `Blocked`, `Done`

**Frontend Changes**:
- Replace checkbox with status dropdown/buttons
- Visual indicators for each status (colors, icons)
- Status change confirmation for "Done"

**UI Design**:
```
[Open] [In Progress] [Blocked] [Done]
   ○        🔄           ⚠️        ✓
```

---

### 1.2 Add Notes/Comments
**Goal**: Team members can add context, updates, or questions to tasks

**Backend Changes**:
- Already supports `notes` field in PATCH endpoint
- Add `GET /api/v1/team-tasks/:token/items/:id` for single task detail

**Frontend Changes**:
- Expandable task card with notes textarea
- Save button with optimistic updates
- Show last modified timestamp

---

### 1.3 Priority Management
**Goal**: Allow changing task priority

**Backend Changes**:
- Add `priority` to PATCH endpoint accepted fields

**Frontend Changes**:
- Priority selector (Low, Medium, High, Critical)
- Color-coded priority badges
- Sort by priority option

---

### 1.4 Due Date Requests
**Goal**: Request deadline extension (doesn't change it directly, flags for review)

**Database Changes**:
- Add `Requested Due Date` field to Tasks table
- Add `Due Date Request Reason` field

**Backend Changes**:
- New endpoint `POST /api/v1/team-tasks/:token/items/:id/request-extension`
- Accepts: `requestedDate`, `reason`

**Frontend Changes**:
- "Request Extension" button on each task
- Modal with date picker and reason field
- Visual indicator when extension is pending

---

## Phase 2: Organization & Filtering

### 2.1 Search
**Goal**: Find tasks by keyword

**Frontend Changes**:
- Search input at top of page
- Real-time filtering (client-side)
- Highlights matching text

---

### 2.2 Sort Options
**Goal**: Multiple sort orders

**Frontend Changes**:
- Sort dropdown with options:
  - Due date (soonest first) - default
  - Due date (latest first)
  - Priority (highest first)
  - Recently added
  - Alphabetical
- Persist preference in localStorage

---

### 2.3 Filter Controls
**Goal**: Filter by status, priority, date range

**Frontend Changes**:
- Filter bar with toggles:
  - Status: All | Open | In Progress | Blocked | Done
  - Priority: All | Critical | High | Medium | Low
  - Due: All | Overdue | Today | This Week | No Date
- Active filter count badge
- "Clear filters" button

---

### 2.4 Group By Options
**Goal**: Organize tasks by different dimensions

**Frontend Changes**:
- Group by dropdown:
  - Due Date (current default)
  - Status
  - Priority
  - Source Meeting
  - None (flat list)
- Collapsible group headers

---

### 2.5 Show/Hide Completed
**Goal**: Toggle visibility of done tasks

**Frontend Changes**:
- Toggle switch: "Show completed"
- Default: hidden
- Persist in localStorage

---

## Phase 3: Communication

### 3.1 Task Questions/Replies
**Goal**: Send a message about a specific task back to admin

**Database Changes**:
- New table `Task Comments`:
  - `task_id` (link to Tasks)
  - `author_name` (team member name)
  - `author_type` ('team_member' | 'admin')
  - `content` (text)
  - `created_at`

**Backend Changes**:
- `POST /api/v1/team-tasks/:token/items/:id/comments` - Add comment
- `GET /api/v1/team-tasks/:token/items/:id/comments` - List comments
- Optionally: trigger email notification to admin

**Frontend Changes**:
- "Add comment" button on each task
- Comment thread display
- Unread indicator for new admin replies

---

### 3.2 Blocker Reporting
**Goal**: Explicitly flag what's blocking a task

**Database Changes**:
- Add `Blocker Description` field to Tasks

**Backend Changes**:
- Include `blocker` in PATCH endpoint

**Frontend Changes**:
- When status = "Blocked", show blocker input field
- Required field to set Blocked status
- Display blocker prominently on card

---

### 3.3 Help Request
**Goal**: Quick way to escalate needing assistance

**Backend Changes**:
- `POST /api/v1/team-tasks/:token/items/:id/request-help`
- Sends notification email to admin
- Sets a `Help Requested` flag on task

**Frontend Changes**:
- "Need Help" button
- Confirmation modal with optional message
- Visual indicator when help is requested

---

## Phase 4: History & Context

### 4.1 Meeting Context Links
**Goal**: See the meeting where task originated

**Backend Changes**:
- Include meeting summary snippet in task response
- Add meeting date to response

**Frontend Changes**:
- "From: Meeting Title (Date)" link on each task
- Click to expand meeting summary
- Show relevant excerpt from meeting

---

### 4.2 Task History/Activity Log
**Goal**: See when task was created and status changes

**Database Changes**:
- New table `Task Activity`:
  - `task_id`
  - `action` ('created' | 'status_changed' | 'priority_changed' | 'note_added' | etc.)
  - `old_value`
  - `new_value`
  - `actor_name`
  - `created_at`

**Backend Changes**:
- Log activity on each task update
- `GET /api/v1/team-tasks/:token/items/:id/activity`

**Frontend Changes**:
- "History" expandable section on task detail
- Timeline view of changes

---

### 4.3 Related Tasks
**Goal**: See other tasks from same meeting

**Backend Changes**:
- Include `relatedTasks` in task detail response
- Query tasks with same `sourceMeetingId`

**Frontend Changes**:
- "Related Tasks" section in expanded view
- Quick links to jump to related tasks

---

## Phase 5: Notifications & Preferences

### 5.1 Email Preferences
**Goal**: Control reminder frequency

**Database Changes**:
- Add to `Team Member Tokens` table:
  - `Reminder Frequency` ('daily' | 'weekly' | 'none')
  - `Email Address` (for sending reminders)

**Backend Changes**:
- `GET /api/v1/team-tasks/:token/preferences`
- `PATCH /api/v1/team-tasks/:token/preferences`

**Frontend Changes**:
- Settings/preferences section on page
- Reminder frequency dropdown
- Email input (pre-filled if known)

---

### 5.2 Task Reminders
**Goal**: Set individual task reminders

**Database Changes**:
- Add `Reminder Date` field to Tasks

**Backend Changes**:
- Include in PATCH endpoint
- Scheduler job to send reminder emails

**Frontend Changes**:
- "Remind me" button with date picker
- Options: Tomorrow, Next Week, Custom Date
- Indicator when reminder is set

---

## Phase 6: Sub-tasks

### 6.1 Create Sub-tasks
**Goal**: Break down tasks into smaller items

**Database Changes**:
- Add `Parent Task ID` field to Tasks table
- Add `Is Subtask` computed field

**Backend Changes**:
- `POST /api/v1/team-tasks/:token/items/:id/subtasks` - Create subtask
- Include subtasks in task response
- Auto-complete parent when all subtasks done (optional)

**Frontend Changes**:
- "Add subtask" button
- Inline subtask input
- Nested display with indent
- Progress indicator (2/5 complete)

---

## Implementation Order

### Sprint 1: Core Task Management (Phase 1)
1. Status workflow with 4 states
2. Notes/comments on tasks
3. Priority management
4. Due date extension requests

### Sprint 2: Organization (Phase 2)
5. Search functionality
6. Sort options
7. Filter controls
8. Group by options
9. Show/hide completed toggle

### Sprint 3: Communication (Phase 3)
10. Task comments/questions
11. Blocker reporting
12. Help request feature

### Sprint 4: Context & History (Phase 4)
13. Meeting context links
14. Task activity history
15. Related tasks

### Sprint 5: Notifications (Phase 5)
16. Email preferences
17. Task reminders

### Sprint 6: Advanced (Phase 6)
18. Sub-tasks

---

## Database Schema Additions

### New Table: Task Comments
| Field | Type | Description |
|-------|------|-------------|
| Task ID | Link to Tasks | The task being commented on |
| Author Name | Text | Name of commenter |
| Author Type | Single Select | 'team_member' or 'admin' |
| Content | Long Text | The comment text |
| Created At | DateTime | When posted |

### New Table: Task Activity
| Field | Type | Description |
|-------|------|-------------|
| Task ID | Link to Tasks | The task |
| Action | Single Select | Type of action |
| Old Value | Text | Previous value |
| New Value | Text | New value |
| Actor Name | Text | Who made the change |
| Created At | DateTime | When it happened |

### Fields to Add to Tasks Table
| Field | Type | Description |
|-------|------|-------------|
| Requested Due Date | Date | Extension request |
| Due Date Request Reason | Long Text | Why extension needed |
| Blocker Description | Long Text | What's blocking |
| Help Requested | Checkbox | Escalation flag |
| Help Request Message | Long Text | Details of help needed |
| Reminder Date | Date | When to send reminder |
| Parent Task ID | Link to Tasks | For subtasks |

### Fields to Add to Team Member Tokens Table
| Field | Type | Description |
|-------|------|-------------|
| Reminder Frequency | Single Select | daily/weekly/none |
| Email Address | Email | For notifications |

---

## API Endpoints Summary

### Existing (to enhance)
- `GET /api/v1/team-tasks/:token` - Add filters, sorting params
- `PATCH /api/v1/team-tasks/:token/items/:id` - Add priority, blocker fields

### New Endpoints
- `GET /api/v1/team-tasks/:token/items/:id` - Single task detail
- `POST /api/v1/team-tasks/:token/items/:id/request-extension` - Request due date change
- `POST /api/v1/team-tasks/:token/items/:id/comments` - Add comment
- `GET /api/v1/team-tasks/:token/items/:id/comments` - List comments
- `POST /api/v1/team-tasks/:token/items/:id/request-help` - Escalate task
- `GET /api/v1/team-tasks/:token/items/:id/activity` - Task history
- `GET /api/v1/team-tasks/:token/preferences` - Get preferences
- `PATCH /api/v1/team-tasks/:token/preferences` - Update preferences
- `POST /api/v1/team-tasks/:token/items/:id/subtasks` - Create subtask
- `POST /api/v1/team-tasks/:token/items/:id/reminder` - Set reminder

---

## UI Mockup (Text-based)

```
┌─────────────────────────────────────────────────────────────┐
│  Tim Collopy's Tasks                              ⚙️ Prefs  │
│  12 open tasks                                              │
├─────────────────────────────────────────────────────────────┤
│  🔍 Search...                                               │
│                                                             │
│  Sort: [Due Date ▼]  Group: [Status ▼]  [Filters] [✓ Hide Done] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ⚠️ OVERDUE (2)                                        [−]  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ○ Review Q3 financials                    [Critical] │   │
│  │   From: Board Meeting (Nov 15)                       │   │
│  │   📅 Due: Nov 20  ⚠️ 14 days overdue                │   │
│  │   [Open ▼] [📝 Notes] [❓ Help] [⏰ Remind] [↗️ Expand]│   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  🔄 IN PROGRESS (3)                                    [−]  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🔄 Prepare investor deck                     [High]  │   │
│  │   From: Strategy Session (Nov 28)                    │   │
│  │   📅 Due: Dec 10  ⏱️ 6 days left                    │   │
│  │   ├─ ✓ Gather metrics (done)                        │   │
│  │   ├─ ○ Create slides (in progress)                  │   │
│  │   └─ ○ Review with team                             │   │
│  │   [In Progress ▼] [📝 2 notes] [↗️ Expand]          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ○ OPEN (7)                                            [+]  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Success Metrics

- Task completion rate increases
- Average time to complete tasks decreases
- Fewer back-and-forth emails about task status
- Team members log in and update tasks proactively
- Reduction in overdue tasks
