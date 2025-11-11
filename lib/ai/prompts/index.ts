// ========================================
// PROMPT LIBRARY INDEX
// ========================================

export { systemsThinkingPrompt } from './systems-thinking'
export { observationPrompt } from './observation'
export { causalAnalysisPrompt } from './causal-analysis'
export { reflectionPrompt } from './reflection'
export { precisionPrompt } from './precision'
export { whatPrompt } from './what'
export { whoPrompt } from './who'
export { wherePrompt } from './where'
export { whyPrompt } from './why'
export { hiTechPrompt } from './solutions-hitech'
export { lowTechPrompt } from './solutions-lowtech'
export { perspectivesPrompt } from './solutions-perspectives'
export { superpowersPrompt } from './solutions-superpowers'
export { bottomlessDollarPrompt } from './solutions-bottomlessdollar'
export { leaderPrompt } from './solutions-leader'
export { friendsPrompt } from './solutions-friends'
export { tinySeedsPrompt } from './solutions-tinyseeds'
export { coFounderLabPrompt } from './cofounder-lab'

import { systemsThinkingPrompt } from './systems-thinking'
import { observationPrompt } from './observation'
import { causalAnalysisPrompt } from './causal-analysis'
import { reflectionPrompt } from './reflection'
import { precisionPrompt } from './precision'
import { whatPrompt } from './what'
import { whoPrompt } from './who'
import { wherePrompt } from './where'
import { whyPrompt } from './why'
import { hiTechPrompt } from './solutions-hitech'
import { lowTechPrompt } from './solutions-lowtech'
import { perspectivesPrompt } from './solutions-perspectives'
import { superpowersPrompt } from './solutions-superpowers'
import { bottomlessDollarPrompt } from './solutions-bottomlessdollar'
import { leaderPrompt } from './solutions-leader'
import { friendsPrompt } from './solutions-friends'
import { tinySeedsPrompt } from './solutions-tinyseeds'
import { coFounderLabPrompt } from './cofounder-lab'
import { PromptTemplate } from '../types'

/**
 * All available prompts indexed by stepId + zoneId
 */
export const PROMPT_REGISTRY: Record<string, PromptTemplate> = {
  'explore:thinkBig': systemsThinkingPrompt,
  'explore:thinkSmall': observationPrompt,
  'explore:causes': causalAnalysisPrompt,
  'explore:motivation': reflectionPrompt,
  'four-ws': precisionPrompt, // Legacy: global 4Ws review (not used in new per-zone structure)
  'four-ws:what': whatPrompt,
  'four-ws:who': whoPrompt,
  'four-ws:where': wherePrompt,
  'four-ws:why': whyPrompt,
  'solutions:hiTech': hiTechPrompt,
  'solutions:lowTech': lowTechPrompt,
  'solutions:perspectives': perspectivesPrompt,
  'solutions:superpowers': superpowersPrompt,
  'solutions:bottomlessDollar': bottomlessDollarPrompt,
  'solutions:leader': leaderPrompt,
  'solutions:friends': friendsPrompt,
  'solutions:tinySeeds': tinySeedsPrompt,
  'cofounder-lab': coFounderLabPrompt,
}

/**
 * Get prompt by step and optional zone
 */
export function getPrompt(stepId: string, zoneId?: string): PromptTemplate | null {
  const key = zoneId ? `${stepId}:${zoneId}` : stepId
  return PROMPT_REGISTRY[key] || null
}
