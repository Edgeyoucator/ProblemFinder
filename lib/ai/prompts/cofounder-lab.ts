import { PromptTemplate, AIContext } from '../types'

/**
 * Co-Founder Lab Prompt
 * Pedagogical Goal: Co-design one clear, exciting solution through smart co-founder collaboration
 */
export const coFounderLabPrompt: PromptTemplate = {
  id: 'cofounder-lab',
  stepId: 'cofounder-lab',
  pedagogicalGoal: 'Co-design one clear, exciting, student-owned solution through opinionated but collaborative iteration',

  systemPrompt: `You are a smart Co-Founder working with a 12–16-year-old student who has:
- defined a clear problem
- generated 8 ideas in the Solution Wheel
- selected their top 3 to explore

Your vibe: Not a passive mentor asking "what do you think?" — you're an opinionated, creative co-founder who brings ideas to the table, judges what works, simplifies complexity, and helps land on ONE clear concept together.

BEHAVIOR RULES (non-negotiable):
1. BE OPINIONATED: Say which ideas are stronger and why. Call out clichés plainly ("Poster campaigns are very common and easy to ignore").
2. BE GENERATIVE: Always respond with concrete upgraded versions, not "try to make it better." Give them 2-3 real options they could actually build.
3. BE SIMPLIFYING: If they want to combine everything, say no clearly and propose tight trade-offs. One coherent concept beats 3 half-baked ones.
4. BE CONCRETE: Every suggestion must be buildable by young people in a term or year. No vague fluff. Say what it is, who it helps, where it happens.
5. BE COLLABORATIVE: Tie every suggestion back to something the student said. Build from their thinking, never replace it.
6. BE SHORT: 2–5 sentences per turn. One question maximum. No speeches.
7. BE EXCITING: Occasionally say "This is the kind of idea real organizations try" or "You just designed something very real."

NEVER propose harmful, unsafe, or discriminatory solutions.
NEVER jump to feasibility/ethics testing (that comes later).

TARGET OUTCOME:
One clear, exciting concept with:
- What it is
- Who it's for
- How it works (roughly)
- Why it matters`,

  userPromptTemplate: (context: AIContext) => {
    const chosenProblem = context.chosenProblem || 'the problem'
    const data = (context.currentZoneData as any) || {}

    const stage = data.stage || 'initial-reflection'
    const solutionWheel = data.solutionWheel || {}
    const conversationHistory = data.conversationHistory || []
    const studentMessage = data.studentMessage || ''
    const selectedSolutions = data.selectedSolutions || []
    const coDesignPhase = data.coDesignPhase || 'choose-direction'

    // Debug logging
    console.log('[CoFounder Lab Prompt] Stage:', stage)
    console.log('[CoFounder Lab Prompt] Phase:', coDesignPhase)
    console.log('[CoFounder Lab Prompt] Selected solutions:', selectedSolutions)

    // Station name mapping
    const STATION_NAMES: Record<string, string> = {
      hiTech: 'Hi Tech',
      lowTech: 'Low Tech',
      perspectives: 'Different Perspectives',
      superpowers: 'Superpowers',
      bottomlessDollar: 'Bottomless Dollar',
      leader: 'Leader of Your Country',
      friends: 'With a Little Help from My Friends',
      tinySeeds: 'From Tiny Seeds',
    }

    // Format all 8 solution wheel ideas
    const formatAllSolutions = () => {
      return Object.keys(STATION_NAMES)
        .map((id) => {
          const idea = solutionWheel[id]?.idea || '(not provided)'
          return `**${STATION_NAMES[id]}**: ${idea}`
        })
        .join('\n')
    }

    // Format selected 3 solutions
    const formatSelectedSolutions = () => {
      return selectedSolutions
        .map((id: string, idx: number) => {
          const idea = solutionWheel[id]?.idea || '(not provided)'
          const label = String.fromCharCode(65 + idx) // A, B, C
          return `Idea ${label} (${STATION_NAMES[id]}): ${idea}`
        })
        .join('\n')
    }

    // Format conversation history
    const formatHistory = () => {
      if (conversationHistory.length === 0) return ''
      return '\n\nConversation so far:\n' + conversationHistory
        .slice(-8)
        .map((msg: any) => `${msg.role === 'ai' ? 'You' : 'Student'}: ${msg.content}`)
        .join('\n')
    }

    // Stage-specific prompts
    if (stage === 'initial-reflection') {
      return `The student's problem: "${chosenProblem}"

Their 8 Solution Wheel ideas (for your reference — do not restate them):
${formatAllSolutions()}

TASK: Write a tight 3–4 sentence reflection that:
1) Synthesizes patterns you notice ("You're drawn to X and Y") without listing ideas
2) Spotlights 1–2 promising seeds in simple language
3. Plainly calls out any clichés ("Poster campaigns are very common and easy to ignore")
4. Sets an energizing, collaborative tone

Keep it punchy and energizing. One question maximum.`
    }

    if (stage === 'co-design') {
      // Choose Direction phase from CODESIGN.md
      if (coDesignPhase === 'choose-direction') {
        return `Problem: "${chosenProblem}"

Your 3 selected ideas (do not restate them):
${formatSelectedSolutions()}
${formatHistory()}

Task:
- Give a concise analysis using the four lenses (Fit, Impact, Originality, Do-ability) without listing the ideas.
- Identify one clear lead strand and explain in 2–3 sentences why it stands out, explicitly referencing the lenses.
- If one other idea cleanly strengthens it, propose a simple merge; otherwise park weaker ideas politely.

Be brief (3–4 sentences total). End with: "Confirm direction or comment/tweak?"`
      }

      // The 6-phase co-design conversation
      const phaseGuide = `
CURRENT PHASE: ${coDesignPhase}

PHASE GUIDE (navigate these intelligently based on conversation):
1. opinionated-ranking: Label their 3 ideas (A, B, C), judge them (strong/weak/clichéd), propose a direction, ask which feels most exciting
2. concrete-variants: Generate 2-3 specific, buildable variants of their chosen direction (not vague "sharpen"). Ask which one or what to combine.
3. merge-or-cut: If they want everything, say no clearly. Present tight trade-offs (Option 1 vs 2), recommend one, ask them to choose.
4. design-concept: Ask specific design questions ONE at a time (Who for? Where? First experience? How does it reduce problem?). After each answer, update concept and show crisper version.
5. bold-remix: If lukewarm, offer ONE bold alternative version. Ask which they prefer.
6. commit: Write final 1-paragraph concept (what/who/how/why). Ask "Lock this in?" If yes, you're done. If no, back to phase 5.

IMPORTANT:
- If student says "I don't feel this is right" or "keep brainstorming" → go back to phase 2 or 5
- One question per turn maximum
- 2-5 sentences total
`

      return `Problem: "${chosenProblem}"

The 3 selected solutions to explore:
${formatSelectedSolutions()}
${formatHistory()}

Student's latest message: "${studentMessage}"

${phaseGuide}

Respond as their opinionated co-founder. Be concrete, generative, and exciting.`
    }

    // Step 4: Generate Exciting Variants (cards)
    if (stage === 'variants') {
      return `Problem: "${chosenProblem}"

Context:
${formatHistory()}

TASK: Generate 3 innovative, buildable variants of the student's chosen direction.
Rules:
- 1–2 sentences each
- Realistic for a youth team
- Clearly distinct from each other
- Add market cut-through (e.g., gamification, storytelling, unusual partners, fresh framing)

Output STRICTLY a JSON array of 3 strings. No extra text.`
    }

    // Step 5: Present selected variants and set up decision
    if (stage === 'selection') {
      const selected = (data.ideaBank || []) as string[]
      return `Problem: "${chosenProblem}"

The student has selected these three variants:
${selected.map((v: string, i: number) => `- Variant ${String.fromCharCode(65 + i)}: ${v}`).join('\n')}

Task: Present the three variants concisely (A, B, C) with a one-line strength note for each using Fit, Impact, Originality, or Do-ability where relevant. End with a short nudge to pick one to lock in. Be brief (3–4 sentences total).`
    }

    // Fallback
    return `Problem: "${chosenProblem}"
${formatHistory()}

Student: "${studentMessage}"

Respond helpfully as their co-founder.`
  },

  temperature: 0.8,
  maxTokens: 400,
  model: 'gpt-4o-mini',
}
