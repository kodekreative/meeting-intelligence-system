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
