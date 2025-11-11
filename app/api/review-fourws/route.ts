import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// ========================================
// TYPES
// ========================================

interface FourWsRequest {
  projectId: string
  chosenProblem: string
  problemStatement: {
    what: string
    who: string
    where: string
    why: string
  }
}

interface FourWsResponse {
  feedback: string[]
  followUpQuestion: string | null
}

// ========================================
// MAIN HANDLER
// ========================================

export async function POST(request: NextRequest) {
  try {
    const body: FourWsRequest = await request.json()
    const { chosenProblem, problemStatement } = body

    // Validate required fields
    if (!chosenProblem || !problemStatement) {
      return NextResponse.json(
        { error: 'Missing required fields: chosenProblem or problemStatement' },
        { status: 400 }
      )
    }

    const { what, who, where, why } = problemStatement

    // Build prompt
    const systemPrompt = `You are a critical but encouraging mentor helping students craft clear, precise problem statements.
Your feedback should:
- Push for specificity, detail, and evidence
- Challenge vague or overly broad descriptions
- Encourage variety (different groups, places, types of impact)
- Point out gaps or areas that need more depth
- Help them see what's missing or unclear
- Be specific, not generic
- NEVER propose solutions - only sharpen the problem definition
- Use encouraging but direct language

Provide 3-6 bullet points of feedback focusing on precision, variety, and clarity.`

    const userPrompt = `The student is working on: "${chosenProblem}"

They've drafted their 4Ws:

WHAT (the problem is):
${what || '(not provided)'}

WHO (is affected):
${who || '(not provided)'}

WHERE (it occurs):
${where || '(not provided)'}

WHY (it matters):
${why || '(not provided)'}

Review their 4Ws. Provide 3-6 specific feedback points that:
1. Acknowledge what they've described well
2. Challenge vague or surface-level descriptions
3. Push for more specificity, detail, and evidence
4. Encourage variety (different groups, places, impacts)
5. Point out gaps or missing perspectives

Then optionally pose ONE thought-provoking follow-up question.`

    // ========================================
    // CALL OPENAI API
    // ========================================

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    })

    const responseText = completion.choices[0]?.message?.content?.trim() || ''

    // ========================================
    // PARSE RESPONSE
    // ========================================

    // Extract feedback points (numbered or bulleted list)
    const feedbackMatch = responseText.match(/(?:\d+\.|[-•])\s*(.+?)(?=\n\d+\.|\n[-•]|\n\n|$)/g)
    const feedback = feedbackMatch
      ? feedbackMatch.map(item => item.replace(/^\d+\.|\s*[-•]\s*/, '').trim())
      : [responseText]

    // Extract follow-up question (usually last paragraph or question mark)
    let followUpQuestion: string | null = null
    const questionMatch = responseText.match(/\n\n([^•\d-][\s\S]+?\?)\s*$/)
    if (questionMatch) {
      followUpQuestion = questionMatch[1].trim()
    }

    const response: FourWsResponse = {
      feedback: feedback.slice(0, 6), // Limit to 6 points
      followUpQuestion,
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('Error in review-fourws API:', error)

    // Check for OpenAI API errors
    if (error.status === 429) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again in a moment.' },
        { status: 429 }
      )
    }

    if (error.status === 401) {
      return NextResponse.json(
        { error: 'OpenAI API key invalid or missing' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to get feedback',
        details: error.message,
      },
      { status: 500 }
    )
  }
}
