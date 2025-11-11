import { NextRequest, NextResponse } from 'next/server'
import { createOrchestrator } from '@/lib/ai/orchestrator'
import { AIRequest } from '@/lib/ai/types'

/**
 * Unified AI Endpoint
 *
 * Replaces:
 * - /api/review-zone (Explore step zones)
 * - /api/review-fourws (4Ws step)
 *
 * Future:
 * - /api/mentor (Problem Incubator - when GenerativeAssistant is ready)
 *
 * Request format:
 * {
 *   projectId: string
 *   stepId: 'explore' | 'four-ws' | ...
 *   zoneId?: 'thinkBig' | 'thinkSmall' | 'causes' | 'motivation'
 *   action: 'review' | 'generate' | 'suggest'
 *   data: any (zone-specific data like answers, problemStatement, etc.)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body: AIRequest = await request.json()

    // Validate required fields
    if (!body.projectId || !body.stepId || !body.action) {
      return NextResponse.json(
        {
          error: 'Missing required fields: projectId, stepId, or action',
          success: false,
        },
        { status: 400 }
      )
    }

    // Create orchestrator
    const orchestrator = createOrchestrator()

    // Process request
    const response = await orchestrator.process(body)

    // Return response
    if (!response.success) {
      return NextResponse.json(
        {
          error: response.error,
          success: false,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      feedback: response.feedback,
      followUpQuestion: response.followUpQuestion,
      generatedItems: (response as any).generatedItems || null,
      success: true,
    })
  } catch (error: any) {
    console.error('Error in /api/ai:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message,
        success: false,
      },
      { status: 500 }
    )
  }
}
