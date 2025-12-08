/**
 * Meeting Intelligence Service
 *
 * Provides AI-powered intelligence features for meeting series:
 * 1. Theme Generation - Analyzes meetings to suggest themes
 * 2. Research & Insights - Deep dive questions about meeting content
 *
 * All results are stored in Airtable for future reference.
 */

import OpenAI from 'openai'
import { logger } from '../utils/logger.js'
import { getAirtableClient } from '../lib/client.js'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/**
 * Generated theme suggestion
 */
export interface ThemeSuggestion {
  name: string
  description: string
  confidence: 'high' | 'medium' | 'low'
  basedOn: string // What meetings/content this was derived from
}

/**
 * Research response
 */
export interface ResearchResponse {
  question: string
  answer: string
  meetingsReferenced: string[]
  createdAt: string
}

/**
 * Build context from meetings in a series
 */
async function getMeetingSeriesContext(seriesName: string): Promise<{
  meetings: Array<{
    id: string
    title: string
    date: string
    summary?: string
    participants?: string
  }>
  actionItems: Array<{
    id: string
    description: string
    status: string
    assignee?: string
  }>
}> {
  const airtable = getAirtableClient()

  // Get all meetings with this title
  const allMeetings = await airtable.getMeetings()
  const seriesMeetings = allMeetings
    .filter(m => m.fields.Title === seriesName || m.fields.Name === seriesName)
    .sort((a, b) => {
      const dateA = a.fields['Start Time'] || ''
      const dateB = b.fields['Start Time'] || ''
      return dateB.localeCompare(dateA) // Most recent first
    })
    .slice(0, 20) // Last 20 meetings

  // Get action items from these meetings
  const allActionItems = await airtable.getActionItems()
  const meetingIds = new Set(seriesMeetings.map(m => m.id))
  const relatedActionItems = allActionItems
    .filter(ai => {
      const meetingLinks = ai.fields['Meeting'] || ai.fields['meeting'] || []
      return meetingLinks.some((mid: string) => meetingIds.has(mid))
    })
    .slice(0, 50)

  return {
    meetings: seriesMeetings.map(m => ({
      id: m.id,
      title: m.fields.Title || m.fields.Name || 'Untitled',
      date: m.fields['Start Time'] || '',
      summary: m.fields['Meeting Summary'],
      participants: m.fields.Participants,
    })),
    actionItems: relatedActionItems.map(ai => ({
      id: ai.id,
      description: ai.fields.Description || ai.fields.description || '',
      status: ai.fields.Status || 'Open',
      assignee: ai.fields.Assignee || ai.fields.assignee,
    })),
  }
}

/**
 * Generate theme suggestions for a meeting series
 * Analyzes meeting summaries and action items to identify recurring topics
 */
export async function generateThemeSuggestions(seriesName: string): Promise<ThemeSuggestion[]> {
  logger.info(`Generating theme suggestions for series: ${seriesName}`)

  const context = await getMeetingSeriesContext(seriesName)

  if (context.meetings.length === 0) {
    logger.warn(`No meetings found for series: ${seriesName}`)
    return []
  }

  // Build prompt context
  const meetingSummaries = context.meetings
    .filter(m => m.summary)
    .map(m => `[${m.date}] ${m.summary}`)
    .join('\n\n')

  const actionItemsList = context.actionItems
    .slice(0, 30)
    .map(ai => `- [${ai.status}] ${ai.description}`)
    .join('\n')

  const prompt = `You are analyzing a recurring meeting series called "${seriesName}" to identify strategic themes that can be used to organize and track discussions over time.

## Meeting Summaries (${context.meetings.length} meetings)
${meetingSummaries || 'No summaries available'}

## Action Items (${context.actionItems.length} items)
${actionItemsList || 'No action items'}

## Task
Based on this content, identify 3-5 distinct themes that represent recurring topics, initiatives, or focus areas in these meetings. Each theme should:
1. Be specific enough to be useful for filtering/organizing content
2. Be broad enough to apply across multiple meetings
3. Have a clear, descriptive name (2-4 words)
4. Include a description explaining what content belongs to this theme

## Output Format
Return a JSON array with objects containing:
- name: Theme name (string, 2-4 words, title case)
- description: What this theme covers (string, 1-2 sentences)
- confidence: How confident you are this is a real theme ("high", "medium", or "low")
- basedOn: Brief explanation of what content led to this suggestion (string)

Return ONLY the JSON array, no other text.`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1500,
    })

    const content = response.choices[0]?.message?.content?.trim() || '[]'

    // Parse JSON response
    let suggestions: ThemeSuggestion[]
    try {
      // Remove markdown code block if present
      const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim()
      suggestions = JSON.parse(jsonStr)
    } catch (parseError) {
      logger.error('Failed to parse theme suggestions JSON:', parseError)
      return []
    }

    logger.info(`Generated ${suggestions.length} theme suggestions for ${seriesName}`)
    return suggestions

  } catch (error) {
    logger.error('OpenAI API error generating themes:', error)
    throw new Error('Failed to generate theme suggestions')
  }
}

/**
 * Process a research question about a meeting series
 * Returns AI-generated insights based on meeting history
 */
export async function processResearchQuestion(
  seriesName: string,
  question: string
): Promise<ResearchResponse> {
  logger.info(`Processing research question for series: ${seriesName}`)

  const context = await getMeetingSeriesContext(seriesName)

  // Build context for the AI
  const meetingContext = context.meetings
    .map(m => {
      let entry = `### ${m.title} (${m.date})`
      if (m.participants) entry += `\nParticipants: ${m.participants}`
      if (m.summary) entry += `\n${m.summary}`
      return entry
    })
    .join('\n\n')

  const actionItemsContext = context.actionItems
    .map(ai => `- [${ai.status}] ${ai.description}${ai.assignee ? ` (${ai.assignee})` : ''}`)
    .join('\n')

  const prompt = `You are an AI assistant helping analyze a meeting series called "${seriesName}".

## Context: Recent Meetings (${context.meetings.length} meetings)
${meetingContext || 'No meeting data available'}

## Context: Action Items (${context.actionItems.length} items)
${actionItemsContext || 'No action items'}

## User Question
${question}

## Instructions
1. Answer the question based on the meeting context provided
2. Be specific and reference actual content from the meetings when relevant
3. If the question asks for suggestions (like meeting improvements), provide actionable recommendations
4. Format your response with clear headers and bullet points for readability
5. If there's not enough information to answer fully, say so and provide what insight you can

Provide a helpful, detailed response:`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2000,
    })

    const answer = response.choices[0]?.message?.content?.trim() || 'Unable to generate response.'

    return {
      question,
      answer,
      meetingsReferenced: context.meetings.map(m => m.id),
      createdAt: new Date().toISOString(),
    }

  } catch (error) {
    logger.error('OpenAI API error processing research question:', error)
    throw new Error('Failed to process research question')
  }
}
