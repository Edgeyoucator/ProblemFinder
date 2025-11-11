# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Clear Next.js cache (if encountering build errors)
rm -rf .next && npm run dev
```

## Environment Setup

Required environment variable in `.env.local`:
- `OPENAI_API_KEY`: API key for OpenAI GPT-4o-mini

Firebase configuration is hardcoded in `firebase.ts` (public educational project).

## Architecture Overview

### Journey-Based Multi-Step Flow

The application implements a horizontal sliding canvas journey with 4 main steps:

1. **Explore** - Problem exploration through 4 zones (Think Big, Think Small, Causes, Motivation)
2. **4Ws** - Problem statement refinement (What, Who, Where, Why)
3. **Solutions** - Solution Wheel with 8 creative constraint stations
4. **Co-Founder Lab** - AI-driven collaborative solution design

**Key Files:**
- `app/project/[projectId]/journey/page.tsx` - Journey orchestrator, step registration, completion logic
- `app/project/[projectId]/steps/` - Individual step components

Each step has a completion check function registered in `journey/page.tsx`. Steps unlock sequentially as the previous step is completed.

### AI Architecture: Orchestrator Pattern

The AI system uses a centralized orchestrator that routes requests to specialized assistants based on pedagogical context.

**Request Flow:**
```
Frontend Step Component
  → POST /api/ai
  → AIOrchestrator.process()
  → Fetches project context from Firestore
  → Selects PromptTemplate from PROMPT_REGISTRY (stepId:zoneId)
  → Routes to ReviewAssistant (or future GenerativeAssistant)
  → Returns structured AIResponse
```

**Key Files:**
- `lib/ai/orchestrator.ts` - Central routing, context building from Firestore
- `lib/ai/prompts/index.ts` - PROMPT_REGISTRY mapping `stepId:zoneId` to templates
- `lib/ai/prompts/*.ts` - Individual prompt templates with pedagogical goals
- `lib/ai/types.ts` - Shared interfaces (AIRequest, AIResponse, AIContext, PromptTemplate)
- `lib/ai/assistants/ReviewAssistant.ts` - Processes review/generate actions via OpenAI
- `app/api/ai/route.ts` - Unified API endpoint

**AIContext Cross-Step Awareness:**
The orchestrator builds rich context by fetching the full project document from Firestore, allowing prompts to reference:
- `chosenProblem` - The student's selected problem
- `problemExploration` - Data from Explore step (4 zones)
- `problemStatement` - Data from 4Ws step
- `currentZoneData` - The specific zone/field being reviewed

### Adding New AI Prompts

When adding a new step or zone:

1. Create prompt file in `lib/ai/prompts/` implementing `PromptTemplate` interface
2. Export from `lib/ai/prompts/index.ts`
3. Register in `PROMPT_REGISTRY` with key format: `stepId:zoneId` or just `stepId`
4. Extend `AIContext` in `lib/ai/types.ts` if new data structures needed
5. Update `buildContext()` in `orchestrator.ts` to populate new context fields

### Co-Founder Lab Special Behavior

The Co-Founder Lab (Step 4) uses conversational AI with phase-based navigation:

**Stages:**
1. `initial-reflection` - AI reviews all 8 solution wheel ideas
2. `choosing-directions` - Student selects top 3 solutions visually
3. `co-design` - AI-driven 6-phase collaborative design conversation
4. `completed` - Final solution locked in

**Co-Design Phases** (AI navigates intelligently):
1. `opinionated-ranking` - AI judges 3 ideas, proposes direction
2. `concrete-variants` - AI generates 2-3 buildable variants
3. `merge-or-cut` - AI presents tight trade-offs
4. `design-concept` - AI asks specific design questions (who/where/how/why)
5. `bold-remix` - AI offers bold alternative if lukewarm
6. `commit` - AI writes final concept, asks to lock in

**Key Behavior Rules** (enforced in prompt):
- BE OPINIONATED: Call out strong/weak ideas, identify clichés
- BE GENERATIVE: Provide concrete upgraded versions, not vague suggestions
- BE SIMPLIFYING: Say no to messy combinations, present clear trade-offs
- BE CONCRETE: Every suggestion must be buildable by youth
- BE COLLABORATIVE: Tie suggestions to student's words
- BE SHORT: 2-5 sentences per turn, one question max
- BE EXCITING: Affirm when students design real solutions

**Implementation:**
- `app/project/[projectId]/steps/CoFounderLabStep.tsx` - Main component
- `lib/ai/prompts/cofounder-lab.ts` - Prompt with behavior rules and phase guide
- Auto-triggers AI responses at stage transitions
- Conversation history maintained in Firestore

### Data Model (Firestore)

**Collection:** `projects`

**Document Structure:**
```typescript
{
  passionTopic: string
  problemMap: Array<{statement, domain, path[], timestamp}>
  chosenProblem: string
  currentStepId: string  // 'explore' | 'four-ws' | 'solutions' | 'cofounder-lab'

  // Explore step
  problemExploration: {
    thinkBig: {answers: string[], hasCheckedFeedback: boolean}
    thinkSmall: {answers: string[], hasCheckedFeedback: boolean}
    causes: {answers: string[], hasCheckedFeedback: boolean}
    motivation: {answers: string[], hasCheckedFeedback: boolean}
  }

  // 4Ws step
  problemStatement: {
    what: {answer: string, hasCheckedFeedback: boolean}
    who: {answer: string, hasCheckedFeedback: boolean}
    where: {answer: string, hasCheckedFeedback: boolean}
    why: {answer: string, hasCheckedFeedback: boolean}
  }

  // Solutions step
  solutionWheel: {
    [stationId]: {idea: string, hasCheckedFeedback: boolean}
  }

  // Co-Founder Lab step
  coFounderLab: {
    conversationHistory: Array<{role: 'ai'|'student', content: string, timestamp: number}>
    currentStage: 'initial-reflection' | 'choosing-directions' | 'co-design' | 'completed'
    selectedSolutions: string[]  // 3 station IDs
    coDesignPhase: string  // Which phase within co-design
    proposedSolution: {
      title: string
      description: string
      whoItsFor: string
      howItWorks: string
      whyItMatters: string
    }
  }
}
```

### Firebase Helpers

- `ensureAuth()` - Ensures anonymous auth before any Firestore operations
- `subscribeToProject(projectId, callback)` - Real-time listener for project updates
- `updateProject(projectId, data)` - Helper to update project fields

### Validation System

`app/utils/validation.ts` provides:
- `isValidResponse(text, minLength)` - Checks length, filters filler text ("idk", "...", etc.)
- `isUniqueResponse(text, allResponses)` - Prevents duplicates
- `isZoneComplete(responses, requiredCount)` - Validates zone completion
- `isSolutionStationComplete(idea, minLength, hasChecked)` - Validates solution stations

Used by step completion checks in `journey/page.tsx`.

### Step Completion Pattern

Each step must implement `hasCheckedFeedback` flag to prevent premature progression:

1. Student fills in responses
2. Student clicks "Get AI Feedback" → sets `hasCheckedFeedback: true`
3. Completion check requires both valid responses AND `hasCheckedFeedback: true`
4. Journey's right arrow enables when step complete

**Example (Explore step):**
```typescript
isZoneComplete(exploration.thinkBig?.answers || [], 3) &&
exploration.thinkBig?.hasCheckedFeedback === true
```

## Common Patterns

### Updating Nested Firestore Fields

Always use nested field paths to avoid overwriting sibling data:

```typescript
await updateDoc(projectRef, {
  'problemExploration.thinkBig.answers': newAnswers,
  'problemExploration.thinkBig.hasCheckedFeedback': true,
  updatedAt: new Date()
})
```

### AI Request Pattern (from Step Components)

```typescript
const response = await fetch('/api/ai', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    projectId,
    stepId: 'explore',
    zoneId: 'thinkBig',
    action: 'review',
    data: { answers: ['response1', 'response2', 'response3'] }
  })
})
const result = await response.json()
// result.feedback: string[]
// result.success: boolean
```

### Auto-Trigger AI Pattern (Co-Founder Lab)

For AI-initiated messages without user input:

```typescript
const generateAIResponse = async (data: CoFounderLabData, trigger: string) => {
  const response = await fetch('/api/ai', {
    method: 'POST',
    body: JSON.stringify({
      projectId,
      stepId: 'cofounder-lab',
      action: 'generate',
      data: {
        stage: data.currentStage,
        studentMessage: trigger,  // e.g., 'START_CO_DESIGN'
        conversationHistory: data.conversationHistory,
        // ... other context
      }
    })
  })
}
```

## Known Issues & Quirks

### Next.js Cache Issues

When making structural changes to components (especially TypeScript interfaces), the Next.js cache can cause "Unexpected token" errors even when syntax is correct. Solution:

```bash
rm -rf .next && npm run dev
```

### Field Name Changes in Firestore

When renaming fields in the data model (e.g., `shortlistedIdeas` → `selectedSolutions`), must update:
1. TypeScript interfaces
2. All references in component code
3. Firestore update paths
4. Step completion checks in journey/page.tsx

Old data in Firestore may not migrate automatically.

## AI Model Configuration

- **Model:** `gpt-4o-mini` (specified in each PromptTemplate)
- **Temperature:** Varies by prompt (0.7-0.8 for generative, lower for review)
- **Max Tokens:** 300-400 (keeps responses concise)
- **Cost:** ~$0.15/1M input tokens, ~$0.60/1M output tokens

## Brand Design System

- **Background:** `#162237` (dark navy)
- **Accent (orange):** `#f15f24` (buttons, highlights)
- **Secondary (teal):** `#86dabd` (secondary elements, glows)
- **Glassmorphic panels:** `rgba(255, 255, 255, 0.05)` background with `backdrop-filter: blur(10px)`
- **Text colors:**
  - Primary: `rgba(255, 255, 255, 0.9)`
  - Muted: `rgba(255, 255, 255, 0.7)`
  - Heading: `#ffffff`
