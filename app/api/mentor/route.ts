import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

type Stage = 'passion' | 'domain' | 'issue' | 'statement' | 'confirmation' | 'next_action'

interface ButtonOption {
  id: string
  label: string
  type: 'domain' | 'issue' | 'action' | 'other'
}

// ========================================
// VALIDATION HELPER
// ========================================

/**
 * Detects solution-oriented language that should NOT appear in problem statements
 */
function containsSolutionLanguage(text: string): boolean {
  const solutionWords = [
    'create a',
    'develop a',
    'design a',
    'build a',
    'implement a',
    'establish a',
    'launch a',
    'start a',
    'organize a',
    'campaign',
    'program to',
    'initiative to',
    'project to',
    'solution',
    'app that',
    'website that',
    'system that',
  ]

  const lowerText = text.toLowerCase()
  const hasSolutionWord = solutionWords.some(word => lowerText.includes(word))

  if (hasSolutionWord) {
    console.warn('⚠️ Solution language detected:', text)
  }

  return hasSolutionWord
}

/**
 * Filters out solution-oriented responses from AI
 */
function filterSolutions(items: string[]): string[] {
  return items.filter(item => !containsSolutionLanguage(item))
}

/**
 * Removes markdown code fences from JSON responses
 */
function cleanJsonResponse(text: string): string {
  // Remove ```json and ``` markers
  return text.replace(/^```json\s*\n?/i, '').replace(/\n?```\s*$/,  '')
}

// ========================================
// MAIN HANDLER
// ========================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      stage,
      passionTopic,
      selectedDomain,
      selectedIssues = [],
      regenerate = false,
      originalStatement,
      tweakInstructions,
      previousSuggestions = []
    } = body

    let response: {
      message: string
      buttons?: ButtonOption[]
      problemStatement?: string
      stage: Stage
    }

    switch (stage) {
      case 'domain':
        response = await generateDomains(passionTopic, regenerate, previousSuggestions)
        break

      case 'issue':
        response = await generateIssues(passionTopic, selectedDomain, selectedIssues, regenerate, previousSuggestions)
        break

      case 'statement':
        response = await generateStatement(passionTopic, selectedDomain, selectedIssues)
        break

      case 'tweak':
        const tweakedStatement = await tweakStatement(originalStatement, tweakInstructions)
        response = {
          message: `How about this: "${tweakedStatement}"\n\nDoes this work better?`,
          buttons: [
            { id: 'yes', label: 'Yes, I like this', type: 'action' },
            { id: 'tweak', label: "Let's tweak it more", type: 'action' },
            { id: 'different', label: 'Try a different domain', type: 'action' },
          ],
          problemStatement: tweakedStatement,
          stage: 'statement',
        }
        break

      default:
        response = {
          message: 'Invalid stage',
          stage: 'passion',
        }
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Error in mentor API:', error)
    return NextResponse.json(
      {
        error: 'Failed to get mentor response',
        details: error.message,
      },
      { status: 500 }
    )
  }
}

// ========================================
// DOMAIN GENERATION
// ========================================

async function generateDomains(passionTopic: string, regenerate: boolean, previousSuggestions: string[] = []): Promise<{
  message: string
  buttons: ButtonOption[]
  stage: Stage
}> {
  const avoidanceContext = previousSuggestions.length > 0
    ? `\n\n⚠️ CRITICAL: DO NOT suggest any of these previously shown domains:\n${previousSuggestions.map(s => `- "${s}"`).join('\n')}\n\nYou MUST generate completely DIFFERENT problem areas that are DISTINCT from the above.`
    : ''

  const prompt = regenerate
    ? `The student is passionate about "${passionTopic}". They didn't like the previous domain options.${avoidanceContext}

CRITICAL: Generate 5 DIFFERENT **PROBLEM AREAS** (not solution spaces) to explore.

Each domain should be framed as a PROBLEM area or CHALLENGE area, such as:
✅ GOOD: "Access and Inclusion Barriers"
✅ GOOD: "Safety and Security Issues"
✅ GOOD: "Quality and Standards Concerns"
❌ BAD: "Programs to Improve Access" (this is a solution)
❌ BAD: "Creating Better Safety" (this is a solution)

Return ONLY a JSON array of 5 strings. Example format:
["Problem area 1", "Problem area 2", "Problem area 3", "Problem area 4", "Problem area 5"]`
    : `The student is passionate about "${passionTopic}".

Generate 5 distinct **PROBLEM AREAS** they could explore within this passion topic.

CRITICAL: Frame each as a PROBLEM area, not a solution space:
✅ GOOD: "Access and Inclusion Barriers"
✅ GOOD: "Environmental Impact Issues"
✅ GOOD: "Cost and Affordability Challenges"
❌ BAD: "Programs to Improve..." (solution-oriented)
❌ BAD: "Creating Better..." (solution-oriented)

Return ONLY a JSON array of 5 strings. Example format:
["Problem area 1", "Problem area 2", "Problem area 3", "Problem area 4", "Problem area 5"]`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You identify PROBLEMS and CHALLENGES, never solutions. You help students discover issues that need addressing. Always respond with valid JSON arrays only.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.8,
    max_tokens: 200,
  })

  const rawContent = completion.choices[0]?.message?.content?.trim() || '[]'
  const content = cleanJsonResponse(rawContent)

  let domains: string[]
  try {
    domains = JSON.parse(content)
    // Filter out any solution-oriented domains
    domains = filterSolutions(domains)

    // If filtering removed too many, add fallbacks
    if (domains.length < 3) {
      domains = [
        'Access and Inclusion Issues',
        'Quality and Standards Concerns',
        'Safety and Well-being Challenges',
        'Awareness and Knowledge Gaps',
        'Resource and Support Limitations',
      ]
    }
  } catch {
    // Fallback domains if parsing fails
    domains = [
      'Access and Inclusion Issues',
      'Quality and Standards Concerns',
      'Safety and Well-being Challenges',
      'Awareness and Knowledge Gaps',
      'Resource and Support Limitations',
    ]
  }

  const buttons: ButtonOption[] = domains.slice(0, 5).map((domain, idx) => ({
    id: `domain_${idx}`,
    label: domain,
    type: 'domain' as const,
  }))

  buttons.push({
    id: 'show_different',
    label: 'Show me different domain areas',
    type: 'action' as const,
  })

  buttons.push({
    id: 'other_domain',
    label: 'Other (describe your own)',
    type: 'other' as const,
  })

  const message = regenerate
    ? (passionTopic ? `Here are some different problem areas to explore in ${passionTopic}. Which one interests you?` : "Here are some different problem areas to explore. Which one interests you?")
    : `Awesome! You're passionate about ${passionTopic || 'this topic'}. Let's explore what kinds of problems exist in this space. Which area would you like to dive into?`

  return {
    message,
    buttons,
    stage: 'domain',
  }
}

// ========================================
// ISSUE GENERATION
// ========================================

async function generateIssues(
  passionTopic: string,
  domain: string,
  previousIssues: string[],
  regenerate: boolean = false,
  previousSuggestions: string[] = []
): Promise<{
  message: string
  buttons: ButtonOption[]
  stage: Stage
}> {
  const depthLimit = 2 // Max 2 rounds of narrowing
  const currentDepth = previousIssues.length

  if (currentDepth >= depthLimit) {
    // Time to generate problem statement
    return generateStatement(passionTopic, domain, previousIssues)
  }

  const previousContext = previousIssues.length > 0
    ? `\n\nThe student has already selected: ${previousIssues.join(' → ')}`
    : ''

  const avoidanceContext = previousSuggestions.length > 0
    ? `\n\n⚠️ CRITICAL: DO NOT suggest any of these previously shown issues:\n${previousSuggestions.map(s => `- "${s}"`).join('\n')}\n\nYou MUST generate completely DIFFERENT issues that are DISTINCT from the above.`
    : ''

  const regenerateContext = regenerate
    ? `\n\nThe student didn't like the previous issue options. Generate DIFFERENT specific problems.`
    : ''

  const prompt = `A student passionate about "${passionTopic}" is exploring "${domain}" problems.${previousContext}${regenerateContext}${avoidanceContext}

CRITICAL: Generate 3-4 SPECIFIC${regenerate ? ' DIFFERENT' : ''} problems about "${domain}" that occur in the ${passionTopic} world.

Core rules:
- Every problem MUST happen in the ${passionTopic} context (not generic problems)
- Problems must be things that ${passionTopic} enthusiasts/participants/communities actually experience
- Describe what IS WRONG (never suggest solutions)

NEVER use solution words: "create", "develop", "design", "build", "campaign", "program", "app"

ALWAYS frame as PROBLEMS: "lack of", "insufficient", "limited", "poor", "barriers to", "challenges with"

Requirements:
- Specific to ${passionTopic} (not generic)
- Observable and concrete
- Age-appropriate (10-17 years)

Return ONLY a JSON array of 3-4 strings:
["Problem 1", "Problem 2", "Problem 3"]`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You identify PROBLEMS within specific contexts, never solutions. Every problem you generate MUST occur in the student's passion topic context. You NEVER suggest creating, developing, or building anything. You only describe what is wrong or lacking. Always respond with valid JSON arrays only.`,
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.5,
    max_tokens: 300,
  })

  const rawContent = completion.choices[0]?.message?.content?.trim() || '[]'
  const content = cleanJsonResponse(rawContent)

  let issues: string[]
  try {
    issues = JSON.parse(content)

    // CRITICAL: Filter out solution-oriented responses
    const originalCount = issues.length
    issues = filterSolutions(issues)

    if (issues.length < originalCount) {
      console.warn(`⚠️ Filtered out ${originalCount - issues.length} solution-oriented items`)
    }

    // If filtering removed too many, use problem-focused fallbacks
    if (issues.length < 2) {
      // Handle meta/abstract domains that create circular language
      const isMetaDomain = domain.toLowerCase().includes('awareness') ||
                          domain.toLowerCase().includes('knowledge') ||
                          domain.toLowerCase().includes('information')

      if (isMetaDomain) {
        issues = [
          `People in the ${passionTopic} community don't understand key ${domain.toLowerCase().replace(/awareness and |knowledge /g, '')}`,
          `Important information about ${passionTopic} isn't reaching the right people`,
          `Misconceptions and myths about ${passionTopic} are widespread`,
          `Lack of education about important ${passionTopic} topics`,
        ]
      } else {
        issues = [
          `Lack of ${domain.toLowerCase()} in the ${passionTopic} community`,
          `Poor quality ${domain.toLowerCase()} for ${passionTopic} enthusiasts`,
          `Inconsistent ${domain.toLowerCase()} across ${passionTopic} activities`,
          `Limited access to ${domain.toLowerCase()} for people interested in ${passionTopic}`,
        ]
      }
    }
  } catch (error) {
    console.error('Error parsing issues:', error)
    // Fallback issues with passion topic context
    issues = [
      `Limited ${domain.toLowerCase()} in the ${passionTopic} community`,
      `Inconsistent ${domain.toLowerCase()} for ${passionTopic} participants`,
      `Poor access to ${domain.toLowerCase()} for people interested in ${passionTopic}`,
    ]
  }

  const buttons: ButtonOption[] = issues.slice(0, 4).map((issue, idx) => ({
    id: `issue_${idx}`,
    label: issue,
    type: 'issue' as const,
  }))

  buttons.push({
    id: 'regenerate_issues',
    label: 'Show different issues',
    type: 'action' as const,
  })

  buttons.push({
    id: 'start_over',
    label: 'Start from the beginning',
    type: 'action' as const,
  })

  const message = regenerate
    ? `Here are some different issues within "${domain}". Which one interests you?`
    : (currentDepth === 0
      ? `Great choice! Within "${domain}", what specific issue would you like to explore?`
      : `Let's narrow it down further. What aspect of this interests you most?`)

  return {
    message,
    buttons,
    stage: 'issue',
  }
}

// ========================================
// PROBLEM STATEMENT GENERATION
// ========================================

async function generateStatement(
  passionTopic: string,
  domain: string,
  issues: string[]
): Promise<{
  message: string
  buttons: ButtonOption[]
  problemStatement: string
  stage: Stage
}> {
  const issuesPath = issues.join(' → ')

  const prompt = `Generate a clear, concise PROBLEM statement (NOT a solution):

PRIMARY CONTEXT: ${passionTopic}
Problem Area: ${domain}
Specific Focus: ${issuesPath}

CRITICAL: This problem exists in the ${passionTopic} world, not a generic problem.

Requirements:
- Make ${passionTopic} the clear context
- Identify who is affected (${passionTopic} enthusiasts/participants/communities)
- Describe the specific PROBLEM related to ${domain}
- Age-appropriate (10-17 years)

NEVER say: "We need to create...", "People should develop...", "Design a program..."
ALWAYS say: "People face...", "There is a lack of...", "[Group] struggles with..."

Format: "[Affected group in ${passionTopic}] face/struggle with/lack [specific ${domain} problem] in/during [${passionTopic} activities/context]."

Return ONLY the problem statement. Do not include quotation marks.`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You create clear PROBLEM statements within specific contexts. Every problem MUST occur in the student's passion topic world. You NEVER suggest solutions. You only describe what is wrong or lacking.`,
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.6,
    max_tokens: 150,
  })

  let problemStatement = completion.choices[0]?.message?.content?.trim() ||
    `People interested in ${passionTopic} face challenges with ${domain.toLowerCase()} in their community.`

  // Remove quotes if AI added them
  problemStatement = problemStatement.replace(/^["']|["']$/g, '')

  // Validate: if it contains solution language, use fallback
  if (containsSolutionLanguage(problemStatement)) {
    console.error('⚠️ AI generated solution-oriented statement, using fallback')
    problemStatement = `People interested in ${passionTopic} face challenges with ${issuesPath.toLowerCase()} in their community.`
  }

  const buttons: ButtonOption[] = [
    {
      id: 'yes',
      label: 'Save this problem statement',
      type: 'action',
    },
    {
      id: 'tweak',
      label: "Let's tweak it",
      type: 'action',
    },
    {
      id: 'different',
      label: 'Try a different domain',
      type: 'action',
    },
  ]

  return {
    message: `Based on what you've shared, here's a problem statement:\n\n"${problemStatement}"\n\nDoes this problem statement feel strong and interesting enough that you might want to work on it?`,
    buttons,
    problemStatement,
    stage: 'statement',
  }
}

// ========================================
// STATEMENT TWEAKING
// ========================================

async function tweakStatement(
  originalStatement: string,
  tweakInstructions: string
): Promise<string> {
  const prompt = `Original problem statement:
"${originalStatement}"

Student's modification request: "${tweakInstructions}"

Modify the problem statement according to the student's request while:
1. Keeping it as a PROBLEM statement (not a solution)
2. Maintaining the core issue
3. Following their specific instructions (e.g., "make it shorter", "use simpler language", "focus more on X")
4. Remaining appropriate for students aged 10-17

Common modification requests:
- "make it shorter" → Condense to 1-2 sentences
- "simpler language" → Use everyday words, avoid jargon
- "focus more on [X]" → Emphasize that aspect
- "less technical" → Remove complex terms

⚠️ CRITICAL: Output must still be a PROBLEM statement, not a solution.

Return ONLY the modified problem statement, nothing else. Do not include quotation marks.`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You modify problem statements based on student feedback. You keep statements focused on problems, never solutions. You make adjustments while preserving the core issue.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.6, // Lower temp for more controlled modifications
    max_tokens: 150,
  })

  let tweakedStatement = completion.choices[0]?.message?.content?.trim() || originalStatement

  // Remove quotes if AI added them
  tweakedStatement = tweakedStatement.replace(/^["']|["']$/g, '')

  // Validate: if it contains solution language, revert to original
  if (containsSolutionLanguage(tweakedStatement)) {
    console.error('⚠️ Tweaked statement contains solution language, reverting to original')
    tweakedStatement = originalStatement
  }

  return tweakedStatement
}
