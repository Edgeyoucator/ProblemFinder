// mentorLogic.ts
// Deterministic state machine for the Problem Incubator Mentor
// This mentor guides students through discovering and defining problems

export type MentorStep =
  | 'ask_passion'
  | 'select_domain'
  | 'select_issue'
  | 'clarify_issue'
  | 'present_statement'
  | 'confirm_statement'
  | 'next_action'

export interface Message {
  role: 'mentor' | 'student'
  content: string
  timestamp: number
}

export interface MentorState {
  step: MentorStep
  passionTopic: string | null
  selectedDomain: string | null
  selectedIssue: string | null
  currentStatement: string | null
  pendingConfirmation: boolean
}

// Domain options based on passion topic
// In a real implementation, you might use an LLM to generate these dynamically
export const DOMAINS = [
  { id: 'access', label: 'Access & Equity', description: 'Who is excluded or disadvantaged?' },
  { id: 'quality', label: 'Quality & Standards', description: 'What could be better or more effective?' },
  { id: 'sustainability', label: 'Sustainability', description: 'What is unsustainable or wasteful?' },
  { id: 'awareness', label: 'Awareness & Education', description: 'What do people not know or understand?' },
  { id: 'innovation', label: 'Innovation & Technology', description: 'What outdated systems need upgrading?' },
]

// Issue options per domain (simplified for MVP)
export const ISSUES_BY_DOMAIN: Record<string, Array<{ id: string; label: string }>> = {
  access: [
    { id: 'cost', label: 'Too expensive for many people' },
    { id: 'location', label: 'Not available in certain areas' },
    { id: 'knowledge', label: 'People don\'t know how to access it' },
    { id: 'discrimination', label: 'Certain groups face barriers' },
  ],
  quality: [
    { id: 'outdated', label: 'Methods or content are outdated' },
    { id: 'inconsistent', label: 'Quality varies too much' },
    { id: 'ineffective', label: 'Current approaches don\'t work well' },
    { id: 'missing', label: 'Important aspects are missing' },
  ],
  sustainability: [
    { id: 'waste', label: 'Creates too much waste' },
    { id: 'resources', label: 'Uses resources inefficiently' },
    { id: 'long_term', label: 'Not viable long-term' },
    { id: 'environmental', label: 'Harmful to environment' },
  ],
  awareness: [
    { id: 'misconceptions', label: 'Common misconceptions exist' },
    { id: 'hidden', label: 'Important info is hidden or hard to find' },
    { id: 'ignored', label: 'Issue is ignored or stigmatized' },
    { id: 'complex', label: 'Too complex for most people to understand' },
  ],
  innovation: [
    { id: 'slow', label: 'Processes are too slow or manual' },
    { id: 'old_tech', label: 'Technology is outdated' },
    { id: 'fragmented', label: 'Systems don\'t work together' },
    { id: 'potential', label: 'Not using available technology' },
  ],
}

/**
 * Get the initial mentor message based on current state
 */
export function getInitialMessage(passionTopic: string | null): string {
  if (!passionTopic) {
    return "Hi there! To start, please tell me about a topic you are passionate about. This can be anything from sports, politics, environment, maths, gaming, arts, or anything else that matters to you."
  }
  return `Great! You're passionate about ${passionTopic}. Let's explore what problems exist in this space.`
}

/**
 * Generate a problem statement based on passion topic, domain, and issue
 * This is a simplified template-based approach
 * In a full implementation, you might use an LLM to generate this
 */
export function generateProblemStatement(
  passionTopic: string,
  domain: string,
  issue: string,
  clarification?: string
): string {
  const domainObj = DOMAINS.find(d => d.id === domain)
  const issueObj = ISSUES_BY_DOMAIN[domain]?.find(i => i.id === issue)

  const templates = [
    `Many people face barriers when trying to engage with ${passionTopic} because ${issueObj?.label.toLowerCase() || 'of access issues'}.`,
    `In the field of ${passionTopic}, there is a significant problem with ${issueObj?.label.toLowerCase() || 'quality'}, affecting those who want to participate.`,
    `Current approaches to ${passionTopic} are limited by the fact that ${issueObj?.label.toLowerCase() || 'resources are scarce'}.`,
  ]

  // Add clarification if provided
  let statement = templates[Math.floor(Math.random() * templates.length)]

  if (clarification) {
    statement += ` Specifically, ${clarification}.`
  }

  return statement
}

/**
 * Get clarifying question based on domain and issue
 */
export function getClarifyingQuestion(domain: string, issue: string): string | null {
  // For MVP, we'll ask a simple clarifying question for certain combinations
  const questions: Record<string, string> = {
    'access_cost': 'What specific aspect of cost is the biggest barrier?',
    'access_location': 'Which geographic areas or communities are most affected?',
    'quality_outdated': 'What specifically is outdated or needs updating?',
    'awareness_misconceptions': 'What is the most harmful misconception?',
  }

  const key = `${domain}_${issue}`
  return questions[key] || null
}

/**
 * Process student response and determine next step
 */
export function processStudentResponse(
  currentStep: MentorStep,
  response: string,
  state: MentorState
): { nextStep: MentorStep; message: string; updates?: Partial<MentorState> } {

  switch (currentStep) {
    case 'ask_passion':
      // Student has provided their passion topic
      return {
        nextStep: 'select_domain',
        message: `Awesome! You're passionate about ${response}. Now let's think about what kinds of problems exist in this space. Which area resonates most with you?`,
        updates: { passionTopic: response }
      }

    case 'select_domain':
      // Student selected a domain, now show issues
      return {
        nextStep: 'select_issue',
        message: `Great choice. Within this area, what specific issue do you see as most important?`,
        updates: { selectedDomain: response }
      }

    case 'select_issue':
      // Student selected an issue, check if we need clarification
      const needsClarification = getClarifyingQuestion(state.selectedDomain || '', response)

      if (needsClarification) {
        return {
          nextStep: 'clarify_issue',
          message: needsClarification,
          updates: { selectedIssue: response }
        }
      } else {
        // Generate problem statement immediately
        const statement = generateProblemStatement(
          state.passionTopic || '',
          state.selectedDomain || '',
          response
        )
        return {
          nextStep: 'confirm_statement',
          message: `Based on what you've shared, here's a problem statement:\n\n"${statement}"\n\nDoes this problem statement feel strong and interesting enough that you might want to work on it?`,
          updates: { selectedIssue: response, currentStatement: statement }
        }
      }

    case 'clarify_issue':
      // Student provided clarification, generate statement
      const statement = generateProblemStatement(
        state.passionTopic || '',
        state.selectedDomain || '',
        state.selectedIssue || '',
        response
      )
      return {
        nextStep: 'confirm_statement',
        message: `Based on what you've shared, here's a problem statement:\n\n"${statement}"\n\nDoes this problem statement feel strong and interesting enough that you might want to work on it?`,
        updates: { currentStatement: statement }
      }

    case 'confirm_statement':
      // This shouldn't happen - confirmation is via buttons
      return {
        nextStep: 'confirm_statement',
        message: 'Please choose one of the options above.',
        updates: {}
      }

    case 'next_action':
      // This shouldn't happen - next action is via buttons
      return {
        nextStep: 'next_action',
        message: 'Please choose what you\'d like to do next.',
        updates: {}
      }

    default:
      return {
        nextStep: currentStep,
        message: 'I didn\'t quite understand that. Could you try again?',
        updates: {}
      }
  }
}

/**
 * Get button options for the current step
 */
export function getButtonOptions(step: MentorStep, state: MentorState): Array<{ id: string; label: string }> | null {
  switch (step) {
    case 'select_domain':
      return [
        ...DOMAINS.map(d => ({ id: d.id, label: d.label })),
        { id: 'other_domain', label: 'Show me different areas' }
      ]

    case 'select_issue':
      if (!state.selectedDomain) return null
      const issues = ISSUES_BY_DOMAIN[state.selectedDomain] || []
      return [
        ...issues,
        { id: 'different_issue', label: 'I have a different issue' }
      ]

    case 'confirm_statement':
      return [
        { id: 'yes', label: 'Yes, I like this' },
        { id: 'tweak', label: 'It\'s close, let\'s tweak it' },
        { id: 'no', label: 'No, try a different angle' }
      ]

    case 'next_action':
      return [
        { id: 'explore', label: 'Explore another problem in this topic' },
        { id: 'continue', label: 'Use this problem and continue' }
      ]

    default:
      return null
  }
}
