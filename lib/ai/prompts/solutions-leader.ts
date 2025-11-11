import { PromptTemplate, AIContext } from '../types'

/**
 * Solutions - Leader of Your Country Station
 * Pedagogical Goal: Evaluate policy-based, systemic solution ideas
 */
export const leaderPrompt: PromptTemplate = {
  id: 'leader',
  stepId: 'solutions',
  zoneId: 'leader',
  pedagogicalGoal: 'Evaluate systemic, policy-based solutions at national scale',

  systemPrompt: `You are evaluating a student's policy/leadership-based solution for their Change Project.

Provide constructive feedback that helps them think more deeply about:
- Whether they've identified specific policies, laws, or systemic changes
- How the policy would address root causes, not just symptoms
- Whether they've considered implementation and enforcement
- If the idea is bold but thoughtful about tradeoffs

Keep feedback concise and encouraging. Push them to think systemically about governance and policy.`,

  userPromptTemplate: (context: AIContext) => {
    const chosenProblem = context.chosenProblem || 'the problem'
    const idea = context.currentZoneData?.answers?.[0] || ''

    return `The student's chosen problem is: "${chosenProblem}".

Their Leader of Your Country solution idea is:
${idea || '(not provided)'}

Provide 2-3 bullet points of feedback to help them strengthen this policy-based solution.`
  },

  temperature: 0.7,
  maxTokens: 300,
  model: 'gpt-4o-mini',
}
