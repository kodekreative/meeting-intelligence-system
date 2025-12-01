/**
 * Frontend Type Definitions
 */

/**
 * API Response wrapper
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
    count?: number
    cached?: boolean
  }
}

/**
 * Theme Types
 */
export interface Theme {
  id: string
  name: string
  description?: string
  colorCode: string
  icon?: string
  companyId: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateThemeInput {
  name: string
  description?: string
  colorCode: string
  icon?: string
  companyId: string
}

export interface UpdateThemeInput {
  name?: string
  description?: string
  colorCode?: string
  icon?: string
  isActive?: boolean
}

export interface MeetingTheme {
  id: string
  meetingId: string
  themeId: string
  notes?: string
  createdAt: string
  createdBy: string
}

export interface TagMeetingInput {
  meetingId: string
  themeIds: string[]
  notes?: string
  createdBy: string
}

export interface TagCompanyInput {
  companyId: string
  themeIds: string[]
}

export interface ThemeMetrics {
  themeId: string
  themeName: string
  colorCode: string
  icon?: string
  meetingCount: number
  actionItemCount: number
  issueCount: number
  lastDiscussedAt?: string
  createdAt: string
}

export interface ThemeMeeting {
  id: string
  name?: string
  sessionId?: string
  title?: string
  startTime?: string
  participants?: string
  ownerName?: string
  ownerEmail?: string
  summary?: string
  reportUrl?: string
}

/**
 * Action Item Types
 */
export interface ActionItem {
  id: string
  taskDescription: string
  assignee?: string
  dueDate?: string
  status: 'Open' | 'In Progress' | 'Complete' | 'Overdue'
  priority: 'Low' | 'Medium' | 'High' | 'Critical'
  sourceMeetingId?: string
  sourceMeetingTitle?: string
  companyId?: string
  completedAt?: string
  lastFollowedUp?: string
  extractionConfidence?: number
  createdAt?: string
  theme?: string[]
}

/**
 * Meeting Types
 */
export interface Meeting {
  id: string
  name?: string
  sessionId?: string
  title?: string
  startTime?: string
  participants?: string
  ownerName?: string
  ownerEmail?: string
  summary?: string
  actionItems?: string
  keyQuestions?: string[]
  topics?: string[]
  reportUrl?: string
  chapterSummaries?: string
  transcriptSpeakers?: string
  speakerBlocks?: string
}

/**
 * Theme Summary Types
 */
export interface ThemeSummary {
  themeId: string
  themeName: string
  themeDescription?: string
  confidence: number
  summary: string[]
  actionItems: string[]
  decisions: string[]
  questions: string[]
}

/**
 * Company Types
 */
export interface Company {
  id: string
  name: string
  type: 'Portfolio Company' | 'Prospect' | 'Service Provider' | 'Other'
  relationshipStatus: 'Active' | 'Pipeline' | 'Past' | 'Watching'
  industry: string
  ownerId?: string
  firstMeetingDate?: string
  lastMeetingDate?: string
  meetingCount: number
  createdAt?: string
  updatedAt?: string
}
