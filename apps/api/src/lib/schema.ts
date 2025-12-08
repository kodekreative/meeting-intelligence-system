/**
 * Airtable Schema Definitions
 *
 * This file defines the structure of all Airtable tables used in the
 * Meeting Intelligence System. It serves as the source of truth for
 * data model and provides type-safe access to Airtable records.
 */

export const AIRTABLE_TABLES = {
  MEETINGS: 'tbluMB1hHh3K5T9Ka', // Use table ID for personal access token compatibility
  COMPANIES: 'Companies',
  CONTACTS: 'Contacts',
  ACTION_ITEMS: 'Action Items',
  PERSONAL_INTELLIGENCE: 'Personal Intelligence',
  BUSINESS_ISSUES: 'Business Issues',
  USERS: 'Users',
  THEMES: 'themes',
  MEETING_THEMES: 'meeting_themes',
  THEME_OUTPUTS: 'theme_outputs',
  CALENDAR_EVENTS: 'Calendar Events',
  EMAIL_PREFERENCES: 'Email Preferences',
  TASKS: 'Tasks',
  TEAM_MEMBER_TOKENS: 'Team Member Tokens',
  TASK_COMMENTS: 'Task Comments',
  TASK_ACTIVITY: 'Task Activity',
} as const

/**
 * Meetings Table
 * Source of truth for all meeting data from Read.ai
 *
 * Actual fields from Airtable:
 * Name, Session ID, Title, Start Time, Participants, Owner Name, Owner Email,
 * Meeting Summary, Action Items, Key Questions, Topics, Report URL,
 * Chapter Summaries, Transcript Speakers, Speaker Blocks
 */
export interface MeetingRecord {
  id: string
  fields: {
    'Name'?: string // Meeting name/identifier
    'Session ID'?: string // Read.ai session identifier
    'Title'?: string // Meeting title
    'Start Time'?: string // ISO date string for meeting start
    'Participants'?: string // Comma-separated participant names
    'Owner Name'?: string // Meeting owner
    'Owner Email'?: string // Owner's email address
    'Meeting Summary'?: string // AI-generated summary from Read.ai
    'Action Items'?: string // Extracted action items
    'Key Questions'?: string[] | string // Important questions raised
    'Topics'?: string[] | string // Array of topics discussed
    'Report URL'?: string // Link to Read.ai report
    'Chapter Summaries'?: string // Chapter-by-chapter summaries
    'Transcript Speakers'?: string // Speaker identification
    'Speaker Blocks'?: string // Speaker-attributed transcript blocks
    'theme'?: string[] // Link to themes table
  }
}

/**
 * Companies Table
 * Organize meetings and context by business entity
 */
export interface CompanyRecord {
  id: string
  fields: {
    'Company Name': string
    'Type': 'Portfolio Company' | 'Prospect' | 'Service Provider' | 'Other'
    'Relationship Status': 'Active' | 'Pipeline' | 'Past' | 'Watching'
    'Industry': string
    'Owner': string[] // Link to Users table
    'First Meeting Date': string // ISO date
    'Last Meeting Date': string // ISO date
    'Meeting Count': number // Calculated field
    'Meetings': string[] // Link to Meetings table
    'Action Items': string[] // Link to Action Items table
    'Business Issues': string[] // Link to Business Issues table
    'theme'?: string[] // Link to themes table
    'Created': string
    'Last Modified': string
  }
}

/**
 * Contacts Table
 * Track individuals across meetings and companies
 */
export interface ContactRecord {
  id: string
  fields: {
    'Full Name': string
    'Email': string
    'Company': string[] // Link to Companies table
    'Role': string
    'First Met': string // ISO date
    'Last Contact': string // ISO date
    'Meeting Count': number // Calculated field
    'Relationship Score': number // 0-100 calculated score
    'Meetings': string[] // Link to Meetings table
    'Action Items': string[] // Link to Action Items table
    'Personal Intelligence': string[] // Link to Personal Intelligence table
    'Created': string
    'Last Modified': string
  }
}

/**
 * Action Items Table
 * Extracted commitments requiring follow-through
 */
export interface ActionItemRecord {
  id: string
  fields: {
    'Task Description': string
    'Assignee': string // Assignee name as text
    'Due Date': string // ISO date
    'Status': 'Open' | 'In Progress' | 'Complete' | 'Overdue'
    'Priority': 'Low' | 'Medium' | 'High' | 'Critical'
    'Source Meeting': string[] // Link to Meetings table
    'Title'?: string[] // Lookup field from Source Meeting (returns array)
    'Company': string[] // Link to Companies table (lookup from meeting)
    'Completed At': string // ISO timestamp
    'Last Followed Up': string // ISO timestamp
    'Extraction Confidence': number // 0-1 confidence score
    'Notes': string // Additional context
    'theme'?: string[] // Link to themes table
    'Include in Daily Email'?: boolean // Whether to include in daily email reports (default: true)
    'Created': string
    'Last Modified': string
  }
}

/**
 * Personal Intelligence Table
 * Personal context for relationship building
 */
export interface PersonalIntelligenceRecord {
  id: string
  fields: {
    'Contact': string[] // Link to Contacts table
    'Detail Description': string
    'Category': 'Family' | 'Health' | 'Hobbies' | 'Career' | 'Travel' | 'Other'
    'Date Captured': string // ISO date
    'Source Meeting': string[] // Link to Meetings table
    'Reminder Date': string // ISO date for follow-up
    'Status': 'Pending' | 'Used' | 'Expired'
    'Used At': string // ISO timestamp when referenced
    'Extraction Confidence': number // 0-1 confidence score
    'Notes': string
    'Created': string
    'Last Modified': string
  }
}

/**
 * Business Issues Table
 * Track risks and concerns across portfolio
 */
export interface BusinessIssueRecord {
  id: string
  fields: {
    'Issue Description': string
    'Company': string[] // Link to Companies table
    'Category': 'Financial' | 'Operational' | 'Strategic' | 'Personnel' | 'Compliance'
    'Severity': 'Low' | 'Medium' | 'High' | 'Critical'
    'Status': 'Active' | 'Monitoring' | 'Resolved'
    'Date Identified': string // ISO date
    'Source Meeting': string[] // Link to Meetings table
    'Related Action Items': string[] // Link to Action Items table
    'Resolved At': string // ISO timestamp
    'Extraction Confidence': number // 0-1 confidence score
    'Notes': string
    'theme'?: string[] // Link to themes table
    'Created': string
    'Last Modified': string
  }
}

/**
 * Users Table
 * Future multi-user support with role-based access
 */
export interface UserRecord {
  id: string
  fields: {
    'Full Name': string
    'Email': string
    'Role': 'Admin' | 'Managing Partner' | 'Partner' | 'Analyst'
    'Is Active': boolean
    'Timezone': string // IANA timezone string
    'Calendar IDs': string[] // Array of synced Outlook calendar IDs
    'Email Preferences': string // JSON string of preferences
    'Last Login': string // ISO timestamp
    'Microsoft Access Token': string // Encrypted OAuth access token
    'Microsoft Refresh Token': string // Encrypted OAuth refresh token
    'Microsoft Token Expires At': string // ISO timestamp
    'iCalendar URL': string // Outlook.com iCalendar/ICS URL (simpler alternative to OAuth)
    'Calendar Connected': boolean // Whether calendar is connected
    'Last Calendar Sync': string // ISO timestamp of last sync
    'Created': string
    'Last Modified': string
  }
}

/**
 * Themes Table
 * Custom themes for organizing meetings within a specific title/company
 */
export interface ThemeRecord {
  id: string
  fields: {
    'name': string
    'description'?: string
    'color_code': string // Hex color (#RRGGBB)
    'icon'?: string // Icon identifier (lucide-react icon name)
    'company_id': string[] // Link to Companies table - theme belongs to this company
    'is_active': boolean // Soft delete flag
    'created_at': string // ISO timestamp
    'updated_at': string // ISO timestamp
  }
}

/**
 * Meeting Themes Table
 * Junction table linking meetings to themes with optional notes
 */
export interface MeetingThemeRecord {
  id: string
  fields: {
    'meeting_id': string[] // Link to Meetings table
    'theme_id': string[] // Link to themes table
    'notes'?: string // Optional context for why this theme was applied
    'created_at': string // ISO timestamp
    'created_by': string // User ID who tagged the meeting
  }
}

/**
 * Theme Outputs Table
 * AI-generated insights and content organized by theme from meeting transcripts
 */
export interface ThemeOutputRecord {
  id: string
  fields: {
    'meeting_id': string[] // Link to Meetings table
    'theme_id': string[] // Link to themes table
    'output_type': 'Summary' | 'Key Points' | 'Decisions' | 'Action Items' | 'Questions' | 'Risks' | 'Custom'
    'content': string // The AI-generated text content
    'confidence_score': number // 0-1 confidence score from AI
    'source_section'?: string // Reference to specific transcript section/chapter
    'metadata'?: string // JSON string for additional structured data
    'created_at': string // ISO timestamp
    'updated_at': string // ISO timestamp
  }
}

/**
 * Calendar Events Table
 * Synced calendar events from Microsoft Outlook/Exchange
 */
export interface CalendarEventRecord {
  id: string
  fields: {
    'Calendar Event ID': string // Microsoft Graph event ID
    'Subject': string // Meeting subject/title
    'Start Time': string // ISO timestamp
    'End Time': string // ISO timestamp
    'Location': string // Meeting location
    'Attendees': string // Comma-separated email addresses
    'Organizer': string // Organizer email address
    'Description': string // Event body/description
    'Is Online Meeting': boolean // Whether it's an online meeting
    'Meeting URL': string // Online meeting URL (Teams, etc.)
    'User': string[] // Link to Users table
    'Last Synced': string // ISO timestamp of last sync
    'Created': string // ISO timestamp
    'Last Modified': string // ISO timestamp
  }
}

/**
 * Email Preferences Table
 * Controls whether specific assignees receive daily email reports
 */
export interface EmailPreferencesRecord {
  id: string
  fields: {
    'Assignee Name': string // Canonical assignee name (e.g., "Bill Shansky")
    'Email Enabled': boolean // Whether to include this assignee's tasks in daily emails
    'Notes'?: string // Optional notes about this preference
    'Created': string // ISO timestamp
    'Last Modified': string // ISO timestamp
  }
}

/**
 * Tasks Table
 * Unified task storage for action items and manual tasks
 */
export interface TaskRecord {
  id: string
  fields: {
    'Name': string // Task title
    'Description'?: string // Task details and notes
    'Status': 'Open' | 'In Progress' | 'Blocked' | 'Done'
    'Priority': 'Low' | 'Medium' | 'High' | 'Critical'
    'Assignee'?: string[] // Link to Users table
    'Due Date'?: string // ISO date
    'Company'?: string[] // Link to Companies table
    'Source': 'Action Item' | 'Manual'
    'Source Action Item ID'?: string // ID of originating action item
    'Source Meeting ID'?: string // ID of originating meeting
    'Completed Date'?: string // ISO date when marked Done
    'Reminder Date'?: string // ISO date when to send reminder
    'Parent Task ID'?: string // ID of parent task (for subtasks)
    'Assignee Name'?: string // Denormalized assignee name for filtering
  }
}

/**
 * Team Member Tokens Table
 * Secure access tokens for team member task pages
 *
 * Security Design:
 * - Each team member gets a unique, cryptographically secure token
 * - Tokens are non-guessable (UUID v4 or similar)
 * - One token per assignee name - regenerated on demand
 * - Tokens can be revoked by setting Is Active to false
 * - Token validates: assignee can only see their own tasks
 */
export interface TeamMemberTokenRecord {
  id: string
  fields: {
    'Assignee Name': string // Canonical assignee name (matches Task assignee)
    'Token': string // Cryptographically secure unique token (UUID v4)
    'Email'?: string // Optional email address for the team member
    'Is Active': boolean // Whether this token is valid
    'Last Accessed'?: string // ISO timestamp of last page access
    'Access Count': number // Number of times the page was accessed
    'Reminder Frequency'?: 'daily' | 'weekly' | 'none' // How often to send task reminders
    'Created': string // ISO timestamp
    'Last Modified': string // ISO timestamp
  }
}

/**
 * Task Comments Table
 * Comments and questions on tasks from team members or admins
 *
 * Used for:
 * - Team members asking questions about tasks
 * - Admins providing clarification or updates
 * - Communication thread history
 */
export interface TaskCommentRecord {
  id: string
  fields: {
    'Task ID': string // ID of the task being commented on
    'Task Table': 'Tasks' | 'Action Items' // Which table the task is in
    'Author Name': string // Name of the commenter
    'Author Type': 'team_member' | 'admin' // Who created the comment
    'Content': string // The comment text
    'Created At': string // ISO timestamp
  }
}

/**
 * Task Activity Table
 * Tracks all changes made to tasks for audit/history purposes
 *
 * Used for:
 * - Showing task history timeline
 * - Audit trail of changes
 * - Understanding task progression
 */
export interface TaskActivityRecord {
  id: string
  fields: {
    'Task ID': string // ID of the task
    'Task Table': 'Tasks' | 'Action Items' // Which table the task is in
    'Action': 'created' | 'status_changed' | 'priority_changed' | 'note_added' | 'help_requested' | 'extension_requested' | 'comment_added' | 'blocker_added'
    'Old Value'?: string // Previous value (for changes)
    'New Value'?: string // New value (for changes)
    'Actor Name': string // Who made the change
    'Actor Type': 'team_member' | 'admin' | 'system' // Type of actor
    'Created At': string // ISO timestamp
  }
}

/**
 * Type union of all record types for type safety
 */
export type AirtableRecord =
  | MeetingRecord
  | CompanyRecord
  | ContactRecord
  | ActionItemRecord
  | PersonalIntelligenceRecord
  | BusinessIssueRecord
  | UserRecord
  | ThemeRecord
  | MeetingThemeRecord
  | ThemeOutputRecord
  | CalendarEventRecord
  | EmailPreferencesRecord
  | TaskRecord
  | TeamMemberTokenRecord
  | TaskCommentRecord
  | TaskActivityRecord

/**
 * Field name mappings for easier access
 */
export const FIELD_NAMES = {
  MEETINGS: {
    MEETING_DATE: 'Meeting Date',
    NAME: 'Name',
    PARTICIPANTS: 'Participants',
    COMPANY: 'Company',
    SUMMARY: 'Summary',
    TRANSCRIPT: 'Transcript',
    SPEAKER_BLOCKS: 'Speaker Blocks',
    TOPICS: 'Topics',
    KEY_QUESTIONS: 'Key Questions',
    REPORT_URL: 'Report URL',
    PROCESSING_STATUS: 'Processing Status',
    PROCESSED_AT: 'Processed At',
  },
  COMPANIES: {
    COMPANY_NAME: 'Company Name',
    TYPE: 'Type',
    RELATIONSHIP_STATUS: 'Relationship Status',
    INDUSTRY: 'Industry',
    OWNER: 'Owner',
    FIRST_MEETING_DATE: 'First Meeting Date',
    LAST_MEETING_DATE: 'Last Meeting Date',
    MEETING_COUNT: 'Meeting Count',
  },
  CONTACTS: {
    FULL_NAME: 'Full Name',
    EMAIL: 'Email',
    COMPANY: 'Company',
    ROLE: 'Role',
    FIRST_MET: 'First Met',
    LAST_CONTACT: 'Last Contact',
    MEETING_COUNT: 'Meeting Count',
    RELATIONSHIP_SCORE: 'Relationship Score',
  },
  ACTION_ITEMS: {
    TASK_DESCRIPTION: 'Task Description',
    ASSIGNEE: 'Assignee',
    DUE_DATE: 'Due Date',
    STATUS: 'Status',
    PRIORITY: 'Priority',
    SOURCE_MEETING: 'Source Meeting',
    COMPANY: 'Company',
    COMPLETED_AT: 'Completed At',
    LAST_FOLLOWED_UP: 'Last Followed Up',
    EXTRACTION_CONFIDENCE: 'Extraction Confidence',
  },
  PERSONAL_INTELLIGENCE: {
    CONTACT: 'Contact',
    DETAIL_DESCRIPTION: 'Detail Description',
    CATEGORY: 'Category',
    DATE_CAPTURED: 'Date Captured',
    SOURCE_MEETING: 'Source Meeting',
    REMINDER_DATE: 'Reminder Date',
    STATUS: 'Status',
    USED_AT: 'Used At',
    EXTRACTION_CONFIDENCE: 'Extraction Confidence',
  },
  BUSINESS_ISSUES: {
    ISSUE_DESCRIPTION: 'Issue Description',
    COMPANY: 'Company',
    CATEGORY: 'Category',
    SEVERITY: 'Severity',
    STATUS: 'Status',
    DATE_IDENTIFIED: 'Date Identified',
    SOURCE_MEETING: 'Source Meeting',
    RELATED_ACTION_ITEMS: 'Related Action Items',
    RESOLVED_AT: 'Resolved At',
    EXTRACTION_CONFIDENCE: 'Extraction Confidence',
  },
  USERS: {
    FULL_NAME: 'Full Name',
    EMAIL: 'Email',
    ROLE: 'Role',
    IS_ACTIVE: 'Is Active',
    TIMEZONE: 'Timezone',
    CALENDAR_IDS: 'Calendar IDs',
    EMAIL_PREFERENCES: 'Email Preferences',
    LAST_LOGIN: 'Last Login',
  },
  THEMES: {
    NAME: 'name',
    DESCRIPTION: 'description',
    COLOR_CODE: 'color_code',
    ICON: 'icon',
    OWNER_ID: 'owner_id',
    IS_ACTIVE: 'is_active',
    CREATED_AT: 'created_at',
    UPDATED_AT: 'updated_at',
  },
  MEETING_THEMES: {
    MEETING_ID: 'meeting_id',
    THEME_ID: 'theme_id',
    NOTES: 'notes',
    CREATED_AT: 'created_at',
    CREATED_BY: 'created_by',
  },
  THEME_OUTPUTS: {
    MEETING_ID: 'meeting_id',
    THEME_ID: 'theme_id',
    OUTPUT_TYPE: 'output_type',
    CONTENT: 'content',
    CONFIDENCE_SCORE: 'confidence_score',
    SOURCE_SECTION: 'source_section',
    METADATA: 'metadata',
    CREATED_AT: 'created_at',
    UPDATED_AT: 'updated_at',
  },
  CALENDAR_EVENTS: {
    CALENDAR_EVENT_ID: 'Calendar Event ID',
    SUBJECT: 'Subject',
    START_TIME: 'Start Time',
    END_TIME: 'End Time',
    LOCATION: 'Location',
    ATTENDEES: 'Attendees',
    ORGANIZER: 'Organizer',
    DESCRIPTION: 'Description',
    IS_ONLINE_MEETING: 'Is Online Meeting',
    MEETING_URL: 'Meeting URL',
    USER: 'User',
    LAST_SYNCED: 'Last Synced',
  },
  TASKS: {
    NAME: 'Name',
    DESCRIPTION: 'Description',
    STATUS: 'Status',
    PRIORITY: 'Priority',
    ASSIGNEE: 'Assignee',
    ASSIGNEE_NAME: 'Assignee Name',
    DUE_DATE: 'Due Date',
    COMPANY: 'Company',
    SOURCE: 'Source',
    SOURCE_ACTION_ITEM_ID: 'Source Action Item ID',
    SOURCE_MEETING_ID: 'Source Meeting ID',
    COMPLETED_DATE: 'Completed Date',
    REMINDER_DATE: 'Reminder Date',
    PARENT_TASK_ID: 'Parent Task ID',
  },
  TEAM_MEMBER_TOKENS: {
    ASSIGNEE_NAME: 'Assignee Name',
    TOKEN: 'Token',
    EMAIL: 'Email',
    IS_ACTIVE: 'Is Active',
    LAST_ACCESSED: 'Last Accessed',
    ACCESS_COUNT: 'Access Count',
    REMINDER_FREQUENCY: 'Reminder Frequency',
  },
  TASK_COMMENTS: {
    TASK_ID: 'Task ID',
    TASK_TABLE: 'Task Table',
    AUTHOR_NAME: 'Author Name',
    AUTHOR_TYPE: 'Author Type',
    CONTENT: 'Content',
    CREATED_AT: 'Created At',
  },
  TASK_ACTIVITY: {
    TASK_ID: 'Task ID',
    TASK_TABLE: 'Task Table',
    ACTION: 'Action',
    OLD_VALUE: 'Old Value',
    NEW_VALUE: 'New Value',
    ACTOR_NAME: 'Actor Name',
    ACTOR_TYPE: 'Actor Type',
    CREATED_AT: 'Created At',
  },
} as const
