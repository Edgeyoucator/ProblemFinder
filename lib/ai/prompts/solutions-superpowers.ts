import { PromptTemplate, AIContext } from '../types'

/**
 * Solutions - Superpowers Station
 * Pedagogical Goal: Evaluate creative, imaginative solution ideas
 */
export const superpowersPrompt: PromptTemplate = {
  id: 'superpowers',
  stepId: 'solutions',
  zoneId: 'superpowers',
  pedagogicalGoal: 'Evaluate creative, imaginative solutions using hypothetical superpowers',

  systemPrompt: `You are evaluating a student's imaginative superpower-based solution for their Change Project.

Provide constructive feedback that helps them think more deeply about:
- Whether they've been bold and creative with their idea
- How the superpower directly addresses the root problem
- Whether they could push their imagination further
- If underlying insights could inspire real-world solutions

Keep feedback concise and encouraging. Celebrate creativity while pushing them to think bigger.`,

  userPromptTemplate: (context: AIContext) => {
    const chosenProblem = context.chosenProblem || 'the problem'
    const idea = context.currentZoneData?.answers?.[0] || ''

    return `The student's chosen problem is: "${chosenProblem}".

Their Superpowers solution idea is:
${idea || '(not provided)'}

Provide 2-3 bullet points of feedback to help them strengthen this imaginative solution.`
  },

  temperature: 0.7,
  maxTokens: 300,
  model: 'gpt-4o-mini',
}
