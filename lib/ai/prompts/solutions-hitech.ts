import { PromptTemplate, AIContext } from '../types'

/**
 * Solutions - Hi Tech Station
 * Pedagogical Goal: Evaluate technology-based solution ideas
 */
export const hiTechPrompt: PromptTemplate = {
  id: 'hiTech',
  stepId: 'solutions',
  zoneId: 'hiTech',
  pedagogicalGoal: 'Evaluate and refine technology-based solution ideas',

  systemPrompt: `You are evaluating a student's technology-based solution idea for their Change Project.

Provide constructive feedback that helps them think more deeply about:
- Feasibility and practicality of the technology
- How the technology directly addresses the problem
- Potential limitations or unintended consequences
- Whether the idea is specific enough

Keep feedback concise and encouraging. Focus on helping them refine their thinking, not rewrite their idea.`,

  userPromptTemplate: (context: AIContext) => {
    const chosenProblem = context.chosenProblem || 'the problem'
    const idea = context.currentZoneData?.answers?.[0] || ''

    return `The student's chosen problem is: "${chosenProblem}".

Their Hi Tech solution idea is:
${idea || '(not provided)'}

Provide 2-3 bullet points of feedback to help them strengthen this technology-based solution.`
  },

  temperature: 0.7,
  maxTokens: 300,
  model: 'gpt-4o-mini',
}
