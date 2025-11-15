# Feature Specification: Meeting Intelligence System

**Feature Branch**: `001-meeting-intelligence-system`
**Created**: 2025-11-15
**Status**: Draft
**Input**: Meeting Intelligence System - Transform meeting transcripts into actionable intelligence with daily briefings, task tracking, and relationship management

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Daily Meeting Preparation (Priority: P1) 🎯 MVP

As a Managing Partner, I want to receive a comprehensive morning briefing for today's meetings so that I can walk into every call fully prepared with relevant historical context and never feel caught off-guard.

**Why this priority**: Meeting preparation is the foundational value proposition. Without proper preparation context, all other features lose effectiveness. This delivers immediate, daily value that justifies system adoption.

**Independent Test**: Can be fully tested by scheduling meetings in Outlook calendar, having meeting transcripts in Airtable, and verifying that a 6 AM email arrives with historical context for each meeting. Delivers standalone value even without other features.

**Acceptance Scenarios**:

1. **Given** I have 5 meetings scheduled for today across different portfolio companies, **When** I check my email at 6:00 AM, **Then** I receive a single email listing all 5 meetings with participants and companies
2. **Given** I'm meeting with a company I've met 3 times before, **When** I review the morning brief, **Then** I see a summary of those 3 previous meetings including key decisions and unresolved issues
3. **Given** I'm meeting with contacts I've never met before, **When** I review the morning brief, **Then** I see their names, roles, and companies without errors or missing context
4. **Given** I have multiple Outlook calendars synced, **When** I receive the morning brief, **Then** all meetings from all synced calendars are included
5. **Given** a meeting transcript includes personal details about a participant, **When** I review the prep brief for a meeting with that person, **Then** those personal notes appear in the meeting context

---

### User Story 2 - Action Item Tracking (Priority: P2)

As a Managing Partner, I want commitments from meetings automatically extracted and tracked so that I can ensure all action items are being executed without manual follow-up or items falling through the cracks.

**Why this priority**: After knowing what to discuss (P1), ensuring execution on commitments is the next critical need. This transforms meetings from talk into action and directly impacts business results.

**Independent Test**: Can be fully tested by having meeting transcripts with clear commitments, verifying action items are extracted with assignees and due dates, and receiving daily emails listing tasks due today. Delivers value independently by automating what's currently manual tracking.

**Acceptance Scenarios**:

1. **Given** a meeting transcript contains "Peter will send the proposal by Friday", **When** AI processes the transcript, **Then** an action item is created assigned to Peter with due date set to that Friday
2. **Given** I have 10 action items assigned to me across different meetings, **When** I receive my 6 AM email, **Then** I see my tasks grouped by: due today, overdue, and due this week
3. **Given** an action item was created with status "Open", **When** I update its status to "Complete" via the web UI, **Then** the status persists in Airtable and the task no longer appears in my daily email
4. **Given** a meeting transcript says "by end of month", **When** AI processes the transcript, **Then** the due date is set to the last day of the current month
5. **Given** a meeting transcript doesn't specify a due date, **When** AI processes the transcript, **Then** the due date defaults to Friday of the current week

---

### User Story 3 - Follow-Up Management (Priority: P3)

As a Managing Partner, I want to be notified when team members' tasks need follow-up so that projects don't stall due to blocked dependencies and I can coach team members effectively.

**Why this priority**: Once my own tasks are tracked (P2), managing team execution becomes the next leverage point. This enables portfolio-scale management without constant check-ins.

**Independent Test**: Can be fully tested by creating action items assigned to team members, advancing time to trigger follow-up conditions, and verifying follow-up reminders appear in daily email. Delivers value independently by proactively surfacing what needs attention.

**Acceptance Scenarios**:

1. **Given** a team member has a task "In Progress" for 8 days, **When** I receive my 6 AM email, **Then** I see this task in the "Requires Follow-Up" section
2. **Given** a team member has a task due in 2 days with status still "Open", **When** I receive my 6 AM email, **Then** I see this task flagged as needing check-in
3. **Given** I see a task requiring follow-up in my email, **When** I click the follow-up link, **Then** I'm taken to a page where I can send a reminder email to the assignee
4. **Given** I send a follow-up reminder for a task, **When** the reminder is sent, **Then** the task's "last followed up" timestamp is updated and I don't see duplicate reminders for 3 days

---

### User Story 4 - Business Issues Dashboard (Priority: P4)

As a Managing Partner, I want to see all active business issues organized by portfolio company so that I can prioritize my attention and support across the portfolio.

**Why this priority**: After ensuring tactical execution (P1-P3), strategic visibility across companies becomes valuable for portfolio management and risk mitigation.

**Independent Test**: Can be fully tested by having meeting transcripts with mentions of risks or concerns, verifying issues are extracted and categorized, and seeing them organized by company in daily email and web dashboard. Delivers value independently for portfolio oversight.

**Acceptance Scenarios**:

1. **Given** a meeting transcript mentions "we're concerned about cash flow next quarter", **When** AI processes the transcript, **Then** a business issue is created categorized as "Financial" with severity based on context
2. **Given** I have 5 portfolio companies with various active issues, **When** I receive my 6 AM email, **Then** I see issues grouped by company with priority ranking
3. **Given** an issue is marked as "Resolved" via the web UI, **When** I view the business issues dashboard, **Then** resolved issues are filtered out by default but viewable via toggle
4. **Given** multiple issues are identified from the same meeting, **When** I view an issue detail, **Then** I see related action items that address the issue

---

### User Story 5 - Personal Intelligence & Relationship Building (Priority: P5)

As a Managing Partner, I want to remember and follow up on personal details from conversations so that I can build stronger, more authentic relationships with executives and portfolio company leaders.

**Why this priority**: Relationship quality is important but less urgent than tactical execution and strategic oversight. This feature creates competitive advantage in relationship depth once core workflows are automated.

**Independent Test**: Can be fully tested by having meeting transcripts with personal details, verifying they're extracted and categorized, receiving follow-up reminders at appropriate times, and seeing personal notes in meeting prep briefs. Delivers value independently for relationship management.

**Acceptance Scenarios**:

1. **Given** a meeting transcript mentions "my son is graduating from MIT in May", **When** AI processes the transcript, **Then** a personal intelligence note is created with category "Family" and reminder date set for early May
2. **Given** today is the reminder date for a personal follow-up, **When** I receive my 6 AM email, **Then** I see the personal detail with suggested follow-up language
3. **Given** I'm meeting with someone who has 3 personal intelligence notes, **When** I review the morning prep brief, **Then** those personal notes appear in the meeting context
4. **Given** I reference a personal detail during a meeting, **When** I mark it as "Used" in the web UI, **Then** the reminder timing adjusts to avoid over-mentioning

---

### User Story 6 - Multi-Calendar Integration (Priority: P6)

As a Managing Partner with multiple company calendars, I want all my calendars synced in one place so that I have a unified view of my meeting schedule and don't miss meetings from any company.

**Why this priority**: While calendar aggregation is foundational infrastructure, the core value exists even with manual meeting list creation. This automates data input but doesn't change core workflows.

**Independent Test**: Can be fully tested by connecting multiple Outlook calendars, verifying calendar events sync to Airtable, and confirming all meetings appear in morning brief. Delivers value independently by automating meeting discovery.

**Acceptance Scenarios**:

1. **Given** I authenticate with Microsoft Graph, **When** I view the calendar selection interface, **Then** I see all my Outlook calendars available to sync
2. **Given** I select 3 calendars to sync, **When** the system polls calendars hourly, **Then** new meetings from any of the 3 calendars create placeholder records in Airtable
3. **Given** a calendar event is created with attendees, **When** the system syncs the calendar, **Then** the meeting record includes participant names and email addresses
4. **Given** Read.ai processes a meeting and adds a transcript to Airtable, **When** I view the meeting record, **Then** the calendar event data and transcript are linked in the same record

---

### User Story 7 - Web UI Dashboard (Priority: P7)

As a Managing Partner, I want a clean, intuitive interface to explore my meeting history and manage tasks so that I can quickly find information and take action beyond the daily emails.

**Why this priority**: The daily emails deliver 80% of the value. The web UI is important for deep-dives and task management but not required for core workflows. Users can start with email-only experience.

**Independent Test**: Can be fully tested by accessing the web interface, navigating between different views (Today, Company, Person, Task), and verifying data displays correctly with interactive elements working. Delivers value independently as a self-service exploration tool.

**Acceptance Scenarios**:

1. **Given** I access the web dashboard, **When** I land on the home page, **Then** I see today's meetings, my tasks due today, tasks requiring follow-up, and active issues
2. **Given** I'm viewing the company-centric view, **When** I click on a portfolio company, **Then** I see a timeline of all meetings, key participants, unresolved issues, and pending action items
3. **Given** I'm viewing the task management view, **When** I drag a task from "Open" to "In Progress", **Then** the task status updates and the change syncs to Airtable
4. **Given** I'm viewing a person's profile, **When** I see their relationship score, **Then** it's calculated based on meeting frequency and depth of personal connection
5. **Given** I'm viewing today's dashboard on my mobile phone, **When** the page loads, **Then** all elements are responsive and usable on a small screen

---

### Edge Cases

- What happens when AI extracts an action item but can't identify the assignee from the transcript?
- How does the system handle meeting transcripts in Airtable that don't have any extractable action items, personal details, or issues?
- What happens when a calendar sync fails due to expired OAuth tokens?
- How does the system handle time zone differences when scheduling 6 AM emails for users in different locations?
- What happens when two meetings are scheduled at the same time on different calendars?
- How does the system handle partial or incomplete meeting transcripts from Read.ai?
- What happens when an action item's due date is in the past when it's first extracted?
- How does the system handle participants with the same name across different companies?
- What happens when a user has no meetings scheduled for a day - should they still receive an email?
- How does the system handle very long meeting transcripts (2+ hours) that may exceed AI token limits?

## Requirements *(mandatory)*

### Functional Requirements

**Data Ingestion & Sync**
- **FR-001**: System MUST sync with multiple Outlook calendars via authenticated Microsoft Graph API connection
- **FR-002**: System MUST poll synced calendars every 60 minutes to detect new or updated meetings
- **FR-003**: System MUST create placeholder meeting records in Airtable when new calendar events are detected
- **FR-004**: System MUST retrieve meeting transcripts from Airtable that are populated by Read.ai integration
- **FR-005**: System MUST link calendar events to transcript records using meeting date, time, and participant matching

**AI Extraction**
- **FR-006**: System MUST extract action items from meeting transcripts including task description, assignee, and due date
- **FR-007**: System MUST extract personal intelligence details from transcripts categorized as: Family, Health, Hobbies, Career, Travel
- **FR-008**: System MUST identify business issues from transcripts based on keywords: risk, concern, blocker, problem, challenge
- **FR-009**: System MUST assign confidence scores to all extracted items (action items, personal intelligence, business issues)
- **FR-010**: System MUST only save extracted items with confidence scores above 70%
- **FR-011**: System MUST parse contextual due dates from transcripts (e.g., "by Friday", "end of month")
- **FR-012**: System MUST default action item due dates to Friday of current week when no due date is specified
- **FR-013**: System MUST categorize business issues as: Financial, Operational, Strategic, Personnel, or Compliance

**Daily Email Generation**
- **FR-014**: System MUST send daily email briefings at exactly 6:00 AM in the user's configured timezone
- **FR-015**: Daily meeting prep email MUST include: list of today's meetings, participants, company context, historical summary of previous meetings with same participants/company
- **FR-016**: Daily action items email MUST list user's tasks grouped by: due today, overdue, due this week
- **FR-017**: Daily follow-up email MUST list tasks assigned to others that meet follow-up criteria: In Progress > 7 days OR approaching due date with status still Open
- **FR-018**: Daily business issues email MUST group active issues by company with priority ranking
- **FR-019**: Daily personal intelligence email MUST list personal follow-ups scheduled for today with suggested follow-up language
- **FR-020**: All emails MUST be sent via Microsoft Graph API using user's Outlook account
- **FR-021**: All emails MUST be responsive HTML with plain text fallbacks

**Task Management**
- **FR-022**: Users MUST be able to update action item status: Open, In Progress, Complete, Overdue
- **FR-023**: Users MUST be able to update action item due dates
- **FR-024**: Users MUST be able to send follow-up reminder emails to task assignees
- **FR-025**: System MUST track "last followed up" timestamp when reminders are sent
- **FR-026**: System MUST calculate "Overdue" status automatically for tasks past due date with status not Complete

**Web Dashboard**
- **FR-027**: System MUST provide a Today's Dashboard view showing: today's meetings with prep context, my tasks due today/overdue, tasks requiring follow-up, active business issues, personal follow-ups for today
- **FR-028**: System MUST provide a Company-Centric view showing: list of all companies, meeting count and recency, drill-down to company timeline with all meetings, participants, issues, and action items
- **FR-029**: System MUST provide a Person-Centric view showing: directory of contacts with meeting frequency, drill-down to relationship timeline with personal intelligence notes and action items
- **FR-030**: System MUST provide a Task Management view with filtering by: assignee, company, due date, status
- **FR-031**: System MUST calculate relationship scores for contacts based on meeting frequency and personal connection depth
- **FR-032**: All dashboard views MUST be responsive and mobile-friendly
- **FR-033**: Web UI MUST load pages in under 2 seconds

**Data Persistence**
- **FR-034**: All extracted data (action items, personal intelligence, business issues) MUST be written back to Airtable
- **FR-035**: All data changes via web UI MUST sync back to Airtable in real-time
- **FR-036**: System MUST preserve existing Airtable data structure and relationships

**Authentication & Security**
- **FR-037**: System MUST authenticate users via OAuth 2.0 with Microsoft for calendar and email access
- **FR-038**: System MUST encrypt OAuth tokens at rest
- **FR-039**: System MUST handle OAuth token refresh automatically
- **FR-040**: System MUST store API keys and secrets in environment variables, never in code

### Key Entities

- **User**: Represents a system user (Managing Partner or team member); attributes include name, email, timezone, synced calendar IDs, email preferences, OAuth tokens

- **Company**: Represents a business entity (portfolio company or prospect); attributes include name, type, relationship status, industry, owner, first/last meeting dates, meeting count

- **Contact**: Represents an individual person across meetings; attributes include name, email, company affiliation, role, first met date, last contact date, meeting count, relationship score; relationships: belongs to company, participates in meetings, has personal intelligence notes, assigned to action items

- **Meeting**: Represents a business meeting with transcript; attributes include date/time, company, participants, summary, full transcript, topics, key questions, processing status; relationships: belongs to company, has participants (contacts), generates action items, personal intelligence, and business issues

- **Action Item**: Represents a commitment or task from a meeting; attributes include description, assignee, due date, status, priority, completion date, last followed-up timestamp, confidence score; relationships: extracted from meeting, assigned to contact

- **Personal Intelligence**: Represents a personal detail for relationship building; attributes include contact, description, category, reminder date, status, date used, confidence score; relationships: linked to contact, extracted from meeting

- **Business Issue**: Represents a risk, concern, or challenge; attributes include description, company, category, severity, status, resolution date, confidence score; relationships: belongs to company, extracted from meeting, linked to related action items

- **Calendar Event**: Represents a scheduled meeting from Outlook; attributes include event ID, title, start/end time, attendees, location, calendar source; relationships: links to meeting record when transcript is added

## Success Criteria *(mandatory)*

### Measurable Outcomes

**Efficiency Gains**
- **SC-001**: Users reduce meeting preparation time from 10 minutes per meeting to 2 minutes per meeting (80% reduction)
- **SC-002**: Users spend less than 5 minutes daily reviewing and managing action items (down from 30 minutes manual tracking)
- **SC-003**: Morning email briefing delivered at exactly 6:00 AM in user's timezone with 99.5% on-time delivery rate

**Effectiveness Improvements**
- **SC-004**: 95% of tracked action items completed by due date (up from unmeasured baseline)
- **SC-005**: Users reference personal intelligence notes in 60% of meetings (measured via "Used" status updates)
- **SC-006**: Business issues identified and addressed 40% faster (measured by time from identification to resolution)

**System Reliability**
- **SC-007**: AI extraction achieves 95% precision and 85% recall for action items (measured against manual review sample)
- **SC-008**: AI assignee identification achieves 90% accuracy (measured against manual review sample)
- **SC-009**: Web dashboard pages load in under 2 seconds for 95th percentile of requests
- **SC-010**: Meeting transcript processing completes within 2 hours of meeting end for 95% of meetings

**User Adoption**
- **SC-011**: 90% of users open daily digest emails within 2 hours of delivery
- **SC-012**: Users access web dashboard at least 3 times per week
- **SC-013**: 80% of action items receive status updates within 48 hours of creation

**Data Quality**
- **SC-014**: Calendar sync operates with 99.5% uptime and captures 100% of calendar events
- **SC-015**: Less than 5% of extracted action items require manual correction of assignee or due date
- **SC-016**: Zero data loss when syncing changes back to Airtable (100% write success rate)

### Assumptions

- Users already have Airtable workspace with Read.ai integration configured and actively adding meeting transcripts
- Users have Microsoft Outlook calendars for calendar sync and Microsoft 365 accounts for email sending
- Meeting transcripts in Airtable include speaker identification and timestamps from Read.ai
- Users are willing to grant OAuth permissions for calendar read and email send access
- Average meeting length is 30-60 minutes producing transcripts of 3,000-10,000 words
- Users attend 20-50 meetings per week on average
- Action items typically have 1-2 week timeframes between assignment and due date
- Most action items have clear assignees mentioned in transcript context
- Personal details shared in meetings are appropriate to reference in future conversations
- Users prefer email as primary delivery mechanism with web UI as secondary reference tool
