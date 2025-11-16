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
      filters.push(`IS_AFTER({Start Time}, '${options.fromDate.toISOString()}')`)
    }
    if (options?.toDate) {
      filters.push(`IS_BEFORE({Start Time}, '${options.toDate.toISOString()}')`)
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
   * Create a new action item
   */
  async createActionItem(fields: Partial<ActionItemRecord['fields']>): Promise<ActionItemRecord> {
    const record = await this.base(AIRTABLE_TABLES.ACTION_ITEMS).create(fields as FieldSet)
    return { id: record.id, fields: record.fields as ActionItemRecord['fields'] }
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
