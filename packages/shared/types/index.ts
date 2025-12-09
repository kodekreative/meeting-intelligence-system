/**
 * Shared Types
 * Type definitions used across frontend and backend
 */

/**
 * API Response wrapper for consistent response format
 */
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    message: string
    code?: string
    details?: unknown
  }
  meta?: {
    page?: number
    limit?: number
    total?: number
  }
}

/**
 * User types
 */
export type UserRole = 'Admin' | 'Managing Partner' | 'Partner' | 'Analyst'

export interface User {
  id: string
  email: string
  fullName: string
  role: UserRole
  timezone: string
  isActive: boolean
  calendarIds: string[]
  emailPreferences: EmailPreferences
}

export interface EmailPreferences {
  enableDailyDigest: boolean
  digestTime: string // HH:MM format
  enableMeetingPrep: boolean
  enableActionItems: boolean
  enableFollowUps: boolean
  enableBusinessIssues: boolean
  enablePersonalIntel: boolean
}

/**
 * Meeting types
 */
export interface Meeting {
  id: string
  meetingDate: Date
  title: string
  participants: string[]
  companyId?: string
  companyName?: string
  summary?: string
  transcript?: string
  topics: string[]
  keyQuestions: string[]
  reportUrl?: string
  processingStatus: 'pending' | 'processing' | 'complete' | 'failed'
  processedAt?: Date
  createdAt: Date
  updatedAt: Date
}

/**
 * Company types
 */
export type CompanyType = 'Portfolio Company' | 'Prospect' | 'Service Provider' | 'Other'
export type RelationshipStatus = 'Active' | 'Pipeline' | 'Past' | 'Watching'

export interface Company {
  id: string
  name: string
  type: CompanyType
  relationshipStatus: RelationshipStatus
  industry: string
  ownerId?: string
  firstMeetingDate?: Date
  lastMeetingDate?: Date
  meetingCount: number
  createdAt: Date
  updatedAt: Date
}

/**
 * Contact types
 */
export interface Contact {
  id: string
  fullName: string
  email?: string
  companyId?: string
  companyName?: string
  role?: string
  firstMet?: Date
  lastContact?: Date
  meetingCount: number
  relationshipScore?: number
  createdAt: Date
  updatedAt: Date
}

/**
 * Action Item types
 */
export type ActionItemStatus = 'Open' | 'In Progress' | 'Complete' | 'Overdue'
export type ActionItemPriority = 'Low' | 'Medium' | 'High' | 'Critical'

export interface ActionItem {
  id: string
  taskDescription: string
  assigneeId?: string
  assigneeName?: string
  dueDate?: Date
  status: ActionItemStatus
  priority: ActionItemPriority
  sourceMeetingId?: string
  companyId?: string
  companyName?: string
  completedAt?: Date
  lastFollowedUp?: Date
  extractionConfidence?: number
  notes?: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Personal Intelligence types
 */
export type PersonalIntelCategory = 'Family' | 'Health' | 'Hobbies' | 'Career' | 'Travel' | 'Other'
export type PersonalIntelStatus = 'Pending' | 'Used' | 'Expired'

export interface PersonalIntelligence {
  id: string
  contactId: string
  contactName: string
  detailDescription: string
  category: PersonalIntelCategory
  dateCaptured: Date
  sourceMeetingId?: string
  reminderDate?: Date
  status: PersonalIntelStatus
  usedAt?: Date
  extractionConfidence?: number
  notes?: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Business Issue types
 */
export type IssueCategory = 'Financial' | 'Operational' | 'Strategic' | 'Personnel' | 'Compliance'
export type IssueSeverity = 'Low' | 'Medium' | 'High' | 'Critical'
export type IssueStatus = 'Active' | 'Monitoring' | 'Resolved'

export interface BusinessIssue {
  id: string
  issueDescription: string
  companyId: string
  companyName: string
  category: IssueCategory
  severity: IssueSeverity
  status: IssueStatus
  dateIdentified: Date
  sourceMeetingId?: string
  relatedActionItemIds: string[]
  resolvedAt?: Date
  extractionConfidence?: number
  notes?: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Dashboard data types
 */
export interface TodaysDashboard {
  meetings: Meeting[]
  myActionItems: {
    dueToday: ActionItem[]
    overdue: ActionItem[]
    dueThisWeek: ActionItem[]
  }
  followUps: ActionItem[]
  businessIssues: BusinessIssue[]
  personalFollowUps: PersonalIntelligence[]
}

export interface CompanyDashboard {
  company: Company
  meetings: Meeting[]
  keyContacts: Contact[]
  activeIssues: BusinessIssue[]
  pendingActionItems: ActionItem[]
  summary?: string
}

/**
 * AI Extraction types
 */
export interface ExtractedActionItem {
  taskDescription: string
  assigneeName?: string
  dueDate?: string
  confidence: number
  rawText: string
}

export interface ExtractedPersonalIntel {
  contactName: string
  detailDescription: string
  category: PersonalIntelCategory
  suggestedReminderDate?: string
  confidence: number
  rawText: string
}

export interface ExtractedBusinessIssue {
  issueDescription: string
  category: IssueCategory
  severity: IssueSeverity
  relatedActions?: string[]
  confidence: number
  rawText: string
}

export interface ExtractionResult {
  actionItems: ExtractedActionItem[]
  personalIntelligence: ExtractedPersonalIntel[]
  businessIssues: ExtractedBusinessIssue[]
  processingTime: number
  errors?: string[]
}

/**
 * Email types
 */
export interface EmailTemplate {
  to: string
  from: string
  subject: string
  html: string
  text: string
}

export interface MeetingPrepEmail extends EmailTemplate {
  meetings: Meeting[]
  historicalContext: Record<string, unknown>
}

/**
 * Calendar types
 */
export interface CalendarEvent {
  id: string
  title: string
  startTime: Date
  endTime: Date
  attendees: Array<{ name: string; email: string }>
  location?: string
  calendarSource: string
}

/**
 * Pagination types
 */
export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  items: T[]
  page: number
  limit: number
  total: number
  totalPages: number
}
