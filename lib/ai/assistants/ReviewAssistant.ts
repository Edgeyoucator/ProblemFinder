import OpenAI from 'openai'
import { Assistant, AIRequest, AIResponse, AIContext, PromptTemplate } from '../types'

/**
 * ReviewAssistant - Handles all review/feedback tasks
 * Used for: Explore zones, 4Ws, and future review steps
 */
export class ReviewAssistant implements Assistant {
  private openai: OpenAI

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey })
  }

  /**
   * Process a review request using the appropriate prompt template
   */
  async process(
    request: AIRequest,
    context: AIContext,
    promptTemplate: PromptTemplate
  ): Promise<AIResponse> {
    try {
      // Generate user prompt from template with context
      const userPrompt = promptTemplate.userPromptTemplate(context)

      // Call OpenAI API
      const completion = await this.openai.chat.completions.create({
        model: promptTemplate.model || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: promptTemplate.systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        temperature: promptTemplate.temperature,
        max_tokens: promptTemplate.maxTokens,
      })

      const responseText = completion.choices[0]?.message?.content?.trim() || ''

      // Parse response
      const { feedback, followUpQuestion, generatedItems } = this.parseResponse(responseText)

      return {
        feedback,
        followUpQuestion,
        generatedItems,
        success: true,
      }
    } catch (error: any) {
      console.error('ReviewAssistant error:', error)

      // Handle OpenAI API errors
      if (error.status === 429) {
        return {
          feedback: [],
          followUpQuestion: null,
          success: false,
          error: 'Rate limit exceeded. Please try again in a moment.',
        }
      }

      if (error.status === 401) {
        return {
          feedback: [],
          followUpQuestion: null,
          success: false,
          error: 'OpenAI API key invalid or missing',
        }
      }

      return {
        feedback: [],
        followUpQuestion: null,
        success: false,
        error: error.message || 'Failed to get feedback',
      }
    }
  }

  /**
   * Parse AI response into structured feedback
   * Extracts paragraph-based feedback + optional follow-up question
   */
  private parseResponse(responseText: string): {
    feedback: string[]
    followUpQuestion: string | null
    generatedItems?: string[]
  } {
    const trimmed = responseText.trim()

    // Helper: try to extract a JSON array of strings from arbitrary text
    const tryExtractArray = (text: string): string[] | null => {
      const stripFences = text
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim()
      try {
        const parsed = JSON.parse(stripFences)
        if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')) {
          return parsed as string[]
        }
      } catch (_) {
        // fall through
      }
      // Fallback: find first '[' and last ']'
      const start = text.indexOf('[')
      const end = text.lastIndexOf(']')
      if (start !== -1 && end !== -1 && end > start) {
        const candidate = text.slice(start, end + 1)
        try {
          const parsed = JSON.parse(candidate)
          if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')) {
            return parsed as string[]
          }
        } catch (_) {}
      }
      return null
    }

    // If the model returned a JSON array, treat it as generated items
    const array = tryExtractArray(trimmed)
    if (array) {
      return {
        feedback: [],
        followUpQuestion: null,
        generatedItems: array,
      }
    }

    // Try to extract follow-up question (last sentence ending with '?')
    let feedbackText = responseText
    let followUpQuestion: string | null = null

    const questionMatch = responseText.match(/([.!]\s+)([^.!]+\?\s*)$/s)
    if (questionMatch) {
      followUpQuestion = questionMatch[2].trim()
      feedbackText = responseText.substring(0, responseText.lastIndexOf(questionMatch[1]) + questionMatch[1].length).trim()
    }

    const feedback = feedbackText ? [feedbackText] : [responseText]

    return {
      feedback,
      followUpQuestion,
    }
  }
}
