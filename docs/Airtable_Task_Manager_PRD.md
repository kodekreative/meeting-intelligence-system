# Task Manager – Product Requirements Document (PRD)

## 1. Product overview

**Working name**
Task Manager (Meeting Intelligence System Extension)

**Product type**
Task management UI integrated with the Meeting Intelligence System, using Airtable as the data layer via direct API access.

**Vision**
Provide a unified task management interface where action items captured from meetings automatically become trackable tasks, supplemented by manually-created tasks, enabling users to manage all work in one place with Kanban and list views.

---

## 2. Goals and success metrics

**Business goals**

- Bridge the gap between meeting action items and task completion tracking.
- Provide visibility into task ownership, status, and workload across all meetings and companies.

**User goals (MVP)**

- See all tasks (from meetings + manual) in one unified view.
- Quickly update task status via drag-and-drop Kanban or inline editing.
- Filter to "My Tasks" to focus on personal assignments.
- Trace tasks back to their source meetings for context.

**Example success metrics**

- % of action items completed within their due dates.
- Average time from action item creation to completion.
- Weekly active users managing tasks in the system.

---

## 3. Users and use cases

**Primary user types**

- **Individual contributors**: View and manage assigned tasks; update status; complete work.
- **Team leads / managers**: Monitor task progress across team members; review workload distribution.

**Key use cases**

- **Action item flow**: Action items created during meeting note-taking automatically appear as tasks.
- **Manual task creation**: Add standalone tasks not tied to specific meetings.
- **Kanban workflow**: Drag tasks between status columns (Backlog → In Progress → Done).
- **Task filtering**: Filter by assignee, company, status, priority, or due date.
- **Meeting context**: Click through from a task to view the source meeting and full context.

---

## 4. Scope and out of scope

**In scope (MVP)**

- **Tasks table** in Airtable for unified task storage.
- **Auto-creation of tasks** from action items when action items are created.
- **Manual task creation** for standalone tasks.
- **UI Views**:
  - Grid/List view with sorting and inline editing.
  - Kanban view by Status (drag-and-drop).
  - "My Tasks" filtered view.
- **Filtering & Search**: By assignee, status, priority, due date, company.
- **Task-to-meeting linking**: Navigate from task back to source meeting.
- **Direct Airtable API integration**: Read/write tasks via existing MCP connection.

**Out of scope (Phase 2+)**

- Projects table (use existing company/meeting grouping initially).
- Teams table (flat user assignments for MVP).
- Recurring Task Templates and automations.
- Timeline/Gantt view.
- Calendar view.
- Task dependencies.
- Time tracking / estimated effort.
- Email/Slack notifications and reminders.
- Attachments on tasks (use meeting attachments).

---

## 5. Functional requirements

### 5.1 Data model

#### 5.1.1 Tasks table (Airtable)

New table in Airtable to store all tasks.

**Fields**

| Field | Type | Description |
|-------|------|-------------|
| **Name** | Single line text | Task title (primary field) |
| **Description** | Long text | Task details, notes |
| **Status** | Single select | Backlog, In Progress, Blocked, Done |
| **Priority** | Single select | Low, Medium, High, Critical |
| **Assignee** | Linked record | Link to existing Users/People table |
| **Due Date** | Date | When task is due |
| **Company** | Linked record | Link to Companies table (inherited or selected) |
| **Source** | Single select | "Action Item" or "Manual" |
| **Source Action Item ID** | Text | ID of originating action item (if applicable) |
| **Source Meeting ID** | Text | ID of originating meeting (if applicable) |
| **Completed Date** | Date | When task was marked Done |
| **Created Time** | Created time | Auto-generated |
| **Last Modified** | Last modified time | Auto-generated |

#### 5.1.2 Relationship to existing tables

- **Action Items**: When an action item is created, a corresponding Task record is auto-created with Source = "Action Item" and the linking IDs populated.
- **Meetings**: Tasks link back to meetings via Source Meeting ID for context navigation.
- **Companies**: Tasks inherit or can be assigned to a company for filtering/grouping.
- **Users**: Assignee links to existing user records.

### 5.2 UI Views

#### 5.2.1 Tasks Page (`/tasks`)

Main task management page with view toggle.

**List/Grid View**
- Table display with columns: Name, Status, Priority, Assignee, Due Date, Company, Source
- Sortable columns (click header to sort)
- Inline editing for Status, Priority, Assignee, Due Date
- Row click opens task detail panel/modal
- Checkbox for bulk actions (future)

**Kanban View**
- Columns: Backlog | In Progress | Blocked | Done
- Cards show: Name, Priority badge, Assignee avatar, Due Date
- Drag-and-drop between columns updates Status
- Click card opens task detail panel/modal
- Column headers show task count

**Shared Controls (both views)**
- View toggle (List / Kanban)
- "Add Task" button → opens create modal
- Filter bar:
  - Assignee dropdown (with "My Tasks" quick filter)
  - Status multi-select
  - Priority multi-select
  - Company dropdown
  - Due date range picker
  - Source toggle (All / Action Items / Manual)
- Search input (searches Name and Description)

#### 5.2.2 Task Detail Panel/Modal

Opened when clicking a task.

**Display**
- Task name (editable)
- Description (editable, rich text)
- Status dropdown
- Priority dropdown
- Assignee dropdown
- Due Date picker
- Company (display, optionally editable)
- Source badge ("Action Item" or "Manual")
- If Source = Action Item:
  - "View Source Meeting" link → navigates to meeting detail page
  - Original action item text (read-only)
- Created/Modified timestamps
- "Delete Task" button (with confirmation)

#### 5.2.3 Sidebar Navigation

Add "Tasks" to the main sidebar navigation, positioned logically near existing features:

```
Dashboard
Meetings
Companies
Intelligence
Themes
Tasks        ← NEW
Settings
```

## 6. Backend logic

### 6.1 Action Item → Task Auto-Creation

**Implementation: API-level auto-creation**

When an action item is created through the application, a corresponding task is automatically created.

**Location:** `apps/api/src/lib/client.ts` - `createActionItem()` method

**Flow:**
1. Action item is created in Airtable
2. `createTaskFromActionItem()` is called automatically
3. New task record is created with:
   - `Name` = Action item's Task Description
   - `Description` = Action item's Notes
   - `Status` = "Backlog"
   - `Priority` = Action item's Priority (or "Medium")
   - `Due Date` = Action item's Due Date
   - `Company` = Action item's Company link
   - `Source` = "Action Item"
   - `Source Action Item ID` = Action item's record ID
   - `Source Meeting ID` = First meeting from Source Meeting link

**Error handling:** If task creation fails, the action item creation still succeeds (task creation failure is logged but non-blocking).

### 6.2 Task CRUD Operations

Standard API operations via Airtable MCP:

- **Create Task**: `mcp__airtable__create_record` on Tasks table
- **Read Tasks**: `mcp__airtable__list_records` with filters
- **Update Task**: `mcp__airtable__update_records` for status/field changes
- **Delete Task**: `mcp__airtable__delete_records`

### 6.3 Status Change Logic

When Status changes to "Done":
- Auto-set Completed Date to current date/time

## 7. Technical implementation

### 7.1 Frontend components

**New files to create:**

```
apps/web/app/(dashboard)/tasks/
├── page.tsx              # Main tasks page
├── components/
│   ├── task-list.tsx     # List/Grid view component
│   ├── task-kanban.tsx   # Kanban board component
│   ├── task-card.tsx     # Individual task card (for Kanban)
│   ├── task-row.tsx      # Individual task row (for List)
│   ├── task-detail.tsx   # Task detail panel/modal
│   ├── task-filters.tsx  # Filter bar component
│   └── create-task.tsx   # Create task modal
```

**Libraries to consider:**
- `@dnd-kit/core` or `react-beautiful-dnd` for Kanban drag-and-drop
- Existing UI components (shadcn/ui) for consistency

### 7.2 API routes

**New API endpoints:**

```
apps/api/src/routes/tasks.ts

GET    /api/tasks           # List tasks with filters
POST   /api/tasks           # Create manual task
GET    /api/tasks/:id       # Get single task
PATCH  /api/tasks/:id       # Update task
DELETE /api/tasks/:id       # Delete task
```

### 7.3 Airtable integration

Uses existing Airtable MCP connection. Requires:
- Create "Tasks" table in Airtable base
- Configure field types as specified in data model

---

## 8. Non-functional requirements

**Performance**
- Task list should load within 2 seconds for up to 500 tasks.
- Kanban drag-and-drop should feel instant (optimistic UI updates).

**Usability**
- Consistent with existing Meeting Intelligence System design patterns.
- Mobile-responsive (list view priority; Kanban secondary).

**Data integrity**
- Tasks created from action items maintain referential link.
- Deleting a task does not delete the source action item.

---

## 9. Dependencies

- Existing Airtable base and MCP connection.
- Existing user authentication system.
- Existing Companies and Meetings tables for linking.

---

## 10. Release plan

**Phase 1 – MVP** ✅ COMPLETE

1. ✅ Create Tasks table in Airtable with defined schema.
2. ✅ Build API routes for task CRUD operations.
3. ✅ Implement List view with filtering.
4. ✅ Implement Kanban view with drag-and-drop.
5. ✅ Add task detail panel/modal.
6. ✅ Implement Action Item → Task auto-creation (in `createActionItem` method).
7. ✅ Add Tasks to sidebar navigation.
8. ✅ Migrate existing action items to Tasks table (87 items migrated).
9. ✅ Consolidate Action Items page → redirects to Tasks.
10. ✅ Consolidate My Tasks page → redirects to Tasks.

**Phase 2 – Enhancements**

- Calendar view.
- Recurring task templates.
- Email/Slack notifications.
- Timeline/Gantt view.
- Task dependencies.
- Bulk actions.
- Assignee filtering (port My Tasks person selector).
