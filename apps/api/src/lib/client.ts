/**
 * Airtable Client Wrapper
 *
 * Type-safe wrapper around Airtable API with built-in error handling,
 * retry logic, and caching support.
 */

import Airtable, { FieldSet, Records } from 'airtable'
import type {
  MeetingRecord,
  CompanyRecord,
  ContactRecord,
  ActionItemRecord,
  PersonalIntelligenceRecord,
  BusinessIssueRecord,
  UserRecord,
  ThemeRecord,
  MeetingThemeRecord,
  ThemeOutputRecord,
  EmailPreferencesRecord,
} from './schema'
import { AIRTABLE_TABLES } from './schema'

export interface AirtableConfig {
  apiKey: string
  baseId: string
  maxRetries?: number
  retryDelay?: number
}

export class AirtableClient {
  private base: Airtable.Base
  private maxRetries: number
  private retryDelay: number

  constructor(config: AirtableConfig) {
    if (!config.apiKey) {
      throw new Error('Airtable API key is required')
    }
    if (!config.baseId) {
      throw new Error('Airtable base ID is required')
    }

    Airtable.configure({ apiKey: config.apiKey })
    this.base = Airtable.base(config.baseId)
    this.maxRetries = config.maxRetries ?? 3
    this.retryDelay = config.retryDelay ?? 1000
  }

  /**
   * Generic method to fetch records with retry logic
   */
  private async fetchWithRetry<T extends FieldSet>(
    tableName: string,
    options?: {
      filterByFormula?: string
      sort?: Array<{ field: string; direction?: 'asc' | 'desc' }>
      maxRecords?: number
      view?: string
    }
  ): Promise<Records<T>> {
    let lastError: Error | undefined
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const selectOptions: any = {}
        if (options?.filterByFormula) selectOptions.filterByFormula = options.filterByFormula
        if (options?.sort) selectOptions.sort = options.sort
        if (options?.maxRecords) selectOptions.maxRecords = options.maxRecords
        if (options?.view) selectOptions.view = options.view

        const records = await this.base(tableName)
          .select(selectOptions)
          .all()

        return records as unknown as Records<T>
      } catch (error) {
        lastError = error as Error
        if (attempt < this.maxRetries - 1) {
          await this.sleep(this.retryDelay * (attempt + 1))
        }
      }
    }

    throw new Error(
      `Failed to fetch from ${tableName} after ${this.maxRetries} attempts: ${lastError?.message}`
    )
  }

  /**
   * Meetings - Get all meetings or filter by criteria
   */
  async getMeetings(options?: {
    fromDate?: Date
    toDate?: Date
    maxRecords?: number
  }): Promise<MeetingRecord[]> {
    let filterFormula = ''
    const filters: string[] = []

    if (options?.fromDate) {
      // >= start of day: use NOT(IS_BEFORE(...))
      const startOfDay = new Date(options.fromDate)
      startOfDay.setUTCHours(0, 0, 0, 0)
      filters.push(`NOT(IS_BEFORE({Start Time}, '${startOfDay.toISOString()}'))`)
    }
    if (options?.toDate) {
      // <= end of day: use NOT(IS_AFTER(...)) with end of day time
      const endOfDay = new Date(options.toDate)
      endOfDay.setUTCHours(23, 59, 59, 999)
      filters.push(`NOT(IS_AFTER({Start Time}, '${endOfDay.toISOString()}'))`)
    }

    if (filters.length > 0) {
      filterFormula = `AND(${filters.join(', ')})`
    }

    const records = await this.fetchWithRetry<MeetingRecord['fields']>(AIRTABLE_TABLES.MEETINGS, {
      filterByFormula: filterFormula || undefined,
      sort: [{ field: 'Start Time', direction: 'desc' }],
      maxRecords: options?.maxRecords,
    })

    return records.map((record) => ({
      id: record.id,
      fields: record.fields,
    }))
  }

  /**
   * Get a single meeting by ID
   */
  async getMeeting(meetingId: string): Promise<MeetingRecord | null> {
    try {
      const record = await this.base(AIRTABLE_TABLES.MEETINGS).find(meetingId)
      return {
        id: record.id,
        fields: record.fields as MeetingRecord['fields'],
      }
    } catch (error) {
      console.error(`Failed to fetch meeting ${meetingId}:`, error)
      return null
    }
  }

  /**
   * Update meeting processing status and extracted data
   */
  async updateMeeting(
    meetingId: string,
    updates: Partial<MeetingRecord['fields']>
  ): Promise<void> {
    await this.base(AIRTABLE_TABLES.MEETINGS).update(meetingId, updates as FieldSet)
  }

  /**
   * Companies - Get all companies or filter
   */
  async getCompanies(options?: {
    relationshipStatus?: string
    type?: string
  }): Promise<CompanyRecord[]> {
    const filters: string[] = []
    if (options?.relationshipStatus) {
      filters.push(`{Relationship Status} = '${options.relationshipStatus}'`)
    }
    if (options?.type) {
      filters.push(`{Type} = '${options.type}'`)
    }

    const filterFormula = filters.length > 0 ? `AND(${filters.join(', ')})` : undefined

    const records = await this.fetchWithRetry<CompanyRecord['fields']>(AIRTABLE_TABLES.COMPANIES, {
      filterByFormula: filterFormula,
      sort: [{ field: 'Company Name', direction: 'asc' }],
    })

    return records.map((record) => ({ id: record.id, fields: record.fields }))
  }

  /**
   * Contacts - Get all contacts or filter
   */
  async getContacts(options?: { companyId?: string; email?: string }): Promise<ContactRecord[]> {
    const filters: string[] = []
    if (options?.companyId) {
      filters.push(`FIND('${options.companyId}', {Company})`)
    }
    if (options?.email) {
      filters.push(`{Email} = '${options.email}'`)
    }

    const filterFormula = filters.length > 0 ? `AND(${filters.join(', ')})` : undefined

    const records = await this.fetchWithRetry<ContactRecord['fields']>(AIRTABLE_TABLES.CONTACTS, {
      filterByFormula: filterFormula,
    })

    return records.map((record) => ({ id: record.id, fields: record.fields }))
  }

  /**
   * Create a new contact
   */
  async createContact(fields: Partial<ContactRecord['fields']>): Promise<ContactRecord> {
    const record = await this.base(AIRTABLE_TABLES.CONTACTS).create(fields as FieldSet)
    return { id: record.id, fields: record.fields as ContactRecord['fields'] }
  }

  /**
   * Action Items - Get all or filter by assignee, status, due date
   */
  async getActionItems(options?: {
    assigneeId?: string
    status?: string
    dueBefore?: Date
    dueAfter?: Date
    maxRecords?: number
  }): Promise<ActionItemRecord[]> {
    const filters: string[] = []
    if (options?.assigneeId) {
      filters.push(`FIND('${options.assigneeId}', {Assignee})`)
    }
    if (options?.status) {
      filters.push(`{Status} = '${options.status}'`)
    }
    if (options?.dueBefore) {
      filters.push(`IS_BEFORE({Due Date}, '${options.dueBefore.toISOString()}')`)
    }
    if (options?.dueAfter) {
      filters.push(`IS_AFTER({Due Date}, '${options.dueAfter.toISOString()}')`)
    }

    const filterFormula = filters.length > 0 ? `AND(${filters.join(', ')})` : undefined

    const records = await this.fetchWithRetry<ActionItemRecord['fields']>(
      AIRTABLE_TABLES.ACTION_ITEMS,
      {
        filterByFormula: filterFormula,
        sort: [{ field: 'Due Date', direction: 'asc' }],
        maxRecords: options?.maxRecords,
      }
    )

    return records.map((record) => ({ id: record.id, fields: record.fields }))
  }

  /**
   * Create a new action item and auto-create corresponding task
   */
  async createActionItem(fields: Partial<ActionItemRecord['fields']>): Promise<ActionItemRecord> {
    // Create the action item
    const record = await this.base(AIRTABLE_TABLES.ACTION_ITEMS).create(fields as FieldSet)
    const actionItem = { id: record.id, fields: record.fields as ActionItemRecord['fields'] }

    // Auto-create corresponding task
    try {
      await this.createTaskFromActionItem(actionItem)
    } catch (error) {
      console.error('Failed to auto-create task from action item:', error)
      // Don't fail the action item creation if task creation fails
    }

    return actionItem
  }

  /**
   * Create a task from an action item
   */
  async createTaskFromActionItem(actionItem: ActionItemRecord): Promise<void> {
    const taskDescription = actionItem.fields['Task Description'] || 'Untitled Task'

    // Try to extract context from meeting transcript if available
    let description = ''
    const sourceMeetingId = actionItem.fields['Source Meeting']?.[0]

    if (sourceMeetingId) {
      try {
        const meeting = await this.getMeeting(sourceMeetingId)
        // Use "Transcript Speakers" field which contains the full transcript
        const transcript = meeting?.fields['Transcript Speakers']
        if (transcript) {
          // Extract context around the action item from the transcript
          description = this.extractContextFromTranscript(
            transcript,
            taskDescription
          )
        }
      } catch (error) {
        console.warn('Failed to extract context from meeting transcript:', error)
      }
    }

    // Fall back to Notes if no context extracted
    if (!description) {
      const notes = actionItem.fields.Notes || ''
      const isRedundantDescription = !notes.trim() ||
        notes.toLowerCase().startsWith('from:') ||
        notes.toLowerCase().startsWith('from ')
      if (!isRedundantDescription) {
        description = notes
      }
    }

    const taskFields: Record<string, unknown> = {
      'Name': taskDescription,
      'Status': 'Open',
      'Priority': actionItem.fields.Priority || 'Medium',
      'Source': 'Action Item',
      'Source Action Item ID': actionItem.id,
    }

    // Add description if we have meaningful content
    if (description) {
      taskFields['Description'] = description
    }

    // Add due date if present
    if (actionItem.fields['Due Date']) {
      taskFields['Due Date'] = actionItem.fields['Due Date']
    }

    // Add company link if present
    if (actionItem.fields.Company && actionItem.fields.Company.length > 0) {
      taskFields['Company'] = actionItem.fields.Company
    }

    // Add source meeting ID if present
    if (sourceMeetingId) {
      taskFields['Source Meeting ID'] = sourceMeetingId
    }

    await this.base(AIRTABLE_TABLES.TASKS).create(taskFields as FieldSet)
  }

  /**
   * Extract relevant context from a meeting transcript for a given action item
   * Finds the exact phrase in the transcript and highlights it with == markers
   */
  private extractContextFromTranscript(transcript: string, actionItem: string): string {
    if (!transcript || !actionItem) return ''

    // Extract key phrases from action item (looking for the longest matching phrase)
    const actionLower = actionItem.toLowerCase()
    const words = actionLower.split(/\s+/).filter(w => w.length > 2)
    const transcriptLower = transcript.toLowerCase()

    // Find the best matching phrase and its position in the transcript
    let bestPhrase = ''
    let bestPhrasePos = -1

    // Try progressively smaller phrases from the action item
    for (let phraseLen = Math.min(6, words.length); phraseLen >= 3; phraseLen--) {
      for (let start = 0; start <= words.length - phraseLen; start++) {
        const phrase = words.slice(start, start + phraseLen).join(' ')
        const pos = transcriptLower.indexOf(phrase)
        if (pos !== -1 && phrase.length > bestPhrase.length) {
          bestPhrase = phrase
          bestPhrasePos = pos
        }
      }
      // If we found a good match, stop looking for shorter phrases
      if (bestPhrase.length >= 20) break
    }

    // If no phrase match, try to find 2+ key words close together
    if (bestPhrasePos === -1) {
      const keyWords = words.filter(w => w.length > 4)
      for (const word of keyWords) {
        const pos = transcriptLower.indexOf(word)
        if (pos !== -1) {
          bestPhrasePos = pos
          bestPhrase = word
          break
        }
      }
    }

    if (bestPhrasePos === -1) return ''

    // Extract context around the match (300 chars before, 200 chars after)
    const contextStart = Math.max(0, bestPhrasePos - 300)
    const contextEnd = Math.min(transcript.length, bestPhrasePos + bestPhrase.length + 200)

    // Find the actual phrase in the original transcript (preserve case)
    const matchStart = bestPhrasePos - contextStart
    const matchEnd = matchStart + bestPhrase.length

    let context = transcript.substring(contextStart, contextEnd)

    // Find the actual text that matches (preserving original case)
    const actualMatchText = context.substring(matchStart, matchEnd)

    // Insert highlight markers around the matching phrase
    context =
      context.substring(0, matchStart) +
      '==' + actualMatchText + '==' +
      context.substring(matchEnd)

    // Clean up: add ellipsis if we truncated
    if (contextStart > 0) {
      // Find first sentence/phrase boundary
      const firstBreak = context.indexOf('. ')
      if (firstBreak > 0 && firstBreak < 50) {
        context = context.substring(firstBreak + 2)
      }
      context = '...' + context
    }
    if (contextEnd < transcript.length) {
      // Find last sentence/phrase boundary
      const lastBreak = context.lastIndexOf('. ')
      if (lastBreak > context.length - 50 && lastBreak > 0) {
        context = context.substring(0, lastBreak + 1)
      }
      context = context + '...'
    }

    // Truncate if still too long
    if (context.length > 800) {
      context = context.substring(0, 797) + '...'
    }

    return context.trim()
  }

  /**
   * Update an action item
   */
  async updateActionItem(
    itemId: string,
    updates: Partial<ActionItemRecord['fields']>
  ): Promise<void> {
    await this.base(AIRTABLE_TABLES.ACTION_ITEMS).update(itemId, updates as FieldSet)
  }

  /**
   * Delete an action item
   */
  async deleteActionItem(itemId: string): Promise<void> {
    await this.base(AIRTABLE_TABLES.ACTION_ITEMS).destroy(itemId)
  }

  /**
   * Personal Intelligence - Get all or filter by contact, category
   */
  async getPersonalIntelligence(options?: {
    contactId?: string
    category?: string
    status?: string
  }): Promise<PersonalIntelligenceRecord[]> {
    const filters: string[] = []
    if (options?.contactId) {
      filters.push(`FIND('${options.contactId}', {Contact})`)
    }
    if (options?.category) {
      filters.push(`{Category} = '${options.category}'`)
    }
    if (options?.status) {
      filters.push(`{Status} = '${options.status}'`)
    }

    const filterFormula = filters.length > 0 ? `AND(${filters.join(', ')})` : undefined

    const records = await this.fetchWithRetry<PersonalIntelligenceRecord['fields']>(
      AIRTABLE_TABLES.PERSONAL_INTELLIGENCE,
      { filterByFormula: filterFormula }
    )

    return records.map((record) => ({ id: record.id, fields: record.fields }))
  }

  /**
   * Create personal intelligence record
   */
  async createPersonalIntelligence(
    fields: Partial<PersonalIntelligenceRecord['fields']>
  ): Promise<PersonalIntelligenceRecord> {
    const record = await this.base(AIRTABLE_TABLES.PERSONAL_INTELLIGENCE).create(
      fields as FieldSet
    )
    return { id: record.id, fields: record.fields as PersonalIntelligenceRecord['fields'] }
  }

  /**
   * Business Issues - Get all or filter by company, status
   */
  async getBusinessIssues(options?: {
    companyId?: string
    status?: string
    severity?: string
  }): Promise<BusinessIssueRecord[]> {
    const filters: string[] = []
    if (options?.companyId) {
      filters.push(`FIND('${options.companyId}', {Company})`)
    }
    if (options?.status) {
      filters.push(`{Status} = '${options.status}'`)
    }
    if (options?.severity) {
      filters.push(`{Severity} = '${options.severity}'`)
    }

    const filterFormula = filters.length > 0 ? `AND(${filters.join(', ')})` : undefined

    const records = await this.fetchWithRetry<BusinessIssueRecord['fields']>(
      AIRTABLE_TABLES.BUSINESS_ISSUES,
      { filterByFormula: filterFormula }
    )

    return records.map((record) => ({ id: record.id, fields: record.fields }))
  }

  /**
   * Create business issue record
   */
  async createBusinessIssue(
    fields: Partial<BusinessIssueRecord['fields']>
  ): Promise<BusinessIssueRecord> {
    const record = await this.base(AIRTABLE_TABLES.BUSINESS_ISSUES).create(fields as FieldSet)
    return { id: record.id, fields: record.fields as BusinessIssueRecord['fields'] }
  }

  /**
   * Users - Get user by email
   */
  async getUserByEmail(email: string): Promise<UserRecord | null> {
    const records = await this.fetchWithRetry<UserRecord['fields']>(AIRTABLE_TABLES.USERS, {
      filterByFormula: `{Email} = '${email}'`,
      maxRecords: 1,
    })

    if (records.length === 0) return null
    return { id: records[0].id, fields: records[0].fields }
  }

  /**
   * Themes - Get all themes or filter by owner/active status
   */
  async getThemes(options?: {
    companyId?: string
    isActive?: boolean
  }): Promise<ThemeRecord[]> {
    const filters: string[] = []
    if (options?.companyId) {
      filters.push(`{company_id} = '${options.companyId}'`)
    }
    if (options?.isActive !== undefined) {
      filters.push(`{is_active} = ${options.isActive ? '1' : '0'}`)
    }

    const filterFormula = filters.length > 0 ? `AND(${filters.join(', ')})` : undefined

    const records = await this.fetchWithRetry<ThemeRecord['fields']>(AIRTABLE_TABLES.THEMES, {
      filterByFormula: filterFormula,
      sort: [{ field: 'name', direction: 'asc' }],
    })

    return records.map((record) => ({ id: record.id, fields: record.fields }))
  }

  /**
   * Get a single theme by ID
   */
  async getTheme(themeId: string): Promise<ThemeRecord | null> {
    try {
      const record = await this.base(AIRTABLE_TABLES.THEMES).find(themeId)
      return {
        id: record.id,
        fields: record.fields as ThemeRecord['fields'],
      }
    } catch (error) {
      console.error(`Failed to fetch theme ${themeId}:`, error)
      return null
    }
  }

  /**
   * Create a new theme
   */
  async createTheme(fields: Partial<ThemeRecord['fields']>): Promise<ThemeRecord> {
    const record = await this.base(AIRTABLE_TABLES.THEMES).create(fields as FieldSet)
    return { id: record.id, fields: record.fields as ThemeRecord['fields'] }
  }

  /**
   * Update a theme
   */
  async updateTheme(
    themeId: string,
    updates: Partial<ThemeRecord['fields']>
  ): Promise<ThemeRecord> {
    const record = await this.base(AIRTABLE_TABLES.THEMES).update(themeId, updates as FieldSet)
    return { id: record.id, fields: record.fields as ThemeRecord['fields'] }
  }

  /**
   * Delete a theme (soft delete by setting is_active to false)
   */
  async deleteTheme(themeId: string): Promise<void> {
    await this.base(AIRTABLE_TABLES.THEMES).update(themeId, { is_active: false } as FieldSet)
  }

  /**
   * Meeting Themes - Get all meeting-theme associations
   */
  async getMeetingThemes(options?: {
    meetingId?: string
    themeId?: string
  }): Promise<MeetingThemeRecord[]> {
    const filters: string[] = []
    if (options?.meetingId) {
      filters.push(`FIND('${options.meetingId}', {meeting_id})`)
    }
    if (options?.themeId) {
      filters.push(`FIND('${options.themeId}', {theme_id})`)
    }

    const filterFormula = filters.length > 0 ? `AND(${filters.join(', ')})` : undefined

    const records = await this.fetchWithRetry<MeetingThemeRecord['fields']>(
      AIRTABLE_TABLES.MEETING_THEMES,
      { filterByFormula: filterFormula }
    )

    return records.map((record) => ({ id: record.id, fields: record.fields }))
  }

  /**
   * Create a meeting-theme association
   */
  async createMeetingTheme(
    fields: Partial<MeetingThemeRecord['fields']>
  ): Promise<MeetingThemeRecord> {
    const record = await this.base(AIRTABLE_TABLES.MEETING_THEMES).create(fields as FieldSet)
    return { id: record.id, fields: record.fields as MeetingThemeRecord['fields'] }
  }

  /**
   * Delete a meeting-theme association
   */
  async deleteMeetingTheme(meetingThemeId: string): Promise<void> {
    await this.base(AIRTABLE_TABLES.MEETING_THEMES).destroy(meetingThemeId)
  }

  /**
   * Tag a meeting with multiple themes
   */
  async tagMeeting(
    meetingId: string,
    themeIds: string[],
    createdBy: string,
    notes?: string
  ): Promise<MeetingThemeRecord[]> {
    const createdRecords: MeetingThemeRecord[] = []

    for (const themeId of themeIds) {
      // Check if association already exists
      const existing = await this.getMeetingThemes({ meetingId, themeId })
      if (existing.length === 0) {
        const record = await this.createMeetingTheme({
          meeting_id: [meetingId],
          theme_id: [themeId],
          created_by: createdBy,
          created_at: new Date().toISOString(),
          notes,
        })
        createdRecords.push(record)
      }
    }

    return createdRecords
  }

  /**
   * Untag a meeting from a theme
   */
  async untagMeeting(meetingId: string, themeId: string): Promise<void> {
    const associations = await this.getMeetingThemes({ meetingId, themeId })

    for (const association of associations) {
      await this.deleteMeetingTheme(association.id)
    }
  }

  /**
   * Get themes for a specific meeting
   */
  async getThemesForMeeting(meetingId: string): Promise<ThemeRecord[]> {
    const meetingThemes = await this.getMeetingThemes({ meetingId })
    const themeIds = meetingThemes
      .map(mt => mt.fields.theme_id?.[0])
      .filter((id): id is string => !!id)

    const themes: ThemeRecord[] = []
    for (const themeId of themeIds) {
      const theme = await this.getTheme(themeId)
      if (theme) {
        themes.push(theme)
      }
    }

    return themes
  }

  /**
   * Get meetings for a specific theme
   */
  async getMeetingsForTheme(themeId: string): Promise<MeetingRecord[]> {
    const meetingThemes = await this.getMeetingThemes({ themeId })
    const meetingIds = meetingThemes
      .map(mt => mt.fields.meeting_id?.[0])
      .filter((id): id is string => !!id)

    const meetings: MeetingRecord[] = []
    for (const meetingId of meetingIds) {
      const meeting = await this.getMeeting(meetingId)
      if (meeting) {
        meetings.push(meeting)
      }
    }

    return meetings
  }

  /**
   * Theme Outputs - Create a theme output record
   */
  async createThemeOutput(
    fields: Omit<ThemeOutputRecord['fields'], 'created_at' | 'updated_at'>
  ): Promise<ThemeOutputRecord> {
    const now = new Date().toISOString()
    const record = await this.base(AIRTABLE_TABLES.THEME_OUTPUTS).create({
      ...fields,
      created_at: now,
      updated_at: now,
    })
    return record as unknown as ThemeOutputRecord
  }

  /**
   * Theme Outputs - Get all outputs for a meeting
   */
  async getThemeOutputsForMeeting(meetingId: string): Promise<ThemeOutputRecord[]> {
    const records = await this.fetchWithRetry<ThemeOutputRecord['fields']>(
      AIRTABLE_TABLES.THEME_OUTPUTS,
      {
        filterByFormula: `{meeting_id} = '${meetingId}'`,
      }
    )
    return records as unknown as ThemeOutputRecord[]
  }

  /**
   * Theme Outputs - Get all outputs for a specific theme in a meeting
   */
  async getThemeOutputsForMeetingAndTheme(
    meetingId: string,
    themeId: string
  ): Promise<ThemeOutputRecord[]> {
    const records = await this.fetchWithRetry<ThemeOutputRecord['fields']>(
      AIRTABLE_TABLES.THEME_OUTPUTS,
      {
        filterByFormula: `AND({meeting_id} = '${meetingId}', {theme_id} = '${themeId}')`,
      }
    )
    return records as unknown as ThemeOutputRecord[]
  }

  /**
   * Theme Outputs - Delete all outputs for a meeting (for re-analysis)
   */
  async deleteThemeOutputsForMeeting(meetingId: string): Promise<void> {
    const outputs = await this.getThemeOutputsForMeeting(meetingId)
    const BATCH_SIZE = 10

    for (let i = 0; i < outputs.length; i += BATCH_SIZE) {
      const batch = outputs.slice(i, i + BATCH_SIZE)
      await this.base(AIRTABLE_TABLES.THEME_OUTPUTS).destroy(batch.map(o => o.id))
    }
  }

  /**
   * Email Preferences - Get all email preferences
   */
  async getEmailPreferences(): Promise<EmailPreferencesRecord[]> {
    const records = await this.fetchWithRetry<EmailPreferencesRecord['fields']>(
      AIRTABLE_TABLES.EMAIL_PREFERENCES,
      {
        sort: [{ field: 'Assignee Name', direction: 'asc' }],
      }
    )
    return records.map((record) => ({ id: record.id, fields: record.fields }))
  }

  /**
   * Email Preferences - Get preference for a specific assignee
   */
  async getEmailPreferenceByAssignee(assigneeName: string): Promise<EmailPreferencesRecord | null> {
    const records = await this.fetchWithRetry<EmailPreferencesRecord['fields']>(
      AIRTABLE_TABLES.EMAIL_PREFERENCES,
      {
        filterByFormula: `{Assignee Name} = '${assigneeName}'`,
        maxRecords: 1,
      }
    )
    if (records.length === 0) return null
    return { id: records[0].id, fields: records[0].fields }
  }

  /**
   * Email Preferences - Create or update preference for an assignee
   */
  async upsertEmailPreference(
    assigneeName: string,
    emailEnabled: boolean,
    notes?: string
  ): Promise<EmailPreferencesRecord> {
    const existing = await this.getEmailPreferenceByAssignee(assigneeName)

    if (existing) {
      const updateFields: Record<string, unknown> = {
        'Email Enabled': emailEnabled,
      }
      if (notes !== undefined) {
        updateFields['Notes'] = notes
      }
      const updated = await this.updateRecord<EmailPreferencesRecord['fields']>(
        AIRTABLE_TABLES.EMAIL_PREFERENCES,
        existing.id,
        updateFields as Partial<EmailPreferencesRecord['fields']>
      )
      return updated
    } else {
      const createFields: Record<string, unknown> = {
        'Assignee Name': assigneeName,
        'Email Enabled': emailEnabled,
      }
      if (notes !== undefined) {
        createFields['Notes'] = notes
      }
      const created = await this.createRecord<EmailPreferencesRecord['fields']>(
        AIRTABLE_TABLES.EMAIL_PREFERENCES,
        createFields as Partial<EmailPreferencesRecord['fields']>
      )
      return created
    }
  }

  /**
   * Email Preferences - Get map of assignee -> emailEnabled for quick lookup
   * Note: Airtable checkboxes return undefined when unchecked, so we treat undefined as false
   */
  async getEmailPreferencesMap(): Promise<Map<string, boolean>> {
    const prefs = await this.getEmailPreferences()
    const map = new Map<string, boolean>()
    for (const pref of prefs) {
      // Airtable returns undefined for unchecked checkboxes, treat as false
      const isEnabled = pref.fields['Email Enabled'] === true
      map.set(pref.fields['Assignee Name'], isEnabled)
    }
    return map
  }

  /**
   * Batch create records (up to 10 at a time per Airtable limits)
   */
  async batchCreate<T extends FieldSet>(
    tableName: string,
    records: Array<Partial<T>>
  ): Promise<void> {
    const BATCH_SIZE = 10
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE)
      await this.base(tableName).create(batch as FieldSet[])
    }
  }

  /**
   * Helper: Sleep for retry backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Generic method: Find records in any table
   */
  async findRecords<T extends FieldSet>(
    tableName: string,
    options?: {
      filterByFormula?: string
      sort?: Array<{ field: string; direction: 'asc' | 'desc' }>
      maxRecords?: number
    }
  ): Promise<Array<{ id: string; fields: T }>> {
    const records = await this.fetchWithRetry<T>(tableName, options)
    return records.map((r) => ({ id: r.id, fields: r.fields as T }))
  }

  /**
   * Generic method: Get a single record by ID
   */
  async getRecord<T extends FieldSet>(
    tableName: string,
    recordId: string
  ): Promise<{ id: string; fields: T } | null> {
    try {
      const record = await this.base(tableName).find(recordId)
      return {
        id: record.id,
        fields: record.fields as T,
      }
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null
      }
      throw error
    }
  }

  /**
   * Generic method: Create a record in any table
   */
  async createRecord<T extends FieldSet>(
    tableName: string,
    fields: Partial<T>
  ): Promise<{ id: string; fields: T }> {
    const record = await this.base(tableName).create(fields as FieldSet)
    return {
      id: record.id,
      fields: record.fields as T,
    }
  }

  /**
   * Generic method: Update a record in any table
   */
  async updateRecord<T extends FieldSet>(
    tableName: string,
    recordId: string,
    fields: Partial<T>
  ): Promise<{ id: string; fields: T }> {
    const record = await this.base(tableName).update(recordId, fields as FieldSet)
    return {
      id: record.id,
      fields: record.fields as T,
    }
  }

  /**
   * Generic method: Delete a record from any table
   */
  async deleteRecord(tableName: string, recordId: string): Promise<void> {
    await this.base(tableName).destroy(recordId)
  }
}

/**
 * Singleton instance - initialize once with config
 */
let airtableClient: AirtableClient | null = null

export function initializeAirtable(config: AirtableConfig): AirtableClient {
  airtableClient = new AirtableClient(config)
  return airtableClient
}

export function getAirtableClient(): AirtableClient {
  if (!airtableClient) {
    throw new Error('Airtable client not initialized. Call initializeAirtable() first.')
  }
  return airtableClient
}
