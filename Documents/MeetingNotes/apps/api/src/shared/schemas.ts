/**
 * Shared Zod Schemas
 * Runtime validation schemas used across frontend and backend
 */

import { z } from 'zod'

/**
 * API Response Schema
 */
export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z
    .object({
      message: z.string(),
      code: z.string().optional(),
      details: z.unknown().optional(),
    })
    .optional(),
  meta: z
    .object({
      page: z.number().optional(),
      limit: z.number().optional(),
      total: z.number().optional(),
    })
    .optional(),
})

/**
 * User Schemas
 */
export const userRoleSchema = z.enum(['Admin', 'Managing Partner', 'Partner', 'Analyst'])

export const emailPreferencesSchema = z.object({
  enableDailyDigest: z.boolean().default(true),
  digestTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  enableMeetingPrep: z.boolean().default(true),
  enableActionItems: z.boolean().default(true),
  enableFollowUps: z.boolean().default(true),
  enableBusinessIssues: z.boolean().default(true),
  enablePersonalIntel: z.boolean().default(true),
})

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string().min(1),
  role: userRoleSchema,
  timezone: z.string(),
  isActive: z.boolean(),
  calendarIds: z.array(z.string()),
  emailPreferences: emailPreferencesSchema,
})

/**
 * Meeting Schemas
 */
export const processingStatusSchema = z.enum(['pending', 'processing', 'complete', 'failed'])

export const meetingSchema = z.object({
  id: z.string(),
  meetingDate: z.date(),
  title: z.string(),
  participants: z.array(z.string()),
  companyId: z.string().optional(),
  companyName: z.string().optional(),
  summary: z.string().optional(),
  transcript: z.string().optional(),
  topics: z.array(z.string()),
  keyQuestions: z.array(z.string()),
  reportUrl: z.string().url().optional(),
  processingStatus: processingStatusSchema,
  processedAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

/**
 * Company Schemas
 */
export const companyTypeSchema = z.enum([
  'Portfolio Company',
  'Prospect',
  'Service Provider',
  'Other',
])

export const relationshipStatusSchema = z.enum(['Active', 'Pipeline', 'Past', 'Watching'])

export const companySchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  type: companyTypeSchema,
  relationshipStatus: relationshipStatusSchema,
  industry: z.string(),
  ownerId: z.string().optional(),
  firstMeetingDate: z.date().optional(),
  lastMeetingDate: z.date().optional(),
  meetingCount: z.number().int().nonnegative(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

/**
 * Contact Schemas
 */
export const contactSchema = z.object({
  id: z.string(),
  fullName: z.string().min(1),
  email: z.string().email().optional(),
  companyId: z.string().optional(),
  companyName: z.string().optional(),
  role: z.string().optional(),
  firstMet: z.date().optional(),
  lastContact: z.date().optional(),
  meetingCount: z.number().int().nonnegative(),
  relationshipScore: z.number().min(0).max(100).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

/**
 * Action Item Schemas
 */
export const actionItemStatusSchema = z.enum(['Open', 'In Progress', 'Complete', 'Overdue'])

export const actionItemPrioritySchema = z.enum(['Low', 'Medium', 'High', 'Critical'])

export const actionItemSchema = z.object({
  id: z.string(),
  taskDescription: z.string().min(1),
  assigneeId: z.string().optional(),
  assigneeName: z.string().optional(),
  dueDate: z.date().optional(),
  status: actionItemStatusSchema,
  priority: actionItemPrioritySchema,
  sourceMeetingId: z.string().optional(),
  companyId: z.string().optional(),
  companyName: z.string().optional(),
  completedAt: z.date().optional(),
  lastFollowedUp: z.date().optional(),
  extractionConfidence: z.number().min(0).max(1).optional(),
  notes: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const updateActionItemSchema = z.object({
  taskDescription: z.string().min(1).optional(),
  assigneeId: z.string().optional(),
  assignee: z.string().optional(),
  dueDate: z.string().optional(), // Changed to string for API compatibility
  status: actionItemStatusSchema.optional(),
  priority: actionItemPrioritySchema.optional(),
  notes: z.string().optional(),
  includeInDailyEmail: z.boolean().optional(), // Toggle for daily email inclusion
})

/**
 * Email Preferences Schemas
 */
export const emailPreferenceSchema = z.object({
  id: z.string(),
  assigneeName: z.string().min(1),
  emailEnabled: z.boolean(),
  notes: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const upsertEmailPreferenceSchema = z.object({
  assigneeName: z.string().min(1, 'Assignee name is required'),
  emailEnabled: z.boolean(),
  notes: z.string().optional(),
})

/**
 * Personal Intelligence Schemas
 */
export const personalIntelCategorySchema = z.enum([
  'Family',
  'Health',
  'Hobbies',
  'Career',
  'Travel',
  'Other',
])

export const personalIntelStatusSchema = z.enum(['Pending', 'Used', 'Expired'])

export const personalIntelligenceSchema = z.object({
  id: z.string(),
  contactId: z.string(),
  contactName: z.string(),
  detailDescription: z.string().min(1),
  category: personalIntelCategorySchema,
  dateCaptured: z.date(),
  sourceMeetingId: z.string().optional(),
  reminderDate: z.date().optional(),
  status: personalIntelStatusSchema,
  usedAt: z.date().optional(),
  extractionConfidence: z.number().min(0).max(1).optional(),
  notes: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

/**
 * Business Issue Schemas
 */
export const issueCategorySchema = z.enum([
  'Financial',
  'Operational',
  'Strategic',
  'Personnel',
  'Compliance',
])

export const issueSeveritySchema = z.enum(['Low', 'Medium', 'High', 'Critical'])

export const issueStatusSchema = z.enum(['Active', 'Monitoring', 'Resolved'])

export const businessIssueSchema = z.object({
  id: z.string(),
  issueDescription: z.string().min(1),
  companyId: z.string(),
  companyName: z.string(),
  category: issueCategorySchema,
  severity: issueSeveritySchema,
  status: issueStatusSchema,
  dateIdentified: z.date(),
  sourceMeetingId: z.string().optional(),
  relatedActionItemIds: z.array(z.string()),
  resolvedAt: z.date().optional(),
  extractionConfidence: z.number().min(0).max(1).optional(),
  notes: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

/**
 * Pagination Schemas
 */
export const paginationParamsSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})

/**
 * Query Parameter Schemas
 */
export const dateRangeSchema = z.object({
  fromDate: z.date().optional(),
  toDate: z.date().optional(),
})

export const filterByStatusSchema = z.object({
  status: z.string().optional(),
})

export const filterByCompanySchema = z.object({
  companyId: z.string().optional(),
})

/**
 * Theme Schemas
 */
export const themeSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  colorCode: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color code (e.g., #FF5733)'),
  icon: z.string().optional(),
  companyId: z.string(),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const createThemeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  colorCode: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color code (e.g., #FF5733)'),
  icon: z.string().optional(),
  companyId: z.string().min(1, 'Company ID is required'),
})

export const updateThemeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less').optional(),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  colorCode: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color code (e.g., #FF5733)').optional(),
  icon: z.string().optional(),
  isActive: z.boolean().optional(),
})

export const meetingThemeSchema = z.object({
  id: z.string(),
  meetingId: z.string(),
  themeId: z.string(),
  notes: z.string().max(1000).optional(),
  createdAt: z.date(),
  createdBy: z.string(),
})

export const createMeetingThemeSchema = z.object({
  meetingId: z.string().min(1, 'Meeting ID is required'),
  themeId: z.string().min(1, 'Theme ID is required'),
  notes: z.string().max(1000, 'Notes must be 1000 characters or less').optional(),
  createdBy: z.string().min(1, 'Created by is required'),
})

export const tagMeetingSchema = z.object({
  meetingId: z.string().min(1, 'Meeting ID is required'),
  themeIds: z.array(z.string().min(1)).min(1, 'At least one theme ID is required'),
  notes: z.string().max(1000).optional(),
  createdBy: z.string().min(1, 'Created by is required'),
})

export const untagMeetingSchema = z.object({
  meetingId: z.string().min(1, 'Meeting ID is required'),
  themeId: z.string().min(1, 'Theme ID is required'),
})

/**
 * Theme Analysis Schemas
 */
export const themeMetricsSchema = z.object({
  themeId: z.string(),
  themeName: z.string(),
  colorCode: z.string(),
  icon: z.string().optional(),
  meetingCount: z.number().int().nonnegative(),
  actionItemCount: z.number().int().nonnegative(),
  issueCount: z.number().int().nonnegative(),
  lastDiscussedAt: z.date().optional(),
  createdAt: z.date(),
})

export const themeMeetingsSummarySchema = z.object({
  themeId: z.string(),
  themeName: z.string(),
  meetings: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      startTime: z.date(),
      participants: z.array(z.string()),
      notes: z.string().optional(),
    })
  ),
  actionItems: z.array(
    z.object({
      id: z.string(),
      taskDescription: z.string(),
      assignee: z.string().optional(),
      status: actionItemStatusSchema,
      priority: actionItemPrioritySchema,
    })
  ),
  businessIssues: z.array(
    z.object({
      id: z.string(),
      issueDescription: z.string(),
      severity: issueSeveritySchema,
      status: issueStatusSchema,
    })
  ),
})
