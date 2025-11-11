'use client'

import { useState, useEffect, useRef } from 'react'
import { subscribeToProject, updateProject } from '../../../../firebase'

// ========================================
// TYPES
// ========================================

type StageId =
  | 'initial-reflection'
  | 'choosing-directions'
  | 'co-design'
  | 'variants'
  | 'selection'
  | 'next-panel'
  | 'completed'

interface Message {
  role: 'ai' | 'student'
  content: string
  timestamp: number
  stage?: StageId
}

interface ProposedSolution {
  title: string
  description: string
  whoItsFor: string
  howItWorks: string
  whyItMatters: string
}

interface CoFounderLabData {
  conversationHistory: Message[]
  currentStage: StageId
  selectedSolutions: string[] // 3 solution station IDs chosen by student
  proposedSolution?: ProposedSolution
  coDesignPhase?: string // Track which phase within co-design (for AI context)
  // Step 4: variants
  variantOptions?: string[]
  ideaBank?: string[]
  // Step 5: selection
  lockedVariant?: string
}

interface StepProps {
  projectId?: string
  project?: any
  onZoneFocusChange?: (isFocused: boolean) => void
}

const EMPTY_LAB_DATA: CoFounderLabData = {
  conversationHistory: [],
  currentStage: 'initial-reflection',
  selectedSolutions: [],
  coDesignPhase: 'choose-direction',
}

const STAGE_TITLES: Record<StageId, string> = {
  'initial-reflection': 'Step 1: AI Reflection',
  'choosing-directions': 'Step 2: Choose Your Top 3 Solutions',
  'co-design': 'Step 3: Co-Founder Lab',
  'variants': 'Step 4: Exciting Variants',
  'selection': 'Step 5: Lock Your Direction',
  'next-panel': 'Step 6: Next Step',
  'completed': 'Complete',
}

// ========================================
// MAIN COMPONENT
// ========================================

export default function CoFounderLabStep({ projectId, project: initialProject }: StepProps) {
  const [project, setProject] = useState<any>(initialProject || null)
  const [labData, setLabData] = useState<CoFounderLabData>(EMPTY_LAB_DATA)
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const [isAIThinking, setIsAIThinking] = useState(false)
  const [expandedStages, setExpandedStages] = useState<Set<StageId>>(new Set(['initial-reflection']))
  const [selectedSolutions, setSelectedSolutions] = useState<string[]>([])
  const [showResetWarning, setShowResetWarning] = useState(false)
  const hasInitialized = useRef(false)
  const hasAutoStarted = useRef(false)

  const actualProjectId = projectId || initialProject?.id

  // Solution station labels
  const SOLUTION_LABELS: Record<string, string> = {
    hiTech: 'Hi Tech',
    lowTech: 'Low Tech',
    perspectives: 'Different Perspectives',
    superpowers: 'Superpowers',
    bottomlessDollar: 'The Bottomless Dollar',
    leader: 'Leader of Your Country',
    friends: 'With a Little Help from My Friends',
    tinySeeds: 'From Tiny Seeds, Mighty Oaks Grow',
  }

  // Subscribe to project data
  useEffect(() => {
    if (!actualProjectId) return

    const unsubscribe = subscribeToProject(actualProjectId, (updatedProject) => {
      setProject(updatedProject)

      if (!hasInitialized.current && updatedProject) {
        const existing = updatedProject.coFounderLab
        if (existing) {
          setLabData(existing)
          // Expand current and previous stages
          const currentStage = existing.currentStage
          // Keep initial reflection visible alongside current stage
          setExpandedStages(new Set(['initial-reflection', currentStage]))
        }
        hasInitialized.current = true
      }
    })

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [actualProjectId])

  // Auto-start: Generate initial reflection when component mounts
  useEffect(() => {
    if (
      !hasAutoStarted.current &&
      hasInitialized.current &&
      labData.conversationHistory.length === 0 &&
      project?.solutionWheel &&
      !isAIThinking &&
      actualProjectId
    ) {
      hasAutoStarted.current = true
      generateInitialReflection()
    }
  }, [labData.conversationHistory.length, project, isAIThinking, actualProjectId])

  // Auto-generate variants when entering variants stage and none exist
  useEffect(() => {
    if (
      hasInitialized.current &&
      actualProjectId &&
      labData.currentStage === 'variants' &&
      (!labData.variantOptions || labData.variantOptions.length === 0) &&
      !isAIThinking
    ) {
      generateVariants(labData, 'AUTO_VARIANTS')
    }
  }, [labData.currentStage, labData.variantOptions?.length, isAIThinking, actualProjectId])

  // ========================================
  // AI INTERACTION
  // ========================================

  const generateInitialReflection = async () => {
    if (!actualProjectId || !project) {
      console.log('[CoFounder Lab] Cannot generate - missing project or ID')
      return
    }

    console.log('[CoFounder Lab] Generating initial reflection')
    console.log('[CoFounder Lab] Solution wheel data:', project.solutionWheel)

    setIsAIThinking(true)

    try {
      const payload = {
        projectId: actualProjectId,
        stepId: 'cofounder-lab',
        action: 'generate',
        data: {
          stage: 'initial-reflection',
          solutionWheel: project.solutionWheel,
        },
      }

      console.log('[CoFounder Lab] Sending payload:', payload)

      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      console.log('[CoFounder Lab] API response:', result)

      if (result.success && result.feedback) {
        const aiMessage: Message = {
          role: 'ai',
          content: result.feedback.join('\n\n'),
          timestamp: Date.now(),
          stage: 'initial-reflection',
        }

        const updated: CoFounderLabData = {
          ...labData,
          conversationHistory: [aiMessage],
          currentStage: 'choosing-directions',
        }

        setLabData(updated)
        await saveLabData(updated)
        // Keep reflection expanded, and open choosing-directions
        setExpandedStages(new Set(['initial-reflection', 'choosing-directions']))
      }
    } catch (error) {
      console.error('Failed to generate initial reflection:', error)
    } finally {
      setIsAIThinking(false)
    }
  }

  const sendMessage = async (studentMessage: string) => {
    if (!actualProjectId || !studentMessage.trim()) return

    setIsAIThinking(true)

    // Add student message to history
    const studentMsg: Message = {
      role: 'student',
      content: studentMessage.trim(),
      timestamp: Date.now(),
      stage: labData.currentStage,
    }

    const updatedHistory = [...labData.conversationHistory, studentMsg]

    try {
      // Call AI with context
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: actualProjectId,
          stepId: 'cofounder-lab',
          action: 'generate',
          data: {
            stage: labData.currentStage,
            selectedSolutions: labData.selectedSolutions || [],
            coDesignPhase: labData.coDesignPhase || 'choose-direction',
            conversationHistory: updatedHistory,
            studentMessage: studentMessage.trim(),
            solutionWheel: project?.solutionWheel || {},
          },
        }),
      })

      const result = await response.json()

      if (result.success && result.feedback) {
        const aiMessage: Message = {
          role: 'ai',
          content: result.feedback.join('\n\n'),
          timestamp: Date.now(),
          stage: labData.currentStage,
        }

        const updated = {
          ...labData,
          conversationHistory: [...updatedHistory, aiMessage],
        }

        setLabData(updated)
        await saveLabData(updated)
        setInputValue('')
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsAIThinking(false)
    }
  }

  // Generate AI response without student message (for auto-start)
  const generateAIResponse = async (data: CoFounderLabData, trigger: string) => {
    if (!actualProjectId) return

    setIsAIThinking(true)

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: actualProjectId,
          stepId: 'cofounder-lab',
          action: 'generate',
          data: {
            stage: data.currentStage,
            selectedSolutions: data.selectedSolutions || [],
            coDesignPhase: data.coDesignPhase || 'choose-direction',
            conversationHistory: data.conversationHistory,
            studentMessage: trigger,
            solutionWheel: project?.solutionWheel || {},
          },
        }),
      })

      const result = await response.json()

      if (result.success && result.feedback) {
        const aiMessage: Message = {
          role: 'ai',
          content: result.feedback.join('\n\n'),
          timestamp: Date.now(),
          stage: data.currentStage,
        }

        const updated = {
          ...data,
          conversationHistory: [...data.conversationHistory, aiMessage],
        }

        setLabData(updated)
        await saveLabData(updated)
      }
    } catch (error) {
      console.error('Failed to generate AI response:', error)
    } finally {
      setIsAIThinking(false)
    }
  }

  // Confirm direction → advance to Phase 3 (concrete variants)
  const handleConfirmDirection = async () => {
    if (!actualProjectId) return
    const updated: CoFounderLabData = {
      ...labData,
      coDesignPhase: 'concrete-variants',
      currentStage: 'variants',
      variantOptions: labData.variantOptions || [],
      ideaBank: labData.ideaBank || [],
    }
    setLabData(updated)
    await saveLabData(updated)
    setExpandedStages(new Set(['initial-reflection', 'variants']))
    await generateVariants(updated, 'CONFIRM_DIRECTION')
    setTimeout(() => variantsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
  }

  const proceedToSelection = async () => {
    if (!actualProjectId) return
    if ((labData.ideaBank || []).length < 3) return
    const updated: CoFounderLabData = {
      ...labData,
      currentStage: 'selection',
    }
    setLabData(updated)
    await saveLabData(updated)
    setExpandedStages(new Set(['initial-reflection', 'selection']))
    await generateSelectionAI(updated)
  }

  const generateSelectionAI = async (data: CoFounderLabData) => {
    if (!actualProjectId) return
    setIsAIThinking(true)
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: actualProjectId,
          stepId: 'cofounder-lab',
          action: 'generate',
          data: {
            stage: 'selection',
            conversationHistory: data.conversationHistory,
            ideaBank: data.ideaBank || [],
          },
        }),
      })
      const result = await response.json()
      if (result.success && result.feedback) {
        const aiMessage: Message = {
          role: 'ai',
          content: result.feedback.join('\n\n'),
          timestamp: Date.now(),
          stage: 'selection',
        }
        const next: CoFounderLabData = {
          ...data,
          conversationHistory: [...data.conversationHistory, aiMessage],
        }
        setLabData(next)
        await saveLabData(next)
      }
    } catch (e) {
      console.error('Failed to generate selection AI:', e)
    } finally {
      setIsAIThinking(false)
    }
  }

  // Provide comments/tweak → focus input for student message
  const handleTweakClick = () => {
    if (!isAIThinking) {
      if (!inputValue) setInputValue('Quick tweak: ')
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }

  // Generate/Regenerate variants (expects JSON array of 3 strings in generatedItems)
  const generateVariants = async (data: CoFounderLabData, trigger: string) => {
    if (!actualProjectId) return
    setIsAIThinking(true)
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: actualProjectId,
          stepId: 'cofounder-lab',
          action: 'generate',
          data: {
            stage: 'variants',
            selectedSolutions: data.selectedSolutions || [],
            coDesignPhase: 'concrete-variants',
            conversationHistory: data.conversationHistory,
            studentMessage: trigger,
            solutionWheel: project?.solutionWheel || {},
          },
        }),
      })

      const result = await response.json()
      if (result.success) {
        const options: string[] = Array.isArray(result.generatedItems) ? result.generatedItems : []
        const updated: CoFounderLabData = {
          ...data,
          variantOptions: options,
        }
        setLabData(updated)
        await saveLabData(updated)
      }
    } catch (error) {
      console.error('Failed to generate variants:', error)
    } finally {
      setIsAIThinking(false)
    }
  }

  // Helper to mark step as complete with final solution
  const markComplete = async (proposedSolution: ProposedSolution) => {
    const updated: CoFounderLabData = {
      ...labData,
      proposedSolution,
      currentStage: 'completed',
    }

    setLabData(updated)
    await saveLabData(updated)
  }

  const saveLabData = async (data: CoFounderLabData) => {
    if (!actualProjectId) return
    try {
      await updateProject(actualProjectId, { coFounderLab: data })
    } catch (error) {
      console.error('Failed to save lab data:', error)
    }
  }

  // ========================================
  // RESET HANDLER
  // ========================================

  const handleReset = async () => {
    if (!actualProjectId) return

    try {
      // Clear all co-founder lab data
      setLabData(EMPTY_LAB_DATA)
      setSelectedSolutions([])
      setInputValue('')
      setExpandedStages(new Set(['initial-reflection']))

      // Reset refs
      hasAutoStarted.current = false

      // Clear from Firestore
      await updateProject(actualProjectId, { coFounderLab: null })

      // Close warning
      setShowResetWarning(false)

      // Auto-start will trigger again due to empty conversation history
      console.log('[CoFounder Lab] Reset complete, will auto-start')
    } catch (error) {
      console.error('Failed to reset Co-Founder Lab:', error)
    }
  }

  // ========================================
  // SOLUTION SELECTION HANDLERS
  // ========================================

  const toggleSolutionSelection = (stationId: string) => {
    setSelectedSolutions((prev) => {
      if (prev.includes(stationId)) {
        // Deselect
        return prev.filter((id) => id !== stationId)
      } else {
        // Select (max 3)
        if (prev.length >= 3) return prev
        return [...prev, stationId]
      }
    })
  }

  const submitSelectedSolutions = async () => {
    if (selectedSolutions.length === 0) return

    // Save selected solutions and move to co-design stage
    const updated: CoFounderLabData = {
      ...labData,
      selectedSolutions,
      currentStage: 'co-design',
      coDesignPhase: 'choose-direction',
    }

    setLabData(updated)
    await saveLabData(updated)
    // Keep reflection visible and open co-design
    setExpandedStages(new Set(['initial-reflection', 'co-design']))

    // Auto-trigger AI to start opinionated ranking
    await generateAIResponse(updated, 'START_CO_DESIGN')
  }

  // ========================================
  // UI HELPERS
  // ========================================

  const toggleStage = (stage: StageId) => {
    const newExpanded = new Set(expandedStages)
    if (newExpanded.has(stage)) {
      newExpanded.delete(stage)
    } else {
      newExpanded.add(stage)
    }
    setExpandedStages(newExpanded)
  }

  const getStageMessages = (stage: StageId): Message[] => {
    // Return messages relevant to this stage
    // This is simplified - could enhance with better stage tracking
    return labData.conversationHistory.filter((msg) => msg.stage === stage)
  }

  const isStageComplete = (stage: StageId): boolean => {
    const stages: StageId[] = ['initial-reflection', 'choosing-directions', 'co-design', 'variants', 'selection', 'next-panel', 'completed']
    const currentIndex = stages.indexOf(labData.currentStage)
    const stageIndex = stages.indexOf(stage)
    return stageIndex < currentIndex || labData.currentStage === 'completed'
  }

  const isStageActive = (stage: StageId): boolean => {
    return labData.currentStage === stage
  }

  // ========================================
  // RENDER
  // ========================================

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim() && !isAIThinking) {
      sendMessage(inputValue)
    }
  }

  const showSolutionPanel = isStageActive('choosing-directions')
  const variantsSectionRef = useRef<HTMLDivElement | null>(null)

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: '#162237',
        position: 'relative',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        padding: '2rem',
        gap: '2rem',
        overflowY: 'auto',
        isolation: 'isolate',
      }}
    >
      {/* Main Content */}
      <div
        style={{
          flex: '0 0 800px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: '800px',
          width: '800px',
          margin: '0 auto',
        }}
      >
        {/* Header */}
        <div style={{ width: '100%', marginBottom: '2rem', position: 'relative' }}>
          <h1
            style={{
              color: 'var(--color-text-heading)',
              fontSize: '2rem',
              fontWeight: 600,
              textAlign: 'center',
              marginBottom: '0.5rem',
            }}
          >
            Co-Founder Lab
          </h1>
          <p
            style={{
              color: 'var(--color-text-primary)',
              fontSize: '1rem',
              textAlign: 'center',
              opacity: 0.8,
            }}
          >
            Let's refine your ideas into 2-3 strong candidate solutions
          </p>

          {/* Reset Button */}
          <button
            onClick={() => setShowResetWarning(true)}
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              padding: '0.5rem 1rem',
              background: 'rgba(241, 95, 36, 0.2)',
              border: '1px solid rgba(241, 95, 36, 0.5)',
              borderRadius: '0.5rem',
              color: 'var(--color-accent)',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(241, 95, 36, 0.3)'
              e.currentTarget.style.borderColor = 'var(--color-accent)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(241, 95, 36, 0.2)'
              e.currentTarget.style.borderColor = 'rgba(241, 95, 36, 0.5)'
            }}
          >
            Reset Co-Design
          </button>
        </div>

        {/* Stages Container */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Stage 1: Initial Reflection */}
        <StageSection
          stage="initial-reflection"
          title={STAGE_TITLES['initial-reflection']}
          isExpanded={expandedStages.has('initial-reflection')}
          isComplete={isStageComplete('initial-reflection')}
          isActive={isStageActive('initial-reflection')}
          onToggle={() => toggleStage('initial-reflection')}
        >
          {labData.conversationHistory
            .filter((msg) => msg.role === 'ai')
            .slice(0, 1)
            .map((msg, idx) => (
              <AIMessage key={idx} content={msg.content} />
            ))}

          {isAIThinking && labData.currentStage === 'initial-reflection' && (
            <div style={{ color: 'var(--color-text-primary)', opacity: 0.7, fontStyle: 'italic' }}>
              AI is reflecting on your ideas...
            </div>
          )}
        </StageSection>

        {/* Stage 2: Choosing Directions */}
        {labData.conversationHistory.length > 0 && (
          <StageSection
            stage="choosing-directions"
            title={STAGE_TITLES['choosing-directions']}
            isExpanded={expandedStages.has('choosing-directions')}
            isComplete={isStageComplete('choosing-directions')}
            isActive={isStageActive('choosing-directions')}
            onToggle={() => toggleStage('choosing-directions')}
          >
            <AIMessage content="Pick 1-3 ideas from your Solution Wheel that you're most excited about. Select them from the panel on the right." />

            {labData.selectedSolutions && labData.selectedSolutions.length > 0 && project?.solutionWheel && (
              <StudentMessage content={labData.selectedSolutions
                .map((id: string) => project.solutionWheel?.[id]?.idea || '')
                .filter(Boolean)
                .join('\n\n')} />
            )}

            {isStageActive('choosing-directions') && (
              <div style={{ marginTop: '1rem' }}>
                <p style={{ color: 'var(--color-text-primary)', marginBottom: '1rem' }}>
                  {selectedSolutions.length === 0
                    ? 'Select 1-3 solutions from the right panel →'
                    : `${selectedSolutions.length} solution${selectedSolutions.length > 1 ? 's' : ''} selected`}
                </p>
                <button
                  onClick={submitSelectedSolutions}
                  disabled={isAIThinking || selectedSolutions.length === 0}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background:
                      isAIThinking || selectedSolutions.length === 0 ? 'rgba(255, 255, 255, 0.1)' : 'var(--color-accent)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    fontWeight: 600,
                    cursor: isAIThinking || selectedSolutions.length === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isAIThinking ? 'Processing...' : 'Continue with Selected Ideas'}
                </button>
              </div>
            )}
          </StageSection>
        )}

        {/* Stage 3: Co-Design */}
        {labData.selectedSolutions.length > 0 && (
          <StageSection
            stage="co-design"
            title={STAGE_TITLES['co-design']}
            isExpanded={expandedStages.has('co-design')}
            isComplete={isStageComplete('co-design')}
            isActive={isStageActive('co-design')}
            onToggle={() => toggleStage('co-design')}
          >
            {/* Show co-design conversation */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              {getStageMessages('co-design')
                .filter(msg => msg.role === 'ai' || msg.role === 'student')
                .map((msg, idx) => (
                  <div key={idx}>
                    {msg.role === 'ai' ? (
                      <AIMessage content={msg.content} />
                    ) : (
                      <StudentMessage content={msg.content} />
                    )}
                  </div>
                ))}
            </div>

            {/* Choice buttons for direction confirmation during choose-direction phase */}
            {isStageActive('co-design') &&
              !labData.proposedSolution &&
              (labData.coDesignPhase === 'choose-direction') && (
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                  <button
                    onClick={handleConfirmDirection}
                    disabled={isAIThinking}
                    style={{
                      padding: '0.6rem 1rem',
                      background: 'var(--color-secondary)',
                      border: 'none',
                      borderRadius: '0.5rem',
                      color: 'var(--color-background)',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      cursor: isAIThinking ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Confirm direction
                  </button>
                  <button
                    onClick={handleTweakClick}
                    disabled={isAIThinking}
                    style={{
                      padding: '0.6rem 1rem',
                      background: 'transparent',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '0.5rem',
                      color: 'var(--color-text-primary)',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      cursor: isAIThinking ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Comment or tweak
                  </button>
                </div>
              )}

            {isStageActive('co-design') && !labData.proposedSolution && (
              <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  ref={inputRef}
                  placeholder="Your response to the co-founder..."
                  disabled={isAIThinking}
                  style={{
                    width: '100%',
                    minHeight: '100px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '0.5rem',
                    padding: '0.75rem',
                    color: 'var(--color-text-primary)',
                    fontSize: '1rem',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
                <button
                  type="submit"
                  disabled={isAIThinking || !inputValue.trim()}
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.75rem 1.5rem',
                    background: isAIThinking || !inputValue.trim() ? 'rgba(255, 255, 255, 0.1)' : 'var(--color-accent)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    fontWeight: 600,
                    cursor: isAIThinking || !inputValue.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isAIThinking ? 'Thinking...' : 'Send'}
                </button>
              </form>
            )}

            {labData.proposedSolution && (
              <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '1rem', border: '2px solid var(--color-secondary)' }}>
                <div style={{ marginBottom: '0.75rem', color: 'var(--color-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>
                  ✓ Final Solution Locked In
                </div>
                <h3 style={{ color: 'var(--color-text-heading)', fontSize: '1.25rem', marginBottom: '0.75rem' }}>
                  {labData.proposedSolution.title}
                </h3>
                <div style={{ color: 'var(--color-text-primary)', lineHeight: '1.6' }}>
                  <p style={{ marginBottom: '0.5rem' }}><strong>What:</strong> {labData.proposedSolution.description}</p>
                  <p style={{ marginBottom: '0.5rem' }}><strong>Who it's for:</strong> {labData.proposedSolution.whoItsFor}</p>
                  <p style={{ marginBottom: '0.5rem' }}><strong>How it works:</strong> {labData.proposedSolution.howItWorks}</p>
                  <p><strong>Why it matters:</strong> {labData.proposedSolution.whyItMatters}</p>
                </div>
              </div>
            )}
          </StageSection>
        )}

        {/* Stage 4: Exciting Variants */}
        {(
          labData.currentStage === 'variants' || (labData.variantOptions && labData.variantOptions.length > 0)
        ) && (
          <div ref={variantsSectionRef}>
          <StageSection
            stage="variants"
            title={STAGE_TITLES['variants']}
            isExpanded={expandedStages.has('variants')}
            isComplete={isStageComplete('variants')}
            isActive={isStageActive('variants')}
            onToggle={() => toggleStage('variants')}
          >
            {/* Full-width AI co-founder instruction */}
            <AIMessage content={'Make your direction exciting and stand out. Pick variants you like (aim for 3 total). You can regenerate for different angles or add your own idea.'} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1rem', alignItems: 'start' }}>
              {/* Left column: cards, controls, add-your-own */}
              <div>
                {/* Variant cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
                  {(labData.variantOptions || []).map((variant, idx) => {
                    const inBank = (labData.ideaBank || []).includes(variant)
                    const maxed = (labData.ideaBank || []).length >= 3
                    return (
                      <div key={idx} className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ color: 'var(--color-text-primary)', whiteSpace: 'pre-wrap' }}>{variant}</div>
                    <button
                      onClick={async () => {
                        if (inBank || maxed) return
                        const updated: CoFounderLabData = {
                          ...labData,
                          ideaBank: [...(labData.ideaBank || []), variant],
                        }
                        setLabData(updated)
                        await saveLabData(updated)
                      }}
                      disabled={inBank || maxed}
                      style={{
                        padding: '0.5rem 0.75rem',
                        background: inBank ? 'rgba(134, 218, 189, 0.2)' : 'var(--color-secondary)',
                        color: 'var(--color-background)',
                        border: 'none',
                        borderRadius: '0.5rem',
                        fontWeight: 600,
                        cursor: inBank || maxed ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {inBank ? 'Added' : 'Like'}
                    </button>
                  </div>
                )
              })}
                </div>

                {/* Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
                  <button
                    onClick={() => generateVariants(labData, 'REGENERATE_VARIANTS')}
                    disabled={isAIThinking}
                    style={{
                      padding: '0.6rem 1rem',
                      background: 'transparent',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '0.5rem',
                      color: 'var(--color-text-primary)',
                      fontWeight: 600,
                      cursor: isAIThinking ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Regenerate 3 different
                  </button>

                </div>

                {/* Add your own idea */}
                <div style={{ marginTop: '1rem' }}>
                  <p style={{ color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>Or add your own idea:</p>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault()
                      const val = inputValue.trim()
                      if (!val) return
                      if ((labData.ideaBank || []).length >= 3) return
                      if ((labData.ideaBank || []).includes(val)) return
                      const updated: CoFounderLabData = {
                        ...labData,
                        ideaBank: [...(labData.ideaBank || []), val],
                      }
                      setLabData(updated)
                      await saveLabData(updated)
                      setInputValue('')
                    }}
                  >
                    <textarea
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="Write your variant idea..."
                      disabled={isAIThinking}
                      style={{
                        width: '100%',
                        minHeight: '72px',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--glass-border)',
                        background: 'transparent',
                        color: 'var(--color-text-primary)',
                      }}
                    />
                    <div style={{ marginTop: '0.5rem' }}>
                      <button
                        type="submit"
                        disabled={isAIThinking || (labData.ideaBank || []).length >= 3}
                        style={{
                          padding: '0.6rem 1rem',
                          background: 'var(--color-accent)',
                          border: 'none',
                          borderRadius: '0.5rem',
                          color: 'white',
                          fontWeight: 600,
                          cursor: isAIThinking ? 'not-allowed' : 'pointer',
                        }}
                      >
                        Add to selections
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Right column: Selected Variants */}
              <div className="glass-panel" style={{ padding: '1rem', position: 'sticky', top: '1rem' }}>
                <h3 style={{ color: 'var(--color-text-heading)', fontSize: '1.1rem', marginBottom: '0.5rem' }}>Your Selected Variants</h3>
                <p style={{ color: 'var(--color-text-primary)', fontSize: '0.9rem', opacity: 0.8, marginBottom: '0.75rem' }}>
                  Aim for 3. Remove if you change your mind.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {(labData.ideaBank || []).map((item, idx) => (
                    <div key={idx} className="glass-panel" style={{ padding: '0.75rem' }}>
                      <div style={{ color: 'var(--color-text-primary)', whiteSpace: 'pre-wrap', marginBottom: '0.5rem' }}>{item}</div>
                      <button
                        onClick={async () => {
                          const updated = (labData.ideaBank || []).filter((v) => v !== item)
                          const next: CoFounderLabData = { ...labData, ideaBank: updated }
                          setLabData(next)
                          await saveLabData(next)
                        }}
                        style={{
                          padding: '0.4rem 0.75rem',
                          background: 'transparent',
                          border: '1px solid var(--glass-border)',
                          borderRadius: '0.5rem',
                          color: 'var(--color-text-primary)',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.75rem' }}>
                  <div style={{ color: 'var(--color-text-primary)' }}>Selected: {(labData.ideaBank || []).length} / 3</div>
                  <button
                    disabled={(labData.ideaBank || []).length < 3 || isAIThinking}
                    onClick={proceedToSelection}
                    style={{
                      padding: '0.5rem 0.9rem',
                      background: (labData.ideaBank || []).length >= 3 && !isAIThinking ? 'var(--color-accent)' : 'rgba(255,255,255,0.1)',
                      border: 'none',
                      borderRadius: '0.5rem',
                      color: 'white',
                      fontWeight: 600,
                      cursor: (labData.ideaBank || []).length >= 3 && !isAIThinking ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Continue
                  </button>
                </div>
              </div>
            </div>
          </StageSection>
          </div>
        )}

        {/* Stage 5: Lock Your Direction */}
        {labData.currentStage === 'selection' && (
          <StageSection
            stage="selection"
            title={STAGE_TITLES['selection']}
            isExpanded={expandedStages.has('selection')}
            isComplete={isStageComplete('selection')}
            isActive={isStageActive('selection')}
            onToggle={() => toggleStage('selection')}
          >
            {/* AI presents the three variants */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
              {getStageMessages('selection').map((msg, idx) => (
                msg.role === 'ai' ? <AIMessage key={idx} content={msg.content} /> : <StudentMessage key={idx} content={msg.content} />
              ))}
            </div>

            {/* User selects one to lock in */}
            <VariantSelector
              options={labData.ideaBank || []}
              disabled={isAIThinking}
              onLock={async (choice) => {
                const proposed = {
                  title: 'Chosen Direction',
                  description: choice,
                  whoItsFor: '',
                  howItWorks: '',
                  whyItMatters: '',
                }
                const next: CoFounderLabData = { ...labData, lockedVariant: choice, proposedSolution: proposed, currentStage: 'completed' }
                setLabData(next)
                await saveLabData(next)
                // Advance journey to decision-tree step
                if (actualProjectId) {
                  await updateProject(actualProjectId, {
                    currentStepId: 'decision-tree',
                    // Initialize decision tree state with no preselected answers
                    decision: {
                      possible: {},
                      planetImpact: {},
                      impact: {},
                      originality: {},
                    },
                  })
                }
                setExpandedStages(new Set(['selection']))
              }}
            />
          </StageSection>
        )}

        {/* Step 6 placeholder removed; journey now advances to decision-tree */}
        </div>

        {/* Progress Indicator */}
        <div style={{ marginTop: '2rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
          {(['initial-reflection', 'choosing-directions', 'co-design', 'variants', 'completed'] as StageId[]).map((stage, idx) => (
            <div
              key={stage}
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: isStageComplete(stage) || isStageActive(stage) ? 'var(--color-secondary)' : 'rgba(255, 255, 255, 0.2)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Right Panel: Solution Selection */}
      {showSolutionPanel && project?.solutionWheel && (
        <div
          className="glass-panel"
          style={{
            width: '400px',
            padding: '1.5rem',
            overflowY: 'auto',
            maxHeight: '100%',
          }}
        >
          <h2
            style={{
              color: 'var(--color-text-heading)',
              fontSize: '1.5rem',
              fontWeight: 600,
              marginBottom: '0.5rem',
            }}
          >
            Your Solutions
          </h2>
          <p
            style={{
              color: 'var(--color-text-primary)',
              fontSize: '0.9rem',
              marginBottom: '1.5rem',
              opacity: 0.8,
            }}
          >
            Select 1-3 ideas you want to explore
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {Object.keys(SOLUTION_LABELS).map((stationId) => {
              const idea = project.solutionWheel[stationId]?.idea || ''
              const isSelected = selectedSolutions.includes(stationId)
              const isDisabled = !isSelected && selectedSolutions.length >= 3

              return (
                <div
                  key={stationId}
                  onClick={() => !isDisabled && toggleSolutionSelection(stationId)}
                  style={{
                    background: isSelected ? 'rgba(134, 218, 189, 0.2)' : 'rgba(0, 0, 0, 0.3)',
                    border: isSelected ? '2px solid var(--color-secondary)' : '1px solid var(--glass-border)',
                    borderRadius: '0.75rem',
                    padding: '1rem',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    opacity: isDisabled ? 0.5 : 1,
                    transition: 'all 0.2s ease',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    if (!isDisabled) {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = ''
                    e.currentTarget.style.boxShadow = ''
                  }}
                >
                  {isSelected && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '0.75rem',
                        right: '0.75rem',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: 'var(--color-secondary)',
                        color: 'var(--color-background)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                      }}
                    >
                      ✓
                    </div>
                  )}
                  <h3
                    style={{
                      color: 'var(--color-text-heading)',
                      fontSize: '1rem',
                      fontWeight: 600,
                      marginBottom: '0.5rem',
                    }}
                  >
                    {SOLUTION_LABELS[stationId]}
                  </h3>
                  <p
                    style={{
                      color: 'var(--color-text-primary)',
                      fontSize: '0.85rem',
                      lineHeight: '1.4',
                    }}
                  >
                    {idea.length > 120 ? idea.substring(0, 120) + '...' : idea}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Reset Warning Modal */}
      {showResetWarning && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(22, 34, 55, 0.95)',
            backdropFilter: 'blur(12px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeIn 0.3s ease-out',
          }}
          onClick={() => setShowResetWarning(false)}
        >
          <div
            className="glass-panel"
            style={{
              maxWidth: '500px',
              padding: '2rem',
              animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              style={{
                color: 'var(--color-text-heading)',
                fontSize: '1.5rem',
                fontWeight: 600,
                marginBottom: '1rem',
              }}
            >
              Reset Co-Founder Lab?
            </h2>
            <p
              style={{
                color: 'var(--color-text-primary)',
                fontSize: '1rem',
                lineHeight: '1.6',
                marginBottom: '2rem',
              }}
            >
              This will <strong style={{ color: 'var(--color-accent)' }}>delete all your progress</strong> in the
              Co-Founder Lab, including:
            </p>
            <ul
              style={{
                color: 'var(--color-text-primary)',
                fontSize: '0.95rem',
                lineHeight: '1.8',
                marginBottom: '2rem',
                marginLeft: '1.5rem',
              }}
            >
              <li>AI conversation history</li>
              <li>Selected solution ideas</li>
              <li>Refined solutions and feedback</li>
              <li>Your proposed solution choice</li>
            </ul>
            <p
              style={{
                color: 'var(--color-text-primary)',
                fontSize: '0.95rem',
                marginBottom: '2rem',
              }}
            >
              The AI will start fresh and re-analyze your Solution Wheel ideas.
            </p>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowResetWarning(false)}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '0.5rem',
                  color: 'var(--color-text-primary)',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'var(--color-accent)',
                  border: 'none',
                  borderRadius: '0.5rem',
                  color: 'white',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Reset & Start Over
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ========================================
// SUB-COMPONENTS
// ========================================

interface StageSectionProps {
  stage: StageId
  title: string
  isExpanded: boolean
  isComplete: boolean
  isActive: boolean
  onToggle: () => void
  children: React.ReactNode
}

function StageSection({ title, isExpanded, isComplete, isActive, onToggle, children }: StageSectionProps) {
  return (
    <div
      className="glass-panel"
      style={{
        padding: '1.5rem',
        border: isActive ? '2px solid var(--color-accent)' : '1px solid var(--glass-border)',
      }}
    >
      <div
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          marginBottom: isExpanded ? '1rem' : 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {isComplete && (
            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: 'var(--color-secondary)',
                color: 'var(--color-background)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
              }}
            >
              ✓
            </div>
          )}
          <h2 style={{ color: 'var(--color-text-heading)', fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
            {title}
          </h2>
        </div>
        <span style={{ color: 'var(--color-text-primary)', fontSize: '1.25rem' }}>{isExpanded ? '▼' : '▶'}</span>
      </div>

      {isExpanded && <div>{children}</div>}
    </div>
  )
}

function AIMessage({ content }: { content: string }) {
  return (
    <div
      style={{
        background: 'rgba(134, 218, 189, 0.1)',
        border: '1px solid rgba(134, 218, 189, 0.3)',
        borderRadius: '0.75rem',
        padding: '1rem',
        marginBottom: '1rem',
      }}
    >
      <div style={{ color: 'var(--color-secondary)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
        AI Co-Founder
      </div>
      <div style={{ color: 'var(--color-text-primary)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{content}</div>
    </div>
  )
}

function StudentMessage({ content }: { content: string }) {
  return (
    <div
      style={{
        background: 'rgba(241, 95, 36, 0.1)',
        border: '1px solid rgba(241, 95, 36, 0.3)',
        borderRadius: '0.75rem',
        padding: '1rem',
        marginBottom: '1rem',
        marginLeft: 'auto',
        maxWidth: '80%',
      }}
    >
      <div style={{ color: 'var(--color-accent)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
        You
      </div>
      <div style={{ color: 'var(--color-text-primary)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{content}</div>
    </div>
  )
}

// Variant selector subcomponent
function VariantSelector({ options, disabled, onLock }: { options: string[]; disabled?: boolean; onLock: (choice: string) => void }) {
  const [choice, setChoice] = useState<string>('')
  return (
    <div className="glass-panel" style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {options.map((opt, idx) => (
          <label key={idx} className="glass-panel" style={{ display: 'flex', gap: '0.75rem', padding: '0.75rem', alignItems: 'flex-start', cursor: disabled ? 'not-allowed' : 'pointer' }}>
            <input
              type="radio"
              name="variant-choice"
              disabled={disabled}
              checked={choice === opt}
              onChange={() => setChoice(opt)}
              style={{ marginTop: '0.3rem' }}
            />
            <span style={{ color: 'var(--color-text-primary)', whiteSpace: 'pre-wrap' }}>{opt}</span>
          </label>
        ))}
      </div>
      <div style={{ marginTop: '0.75rem' }}>
        <button
          onClick={() => choice && onLock(choice)}
          disabled={!choice || disabled}
          style={{
            padding: '0.6rem 1rem',
            background: !choice || disabled ? 'rgba(255, 255, 255, 0.1)' : 'var(--color-accent)',
            border: 'none',
            borderRadius: '0.5rem',
            color: 'white',
            fontWeight: 600,
            cursor: !choice || disabled ? 'not-allowed' : 'pointer',
          }}
        >
          Lock this in
        </button>
      </div>
    </div>
  )
}
