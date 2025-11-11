// ========================================
// SHARED AI TYPES
// ========================================

/**
 * Represents a modular prompt template for a specific pedagogical approach
 */
export interface PromptTemplate {
  id: string
  stepId: string
  zoneId?: string
  systemPrompt: string
  userPromptTemplate: (context: AIContext) => string
  temperature: number
  maxTokens: number
  pedagogicalGoal: string
  model?: string
}

/**
 * Cross-step context data to enrich AI prompts
 */
export interface AIContext {
  // Always available
  projectId: string
  chosenProblem: string | null

  // From Explore step
  problemExploration?: {
    thinkBig?: {
      answers: string[]
      resources?: { label: string; url: string }[]
    }
    thinkSmall?: {
      answers: string[]
      imageUrls?: string[]
    }
    causes?: {
      answers: string[]
    }
    motivation?: {
      answers: string[]
    }
  }

  // From 4Ws step
  problemStatement?: {
    what: string
    who: string
    where: string
    why: string
  }

  // Current zone/field being reviewed
  currentZoneData?: {
    zoneId: string
    answers: string[]
  }

  // Current 4Ws field being reviewed
  currentFieldData?: {
    field: 'what' | 'who' | 'where' | 'why'
    value: string
  }
}

/**
 * Request to the AI orchestrator
 */
export interface AIRequest {
  projectId: string
  stepId: string
  zoneId?: string
  action: 'review' | 'generate' | 'suggest'
  data: any
}

/**
 * Response from the AI orchestrator
 */
export interface AIResponse {
  feedback: string[]
  followUpQuestion: string | null
  success: boolean
  error?: string
  generatedItems?: string[]
}

/**
 * Individual feedback point
 */
export interface FeedbackPoint {
  text: string
  type: 'critical' | 'encouraging' | 'question'
}

/**
 * Base assistant interface
 */
export interface Assistant {
  process(request: AIRequest, context: AIContext): Promise<AIResponse>
}

/**
 * OpenAI completion options
 */
export interface CompletionOptions {
  model: string
  temperature: number
  maxTokens: number
  systemPrompt: string
  userPrompt: string
}
