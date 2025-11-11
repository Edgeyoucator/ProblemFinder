import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { ReviewAssistant } from './assistants/ReviewAssistant'
import { getPrompt } from './prompts'
import { AIRequest, AIResponse, AIContext } from './types'

/**
 * AI Orchestrator - Central routing for all AI requests
 *
 * Responsibilities:
 * 1. Fetch project data from Firestore
 * 2. Build cross-step context
 * 3. Select appropriate prompt template
 * 4. Route to appropriate assistant
 * 5. Return structured response
 */
export class AIOrchestrator {
  private reviewAssistant: ReviewAssistant

  constructor(openaiApiKey: string) {
    this.reviewAssistant = new ReviewAssistant(openaiApiKey)
  }

  /**
   * Process an AI request with full context awareness
   */
  async process(request: AIRequest): Promise<AIResponse> {
    try {
      // 1. Fetch project data from Firestore
      const context = await this.buildContext(request)

      // 2. Get appropriate prompt template
      const promptTemplate = getPrompt(request.stepId, request.zoneId)
      if (!promptTemplate) {
        return {
          feedback: [],
          followUpQuestion: null,
          success: false,
          error: `No prompt template found for step: ${request.stepId}, zone: ${request.zoneId}`,
        }
      }

      // 3. Route to appropriate assistant
      // Currently only ReviewAssistant; GenerativeAssistant would handle Problem Incubator
      if (request.action === 'review' || request.action === 'generate') {
        return await this.reviewAssistant.process(request, context, promptTemplate)
      }

      return {
        feedback: [],
        followUpQuestion: null,
        success: false,
        error: `Unknown action: ${request.action}`,
      }
    } catch (error: any) {
      console.error('Orchestrator error:', error)
      return {
        feedback: [],
        followUpQuestion: null,
        success: false,
        error: error.message || 'Orchestration failed',
      }
    }
  }

  /**
   * Build cross-step context from Firestore project data
   */
  private async buildContext(request: AIRequest): Promise<AIContext> {
    try {
      const projectRef = doc(db, 'projects', request.projectId)
      const projectSnap = await getDoc(projectRef)

      if (!projectSnap.exists()) {
        throw new Error('Project not found')
      }

      const projectData = projectSnap.data()

      // Build context with all available data
      const context: AIContext = {
        projectId: request.projectId,
        chosenProblem: projectData.chosenProblem || null,
        problemExploration: projectData.problemExploration || undefined,
        problemStatement: projectData.problemStatement || undefined,
      }

      // Add zone-specific data if reviewing a zone
      if (request.zoneId && request.data?.answers) {
        context.currentZoneData = {
          zoneId: request.zoneId,
          answers: request.data.answers,
        }
      }

      // Add 4Ws field-specific data if reviewing 4Ws
      if (request.stepId === 'four-ws' && request.data?.problemStatement) {
        context.problemStatement = request.data.problemStatement
      }

      // Add Co-Founder Lab specific data
      if (request.stepId === 'cofounder-lab' && request.data) {
        context.currentZoneData = {
          zoneId: request.zoneId || 'cofounder-lab',
          answers: [],
          ...request.data, // Include all Co-Founder Lab data (stage, solutionWheel, etc.)
        }
      }

      return context
    } catch (error) {
      console.error('Error building context:', error)
      // Return minimal context on error
      return {
        projectId: request.projectId,
        chosenProblem: null,
      }
    }
  }
}

/**
 * Singleton instance creator
 */
export function createOrchestrator(): AIOrchestrator {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required')
  }
  return new AIOrchestrator(apiKey)
}
