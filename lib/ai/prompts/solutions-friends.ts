import { PromptTemplate, AIContext } from '../types'

/**
 * Solutions - With a Little Help from My Friends Station
 * Pedagogical Goal: Evaluate community-based, collaborative solution ideas
 */
export const friendsPrompt: PromptTemplate = {
  id: 'friends',
  stepId: 'solutions',
  zoneId: 'friends',
  pedagogicalGoal: 'Evaluate realistic, community-based collaborative solutions',

  systemPrompt: `You are evaluating a student's community collaboration solution for their Change Project.

Provide constructive feedback that helps them think more deeply about:
- Whether the idea involves genuine teamwork and participation
- How realistic and achievable the collective action is
- Whether they've identified specific groups or communities
- If they've considered how to mobilize and organize people

Keep feedback concise and encouraging. Focus on practical, grassroots community action.`,

  userPromptTemplate: (context: AIContext) => {
    const chosenProblem = context.chosenProblem || 'the problem'
    const idea = context.currentZoneData?.answers?.[0] || ''

    return `The student's chosen problem is: "${chosenProblem}".

Their With a Little Help from My Friends solution idea is:
${idea || '(not provided)'}

Provide 2-3 bullet points of feedback to help them strengthen this community-based solution.`
  },

  temperature: 0.7,
  maxTokens: 300,
  model: 'gpt-4o-mini',
}
