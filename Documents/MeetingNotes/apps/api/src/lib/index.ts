/**
 * Airtable Package - Main Export
 */

export * from './schema'
export * from './client'
export { AIRTABLE_TABLES, FIELD_NAMES } from './schema'
export type {
  MeetingRecord,
  CompanyRecord,
  ContactRecord,
  ActionItemRecord,
  PersonalIntelligenceRecord,
  BusinessIssueRecord,
  UserRecord,
} from './schema'
export { AirtableClient, initializeAirtable, getAirtableClient } from './client'
export type { AirtableConfig } from './client'
