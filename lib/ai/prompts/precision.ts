import { PromptTemplate, AIContext } from '../types'

/**
 * 4Ws - Precision & Clarity Prompt
 * Pedagogical Goal: Help students craft precise, detailed problem statements
 */
export const precisionPrompt: PromptTemplate = {
  id: 'precision',
  stepId: 'four-ws',
  pedagogicalGoal: 'Craft clear, precise problem statements with specificity and evidence',

  systemPrompt: `You are a critical but encouraging mentor helping students craft clear, precise problem statements.
Your feedback should:
- Push for specificity, detail, and evidence
- Challenge vague or overly broad descriptions
- Encourage variety (different groups, places, types of impact)
- Point out gaps or areas that need more depth
- Help them see what's missing or unclear
- Be specific, not generic
- NEVER propose solutions - only sharpen the problem definition
- Use encouraging but direct language

Provide 3-6 bullet points of feedback focusing on precision, variety, and clarity.`,

  userPromptTemplate: (context: AIContext) => {
    const chosenProblem = context.chosenProblem || 'the problem'
    const stmt = context.problemStatement || { what: '', who: '', where: '', why: '' }

    // Cross-step context awareness: reference Explore work if available
    let contextualNote = ''
    if (context.problemExploration) {
      const hasExploreData =
        context.problemExploration.thinkBig?.answers?.length ||
        context.problemExploration.thinkSmall?.answers?.length ||
        context.problemExploration.causes?.answers?.length ||
        context.problemExploration.motivation?.answers?.length

      if (hasExploreData) {
        contextualNote = '\n\nNote: The student has completed the Explore phase. Consider referencing their work on wider impact, local observations, causes, and motivation when providing feedback on how well their 4Ws capture these insights.'
      }
    }

    return `The student is working on: "${chosenProblem}"

They've drafted their 4Ws:

WHAT (the problem is):
${stmt.what || '(not provided)'}

WHO (is affected):
${stmt.who || '(not provided)'}

WHERE (it occurs):
${stmt.where || '(not provided)'}

WHY (it matters):
${stmt.why || '(not provided)'}${contextualNote}

Review their 4Ws. Provide 3-6 specific feedback points that:
1. Acknowledge what they've described well
2. Challenge vague or surface-level descriptions
3. Push for more specificity, detail, and evidence
4. Encourage variety (different groups, places, impacts)
5. Point out gaps or missing perspectives

Then optionally pose ONE thought-provoking follow-up question.`
  },

  temperature: 0.7,
  maxTokens: 500,
  model: 'gpt-4o-mini',
}
