/**
 * Shared Constants
 * Application-wide constants used across frontend and backend
 */

/**
 * API Configuration
 */
export const API = {
  VERSION: 'v1',
  BASE_PATH: '/api/v1',
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
} as const

/**
 * Cache Configuration
 */
export const CACHE = {
  TTL: {
    SHORT: 60, // 1 minute
    MEDIUM: 300, // 5 minutes
    LONG: 3600, // 1 hour
    DAILY: 86400, // 24 hours
  },
  KEYS: {
    MEETINGS: 'meetings',
    COMPANIES: 'companies',
    CONTACTS: 'contacts',
    ACTION_ITEMS: 'action_items',
    DASHBOARD: 'dashboard',
  },
} as const

/**
 * AI Processing Configuration
 */
export const AI = {
  CONFIDENCE_THRESHOLD: 0.7,
  MAX_TOKENS: 4000,
  TEMPERATURE: 0.2,
  MODELS: {
    GPT4_TURBO: 'gpt-4-turbo-preview',
    GPT4: 'gpt-4',
    GPT35_TURBO: 'gpt-3.5-turbo',
  },
} as const

/**
 * Action Item Configuration
 */
export const ACTION_ITEMS = {
  DEFAULT_DUE_DAYS: 5, // Default to Friday of current week
  FOLLOW_UP_THRESHOLDS: {
    IN_PROGRESS_DAYS: 7, // Follow up on In Progress items after 7 days
    APPROACHING_DUE_DAYS: 2, // Follow up on items 2 days before due date
  },
  STATUS: {
    OPEN: 'Open',
    IN_PROGRESS: 'In Progress',
    COMPLETE: 'Complete',
    OVERDUE: 'Overdue',
  },
  PRIORITY: {
    LOW: 'Low',
    MEDIUM: 'Medium',
    HIGH: 'High',
    CRITICAL: 'Critical',
  },
} as const

/**
 * Email Configuration
 */
export const EMAIL = {
  DEFAULT_SEND_HOUR: 6, // 6 AM
  DEFAULT_SEND_MINUTE: 0,
  DEFAULT_TIMEZONE: 'America/New_York',
  TYPES: {
    MEETING_PREP: 'meeting_prep',
    ACTION_ITEMS: 'action_items',
    FOLLOW_UPS: 'follow_ups',
    BUSINESS_ISSUES: 'business_issues',
    PERSONAL_INTEL: 'personal_intel',
  },
  TEMPLATES: {
    MEETING_PREP: 'meeting-prep',
    ACTION_ITEMS: 'action-items',
    FOLLOW_UPS: 'follow-ups',
    BUSINESS_ISSUES: 'business-issues',
    PERSONAL_INTEL: 'personal-intel',
  },
} as const

/**
 * Date & Time Formats
 */
export const DATE_FORMATS = {
  ISO: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
  DATE_ONLY: 'yyyy-MM-dd',
  DISPLAY_DATE: 'MMM d, yyyy',
  DISPLAY_DATETIME: 'MMM d, yyyy h:mm a',
  TIME_ONLY: 'h:mm a',
} as const

/**
 * Personal Intelligence Categories
 */
export const PERSONAL_INTEL_CATEGORIES = {
  FAMILY: 'Family',
  HEALTH: 'Health',
  HOBBIES: 'Hobbies',
  CAREER: 'Career',
  TRAVEL: 'Travel',
  OTHER: 'Other',
} as const

/**
 * Business Issue Categories
 */
export const ISSUE_CATEGORIES = {
  FINANCIAL: 'Financial',
  OPERATIONAL: 'Operational',
  STRATEGIC: 'Strategic',
  PERSONNEL: 'Personnel',
  COMPLIANCE: 'Compliance',
} as const

/**
 * Issue Severity Levels
 */
export const ISSUE_SEVERITY = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
} as const

/**
 * Company Types
 */
export const COMPANY_TYPES = {
  PORTFOLIO: 'Portfolio Company',
  PROSPECT: 'Prospect',
  SERVICE_PROVIDER: 'Service Provider',
  OTHER: 'Other',
} as const

/**
 * Relationship Status
 */
export const RELATIONSHIP_STATUS = {
  ACTIVE: 'Active',
  PIPELINE: 'Pipeline',
  PAST: 'Past',
  WATCHING: 'Watching',
} as const

/**
 * User Roles
 */
export const USER_ROLES = {
  ADMIN: 'Admin',
  MANAGING_PARTNER: 'Managing Partner',
  PARTNER: 'Partner',
  ANALYST: 'Analyst',
} as const

/**
 * Processing Status
 */
export const PROCESSING_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETE: 'complete',
  FAILED: 'failed',
} as const

/**
 * Pagination Defaults
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const

/**
 * Calendar Sync
 */
export const CALENDAR = {
  SYNC_INTERVAL_MINUTES: 60, // Poll calendars every 60 minutes
  LOOK_AHEAD_DAYS: 30, // Sync events up to 30 days in future
  LOOK_BACK_DAYS: 7, // Include events from last 7 days
} as const

/**
 * Feature Flags (for gradual rollout)
 */
export const FEATURES = {
  ENABLE_AI_EXTRACTION: true,
  ENABLE_DAILY_EMAILS: true,
  ENABLE_CALENDAR_SYNC: true,
  ENABLE_FOLLOW_UPS: true,
  ENABLE_BUSINESS_ISSUES: true,
  ENABLE_PERSONAL_INTEL: true,
} as const

/**
 * Error Messages
 */
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access forbidden',
  NOT_FOUND: 'Resource not found',
  VALIDATION_ERROR: 'Validation error',
  INTERNAL_ERROR: 'Internal server error',
  AIRTABLE_ERROR: 'Error communicating with Airtable',
  OPENAI_ERROR: 'Error communicating with OpenAI',
  MICROSOFT_GRAPH_ERROR: 'Error communicating with Microsoft Graph',
} as const

/**
 * Success Messages
 */
export const SUCCESS_MESSAGES = {
  ACTION_ITEM_CREATED: 'Action item created successfully',
  ACTION_ITEM_UPDATED: 'Action item updated successfully',
  MEETING_PROCESSED: 'Meeting processed successfully',
  EMAIL_SENT: 'Email sent successfully',
  CALENDAR_SYNCED: 'Calendar synced successfully',
} as const

/**
 * Regex Patterns
 */
export const PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL: /^https?:\/\/.+/,
  DATE_ISO: /^\d{4}-\d{2}-\d{2}$/,
  TIME_24H: /^([01]\d|2[0-3]):([0-5]\d)$/,
} as const
