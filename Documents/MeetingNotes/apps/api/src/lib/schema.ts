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
    'Assignee': string[] // Link to Contacts table
    'Due Date': string // ISO date
    'Status': 'Open' | 'In Progress' | 'Complete' | 'Overdue'
    'Priority': 'Low' | 'Medium' | 'High' | 'Critical'
    'Source Meeting': string[] // Link to Meetings table
    'Company': string[] // Link to Companies table (lookup from meeting)
    'Completed At': string // ISO timestamp
    'Last Followed Up': string // ISO timestamp
    'Extraction Confidence': number // 0-1 confidence score
    'Notes': string // Additional context
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
    'Created': string
    'Last Modified': string
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
} as const
