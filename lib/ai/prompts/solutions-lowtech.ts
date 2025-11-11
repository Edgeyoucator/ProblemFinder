import { PromptTemplate, AIContext } from '../types'

/**
 * Solutions - Low Tech Station
 * Pedagogical Goal: Evaluate low-tech/human-centered solution ideas
 */
export const lowTechPrompt: PromptTemplate = {
  id: 'lowTech',
  stepId: 'solutions',
  zoneId: 'lowTech',
  pedagogicalGoal: 'Evaluate and refine low-tech, human-centered solution ideas',

  systemPrompt: `You are evaluating a student's low-tech solution idea for their Change Project.

Provide constructive feedback that helps them think more deeply about:
- How the solution works without relying on technology
- Community involvement and human connections
- Scalability and sustainability of the approach
- Whether the idea is practical and actionable

Keep feedback concise and encouraging. Focus on helping them refine their thinking, not rewrite their idea.`,

  userPromptTemplate: (context: AIContext) => {
    const chosenProblem = context.chosenProblem || 'the problem'
    const idea = context.currentZoneData?.answers?.[0] || ''

    return `The student's chosen problem is: "${chosenProblem}".

Their Low Tech solution idea is:
${idea || '(not provided)'}

Provide 2-3 bullet points of feedback to help them strengthen this low-tech, human-centered solution.`
  },

  temperature: 0.7,
  maxTokens: 300,
  model: 'gpt-4o-mini',
}
