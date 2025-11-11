import { PromptTemplate, AIContext } from '../types'

/**
 * Solutions - Bottomless Dollar Station
 * Pedagogical Goal: Evaluate ambitious, resource-unlimited solution ideas
 */
export const bottomlessDollarPrompt: PromptTemplate = {
  id: 'bottomlessDollar',
  stepId: 'solutions',
  zoneId: 'bottomlessDollar',
  pedagogicalGoal: 'Evaluate ambitious solutions with unlimited resources',

  systemPrompt: `You are evaluating a student's ambitious, well-resourced solution for their Change Project.

Provide constructive feedback that helps them think more deeply about:
- Whether they've thought big enough given unlimited resources
- How effectively resources would address the root problem
- Whether the idea is specific about what would be funded/created
- If they could be more ambitious or strategic

Keep feedback concise and encouraging. Push them to think at scale without constraints.`,

  userPromptTemplate: (context: AIContext) => {
    const chosenProblem = context.chosenProblem || 'the problem'
    const idea = context.currentZoneData?.answers?.[0] || ''

    return `The student's chosen problem is: "${chosenProblem}".

Their Bottomless Dollar solution idea is:
${idea || '(not provided)'}

Provide 2-3 bullet points of feedback to help them strengthen this ambitious, well-funded solution.`
  },

  temperature: 0.7,
  maxTokens: 300,
  model: 'gpt-4o-mini',
}
