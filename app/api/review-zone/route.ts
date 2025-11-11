import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// ========================================
// TYPES
// ========================================

type ZoneId = 'thinkBig' | 'thinkSmall' | 'causes' | 'motivation'

interface ReviewRequest {
  projectId: string
  zoneId: ZoneId
  zoneData: any
  chosenProblem: string
  otherZones?: any
}

interface ReviewResponse {
  feedback: string[]
  followUpQuestion: string | null
}

// ========================================
// ZONE PROMPTS
// ========================================

const ZONE_REVIEW_PROMPTS = {
  thinkBig: {
    systemPrompt: `You are a critical but encouraging mentor helping students explore the wider impact of social problems.
Your feedback should:
- Challenge students to think more broadly and systemically
- Point out blind spots or assumptions
- Connect their thinking to real-world examples
- Suggest areas they haven't considered
- Be specific, not generic
- NEVER propose solutions - only deepen understanding of the problem
- Use encouraging but direct language`,

    userPromptTemplate: (problem: string, answers: string[], resources: any[]) => `
The student is exploring: "${problem}"

They think the wider effects are:
${answers.filter(a => a.trim()).map((a, i) => `${i + 1}. ${a}`).join('\n')}

${resources.length > 0 ? `They've found these resources:\n${resources.map(r => `- ${r.label}: ${r.url}`).join('\n')}` : ''}

Review their thinking. Provide 3-5 specific feedback points that:
1. Acknowledge what they've identified well
2. Challenge gaps or surface-level thinking
3. Suggest connections they might be missing
4. Encourage deeper exploration

Then optionally pose ONE thought-provoking follow-up question.
`,
  },

  thinkSmall: {
    systemPrompt: `You are a critical but encouraging mentor helping students ground abstract problems in their lived experience.
Your feedback should:
- Push for concrete, observable examples
- Challenge vague or abstract descriptions
- Help them see the problem in their immediate environment
- Point out when they're staying too theoretical
- Be specific, not generic
- NEVER propose solutions - only deepen observation of the problem
- Use encouraging but direct language`,

    userPromptTemplate: (problem: string, answers: string[], imageUrls: string[]) => `
The student is exploring: "${problem}"

They observe locally:
${answers.filter(a => a.trim()).map((a, i) => `${i + 1}. ${a}`).join('\n')}

${imageUrls.length > 0 ? `They've added ${imageUrls.length} image(s) for reference.` : ''}

Review their observations. Provide 3-5 specific feedback points that:
1. Acknowledge concrete details they've noticed
2. Challenge vague or abstract descriptions
3. Push for more specific, observable evidence
4. Help them see patterns or details they might miss

Then optionally pose ONE question that deepens their observation.
`,
  },

  causes: {
    systemPrompt: `You are a critical but encouraging mentor helping students analyze root causes of problems.
Your feedback should:
- Distinguish between symptoms and actual causes
- Push for deeper, systemic analysis
- Challenge surface-level or simplistic explanations
- Encourage thinking about power, systems, and structures
- Be specific, not generic
- NEVER propose solutions - only deepen understanding of causes
- Use encouraging but direct language`,

    userPromptTemplate: (problem: string, answers: string[]) => `
The student is exploring: "${problem}"

They think the causes are:
${answers.filter(a => a.trim()).map((a, i) => `${i + 1}. ${a}`).join('\n')}

Review their analysis. Provide 3-5 specific feedback points that:
1. Acknowledge strong causal thinking
2. Point out where they might be confusing symptoms with causes
3. Challenge surface-level explanations
4. Suggest systemic or structural factors they haven't considered

Then optionally pose ONE question about root causes.
`,
  },

  motivation: {
    systemPrompt: `You are a critical but encouraging mentor helping students connect emotionally to social problems.
Your feedback should:
- Validate their emotional connection
- Push for deeper personal reflection
- Connect their values to the problem
- Challenge generic or surface motivations
- Help them articulate WHY this matters
- Be specific, not generic
- NEVER propose solutions - only deepen personal connection
- Use encouraging but direct language`,

    userPromptTemplate: (problem: string, answers: string[]) => `
The student is exploring: "${problem}"

Their motivation:
${answers.filter(a => a.trim()).map((a, i) => `\nReflection ${i + 1}:\n${a}`).join('\n')}

Review their reflections. Provide 3-5 specific feedback points that:
1. Acknowledge authentic emotional connection
2. Push for deeper articulation of values
3. Challenge generic statements
4. Help them connect this to their identity and experiences

Then optionally pose ONE question about their deeper motivations.
`,
  },
}

// ========================================
// MAIN HANDLER
// ========================================

export async function POST(request: NextRequest) {
  try {
    const body: ReviewRequest = await request.json()
    const { zoneId, zoneData, chosenProblem, otherZones } = body

    // Validate required fields
    if (!zoneId || !zoneData || !chosenProblem) {
      return NextResponse.json(
        { error: 'Missing required fields: zoneId, zoneData, or chosenProblem' },
        { status: 400 }
      )
    }

    // Get zone-specific prompts
    const zonePrompts = ZONE_REVIEW_PROMPTS[zoneId]
    if (!zonePrompts) {
      return NextResponse.json(
        { error: 'Invalid zoneId' },
        { status: 400 }
      )
    }

    // Build user prompt based on zone type
    let userPrompt = ''
    switch (zoneId) {
      case 'thinkBig':
        userPrompt = ZONE_REVIEW_PROMPTS.thinkBig.userPromptTemplate(
          chosenProblem,
          zoneData.answers || [],
          zoneData.resources || []
        )
        break
      case 'thinkSmall':
        userPrompt = ZONE_REVIEW_PROMPTS.thinkSmall.userPromptTemplate(
          chosenProblem,
          zoneData.answers || [],
          zoneData.imageUrls || []
        )
        break
      case 'causes':
        userPrompt = ZONE_REVIEW_PROMPTS.causes.userPromptTemplate(
          chosenProblem,
          zoneData.answers || []
        )
        break
      case 'motivation':
        userPrompt = ZONE_REVIEW_PROMPTS.motivation.userPromptTemplate(
          chosenProblem,
          zoneData.answers || []
        )
        break
    }

    // ========================================
    // CALL OPENAI API
    // ========================================

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: zonePrompts.systemPrompt,
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

    const response: ReviewResponse = {
      feedback: feedback.slice(0, 5), // Limit to 5 points
      followUpQuestion,
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('Error in review-zone API:', error)

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
