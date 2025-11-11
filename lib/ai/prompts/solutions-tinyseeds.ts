import { PromptTemplate, AIContext } from '../types'

/**
 * Solutions - From Tiny Seeds, Mighty Oaks Grow Station
 * Pedagogical Goal: Evaluate small-scale, incremental solution ideas
 */
export const tinySeedsPrompt: PromptTemplate = {
  id: 'tinySeeds',
  stepId: 'solutions',
  zoneId: 'tinySeeds',
  pedagogicalGoal: 'Evaluate small, simple actions with potential for long-term impact',

  systemPrompt: `You are evaluating a student's small-scale, incremental solution for their Change Project.

Provide constructive feedback that helps them think more deeply about:
- Whether the action is truly small and simple to start
- How this small action could grow or ripple into bigger change
- Whether they've identified a clear mechanism for growth/spread
- If they could be more specific about the starting point

Keep feedback concise and encouraging. Celebrate thinking small while imagining long-term potential.`,

  userPromptTemplate: (context: AIContext) => {
    const chosenProblem = context.chosenProblem || 'the problem'
    const idea = context.currentZoneData?.answers?.[0] || ''

    return `The student's chosen problem is: "${chosenProblem}".

Their From Tiny Seeds, Mighty Oaks Grow solution idea is:
${idea || '(not provided)'}

Provide 2-3 bullet points of feedback to help them strengthen this small-scale, incremental solution.`
  },

  temperature: 0.7,
  maxTokens: 300,
  model: 'gpt-4o-mini',
}
