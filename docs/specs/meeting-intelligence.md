# Meeting Intelligence Feature Specification

## Overview

The Meeting Intelligence feature provides AI-powered theme generation and research capabilities at the meeting series level. Users select a recurring meeting series and can:

1. **Generate Themes** - AI analyzes meeting summaries and action items to suggest relevant themes
2. **Research & Insights** - Ask questions about the meeting series and get AI-powered responses based on meeting history

## Architecture

### Backend

#### Routes

- `apps/api/src/routes/meeting-intelligence.routes.ts`
  - `POST /api/v1/meeting-series/:name/generate-themes` - Generate theme suggestions
  - `POST /api/v1/meeting-series/:name/research` - Ask research questions

#### Service

- `apps/api/src/services/meeting-intelligence.service.ts`
  - `generateThemeSuggestions(seriesName)` - Analyzes meeting data and returns theme suggestions
  - `processResearchQuestion(seriesName, question)` - Answers questions based on meeting context

### Frontend

#### Pages

- `apps/web/app/(dashboard)/themes/page.tsx` - Main Meeting Intelligence page with:
  - Meeting series selector
  - Themes tab for managing and generating themes
  - Research tab for asking questions

#### API Client

- `apps/web/lib/api-client.ts` - Added `meetingSeries` namespace:
  - `generateThemes(seriesName)` - Call theme generation API
  - `research(seriesName, question)` - Call research API

## User Flow

### Theme Generation

1. User selects a meeting series from the dropdown
2. User clicks "Generate Themes" button
3. System analyzes the last 20 meetings and 50 action items
4. AI generates 3-5 theme suggestions with:
   - Name (2-4 words)
   - Description (1-2 sentences)
   - Confidence level (high/medium/low)
   - Basis for suggestion
5. User can accept (create theme) or dismiss each suggestion

### Research & Insights

1. User selects a meeting series
2. User switches to "Research & Insights" tab
3. User types a question or selects a suggested prompt
4. System builds context from meeting history
5. AI generates a detailed response
6. Response displayed inline on the page

## Data Model

### Theme Suggestion (API Response)

```typescript
interface ThemeSuggestion {
  name: string
  description: string
  confidence: 'high' | 'medium' | 'low'
  basedOn: string
}
```

### Research Response (API Response)

```typescript
interface ResearchResponse {
  question: string
  answer: string
  meetingsReferenced: string[]
  createdAt: string
}
```

## Context Building

The system builds context from:

1. **Meetings** - Last 20 meetings with matching title
   - Title, date, summary, participants
2. **Action Items** - Up to 50 items linked to those meetings
   - Description, status, assignee

This context is sent to OpenAI GPT-4o for analysis.

## AI Prompts

### Theme Generation Prompt

The system asks GPT-4o to identify 3-5 distinct themes that:
- Are specific enough to be useful for filtering
- Are broad enough to apply across multiple meetings
- Have clear, descriptive names
- Include descriptions of what content belongs to each theme

### Research Prompt

The system provides meeting context and asks GPT-4o to:
- Answer based on actual meeting context
- Reference specific content when relevant
- Provide actionable recommendations
- Format with clear headers and bullet points

## Dependencies

- OpenAI API (GPT-4o model)
- Existing Airtable tables (Meetings, Action Items, Themes)

## API Endpoints

### POST /api/v1/meeting-series/:name/generate-themes

**Request:** None (series name in URL)

**Response:**
```json
{
  "success": true,
  "data": {
    "seriesName": "Weekly Team Sync",
    "suggestions": [
      {
        "name": "Technical Debt",
        "description": "Discussions about code quality, refactoring, and maintenance",
        "confidence": "high",
        "basedOn": "Mentioned in 5 meetings with 8 related action items"
      }
    ],
    "generatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### POST /api/v1/meeting-series/:name/research

**Request:**
```json
{
  "question": "How can we make these meetings more productive?"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "question": "How can we make these meetings more productive?",
    "answer": "## Recommendations...",
    "meetingsReferenced": ["rec123", "rec456"],
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

## UI Components

### Meeting Series Selector

Dropdown populated from unique meeting titles. Required before any intelligence features can be used.

### Themes Tab

- **Generate Themes Button** - Triggers AI analysis with loading state
- **AI Suggestions Panel** - Shows generated themes with accept/dismiss actions
- **Add Theme Button** - Manual theme creation
- **Themes List** - Existing themes with edit/delete actions

### Research Tab

- **Question Input** - Textarea for custom questions
- **Suggested Questions** - Pre-defined prompts for common queries
- **Research Result** - Displays AI response with question and answer

## Future Enhancements

1. Cache suggestions with invalidation on new meetings
2. Stream responses for longer answers
3. Save research Q&A to Airtable for history
4. Pin useful responses
5. Feedback rating system
6. Export insights to documents
