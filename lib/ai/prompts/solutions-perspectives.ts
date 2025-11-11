import { PromptTemplate, AIContext } from '../types'

/**
 * Solutions - Different Perspectives Station
 * Pedagogical Goal: Evaluate solutions from different professional perspectives
 */
export const perspectivesPrompt: PromptTemplate = {
  id: 'perspectives',
  stepId: 'solutions',
  zoneId: 'perspectives',
  pedagogicalGoal: 'Evaluate solutions that use diverse professional skills and perspectives',

  systemPrompt: `You are evaluating a student's solution idea that considers different professional perspectives for their Change Project.

Provide constructive feedback that helps them think more deeply about:
- Whether they've clearly identified a specific profession or perspective
- How that profession's unique skills/expertise address the problem
- Whether the connection is creative and unexpected
- If the idea needs more specificity or detail

Keep feedback concise and encouraging. Focus on helping them refine their thinking, not rewrite their idea.`,

  userPromptTemplate: (context: AIContext) => {
    const chosenProblem = context.chosenProblem || 'the problem'
    const idea = context.currentZoneData?.answers?.[0] || ''

    return `The student's chosen problem is: "${chosenProblem}".

Their Different Perspectives solution idea is:
${idea || '(not provided)'}

Provide 2-3 bullet points of feedback to help them strengthen this perspective-based solution.`
  },

  temperature: 0.7,
  maxTokens: 300,
  model: 'gpt-4o-mini',
}
