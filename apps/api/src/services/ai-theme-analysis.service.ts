/**
 * AI Theme Analysis Service
 * Uses OpenAI GPT to analyze meeting transcripts and generate theme-specific summaries
 */

import OpenAI from 'openai'
import { logger } from '../utils/logger.js'

let openai: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (openai) return openai
  const key = process.env.OPENAI_API_KEY
  if (!key) {
    logger.error('OPENAI_API_KEY is not set')
    throw new Error('OPENAI_API_KEY is not set')
  }
  openai = new OpenAI({ apiKey: key })
  return openai
}

export interface ThemeAnalysisInput {
  transcript: string
  themeName: string
  themeDescription: string
}

export interface ThemeAnalysisOutput {
  confidence: number
  summary: string[]
  actionItems: string[]
  decisions: string[]
  questions: string[]
}

/**
 * Analyze a meeting transcript for a specific theme using OpenAI GPT
 */
export async function analyzeTranscriptForTheme(
  input: ThemeAnalysisInput
): Promise<ThemeAnalysisOutput> {
  const { transcript, themeName, themeDescription } = input

  logger.info(`Analyzing transcript for theme: ${themeName}`)

  const prompt = `You are analyzing a meeting transcript to extract information relevant to a specific strategic theme.

TRANSCRIPT:
${transcript}

THEME TO ANALYZE:
Name: ${themeName}
Description: ${themeDescription}

TASK:
Analyze this meeting transcript and extract ALL discussion points related to the theme described above.

Provide your analysis in the following JSON format:
{
  "confidence": <number 0-1>,
  "summary": [<array of ALL bullet points summarizing theme-related discussions - no limit on count>],
  "actionItems": [<array of ALL action items extracted that relate to this theme>],
  "decisions": [<array of ALL key decisions made about this theme>],
  "questions": [<array of ALL important questions raised about this theme>]
}

CONFIDENCE SCORE GUIDELINES:
- 0.9-1.0: Theme was a major focus of the meeting (>50% of discussion)
- 0.7-0.9: Theme was significantly discussed (25-50% of discussion)
- 0.5-0.7: Theme was mentioned but not a focus (<25% of discussion)
- 0.0-0.5: Theme barely mentioned or not relevant

IMPORTANT INSTRUCTIONS:
- Extract EVERY relevant point discussed about this theme - do not limit yourself to 3-5 bullets
- Be comprehensive - if there are 20+ discussion points, include all 20+
- Each bullet should be 1-2 sentences and capture a complete thought
- Include specific details (names, numbers, dates, decisions, commitments)
- If the theme is barely discussed (confidence < 0.5), still return the JSON but with minimal content
- Preserve exact quotes when they're particularly important
- Return ONLY the JSON object, no other text`

  try {
    const response = await getOpenAI().chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert meeting analyst who extracts structured insights from meeting transcripts. You always respond with valid JSON only, no additional text.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2, // Lower temperature for more consistent, focused output
      max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || '4000', 10),
      response_format: { type: 'json_object' }, // Ensure JSON response
    })

    // Extract the response text
    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from OpenAI API')
    }

    // Parse the JSON response
    const result = JSON.parse(content) as ThemeAnalysisOutput

    logger.info(
      `Theme analysis complete: ${result.summary.length} summary points, confidence ${result.confidence}`
    )

    return result
  } catch (error) {
    logger.error('Error analyzing transcript with OpenAI:', error)
    throw new Error('Failed to analyze transcript with AI')
  }
}

/**
 * Analyze a meeting transcript for multiple themes in parallel
 */
export async function analyzeMeetingForThemes(
  transcript: string,
  themes: Array<{ id: string; name: string; description: string }>
): Promise<Map<string, ThemeAnalysisOutput>> {
  logger.info(`Analyzing meeting for ${themes.length} themes`)

  // Analyze all themes in parallel
  const analyses = await Promise.all(
    themes.map(async (theme) => {
      const result = await analyzeTranscriptForTheme({
        transcript,
        themeName: theme.name,
        themeDescription: theme.description,
      })
      return { themeId: theme.id, result }
    })
  )

  // Convert to Map for easy lookup
  const resultsMap = new Map<string, ThemeAnalysisOutput>()
  for (const { themeId, result } of analyses) {
    resultsMap.set(themeId, result)
  }

  return resultsMap
}

export interface CombinedSummaryInput {
  meetingName: string
  priorMeetings: Array<{
    date: string
    summary?: string
    actionItems?: string
  }>
}

export interface CombinedSummaryOutput {
  keyThemes: string[]
  ongoingDiscussions: string[]
  outstandingDeliverables: string[]
  contextForToday: string
}

/**
 * Combine summaries from multiple prior meetings into a synthesized context
 * for an upcoming meeting. This provides more meaningful insight than
 * individual meeting snippets.
 */
export async function combineMeetingSummaries(
  input: CombinedSummaryInput
): Promise<CombinedSummaryOutput> {
  const { meetingName, priorMeetings } = input

  if (priorMeetings.length === 0) {
    return {
      keyThemes: [],
      ongoingDiscussions: [],
      outstandingDeliverables: [],
      contextForToday: 'No prior meetings to summarize.',
    }
  }

  // Build the context from prior meetings
  const meetingContext = priorMeetings
    .filter(m => m.summary || m.actionItems)
    .map(m => {
      let context = `[${m.date}]`
      if (m.summary) context += `\nSummary: ${m.summary}`
      if (m.actionItems) context += `\nAction Items: ${m.actionItems}`
      return context
    })
    .join('\n\n---\n\n')

  if (!meetingContext.trim()) {
    return {
      keyThemes: [],
      ongoingDiscussions: [],
      outstandingDeliverables: [],
      contextForToday: 'No substantive content in prior meetings to summarize.',
    }
  }

  logger.info(`Combining summaries from ${priorMeetings.length} prior meetings for: ${meetingName}`)

  const prompt = `You are preparing a briefing for someone about to join a recurring meeting called "${meetingName}".

Here are the summaries and action items from recent occurrences of this meeting:

${meetingContext}

TASK:
Synthesize all of this information into a cohesive briefing that helps prepare for today's meeting.

Provide your analysis in the following JSON format:
{
  "keyThemes": [<2-4 main themes/topics that have been recurring across these meetings>],
  "ongoingDiscussions": [<3-6 bullet points describing ongoing discussions, decisions being made, or issues being worked through>],
  "outstandingDeliverables": [<specific action items or deliverables that were committed to but may not be complete yet>],
  "contextForToday": "<A 2-3 sentence paragraph summarizing what this meeting series is about and what to expect/prepare for today>"
}

IMPORTANT:
- Be specific - include names, dates, and concrete details from the meetings
- Focus on what's ACTIONABLE and RELEVANT for today's meeting
- Identify patterns and ongoing threads across meetings
- Call out any commitments that need follow-up
- Keep each bullet concise but informative
- Return ONLY the JSON object, no other text`

  try {
    const response = await getOpenAI().chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert executive assistant who prepares concise, actionable meeting briefings. You synthesize information from multiple meetings to identify patterns and key context. You always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from OpenAI API')
    }

    const result = JSON.parse(content) as CombinedSummaryOutput

    logger.info(`Combined summary complete: ${result.keyThemes.length} themes, ${result.ongoingDiscussions.length} discussions`)

    return result
  } catch (error) {
    logger.error('Error combining meeting summaries with OpenAI:', error)
    // Return a fallback instead of throwing
    return {
      keyThemes: [],
      ongoingDiscussions: priorMeetings
        .filter(m => m.summary)
        .slice(0, 3)
        .map(m => `${m.date}: ${m.summary?.split('.')[0]}`),
      outstandingDeliverables: [],
      contextForToday: `Review of ${priorMeetings.length} prior "${meetingName}" meetings.`,
    }
  }
}
