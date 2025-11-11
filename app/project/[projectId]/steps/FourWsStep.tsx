'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { subscribeToProject, updateProject, ensureAuth } from '../../../../firebase'
import { useDebounce } from '../../../hooks/useDebounce'

type ZoneId = 'what' | 'who' | 'where' | 'why'

interface ProblemStatement {
  what: {
    answer: string
    hasCheckedFeedback?: boolean
  }
  who: {
    answer: string
    hasCheckedFeedback?: boolean
  }
  where: {
    answer: string
    hasCheckedFeedback?: boolean
  }
  why: {
    answer: string
    hasCheckedFeedback?: boolean
  }
}

interface ProjectData {
  id: string
  chosenProblem: string | null
  problemStatement?: ProblemStatement
  updatedAt: any
}

interface ZoneFeedback {
  loading: boolean
  feedback: string[]
  followUpQuestion: string | null
}

interface FourWsStepProps {
  projectId?: string
  project?: any
  onZoneFocusChange?: (isFocused: boolean) => void
}

const CARD_CONFIG = {
  what: {
    title: 'WHAT',
    question: 'What is the problem? (detail, evidence, examples)',
    placeholder: 'Describe what the problem is in detail...',
    color: 'rgba(241, 95, 36, 0.2)',
    position: 'top-left' as const,
  },
  who: {
    title: 'WHO',
    question: 'Who is affected? (groups, communities, individuals)',
    placeholder: 'Describe who is affected by this problem...',
    color: 'rgba(17, 138, 178, 0.2)',
    position: 'top-right' as const,
  },
  where: {
    title: 'WHERE',
    question: 'Where does it occur? (places, settings, contexts)',
    placeholder: 'Describe where this problem occurs...',
    color: 'rgba(119, 158, 203, 0.2)',
    position: 'bottom-left' as const,
  },
  why: {
    title: 'WHY',
    question: 'Why does it matter? (impact, urgency)',
    placeholder: 'Explain why this problem matters...',
    color: 'rgba(68, 1, 84, 0.2)',
    position: 'bottom-right' as const,
  },
}

const EMPTY_STATEMENT: ProblemStatement = {
  what: { answer: '', hasCheckedFeedback: false },
  who: { answer: '', hasCheckedFeedback: false },
  where: { answer: '', hasCheckedFeedback: false },
  why: { answer: '', hasCheckedFeedback: false },
}

export default function FourWsStep({ projectId: propProjectId, project: propProject, onZoneFocusChange }: FourWsStepProps) {
  // Use params if props not provided (for standalone use)
  const params = propProjectId ? { projectId: propProjectId } : { projectId: '' }
  const actualProjectId = propProjectId || params.projectId

  // Project data
  const [project, setProject] = useState<ProjectData | null>(propProject || null)
  const [loading, setLoading] = useState(!propProject)

  // Zone state
  const [focusedZoneId, setFocusedZoneId] = useState<ZoneId | null>(null)
  const [problemStatement, setProblemStatement] = useState<ProblemStatement>(EMPTY_STATEMENT)

  // Feedback state (per zone)
  const [feedback, setFeedback] = useState<Record<ZoneId, ZoneFeedback>>({
    what: { loading: false, feedback: [], followUpQuestion: null },
    who: { loading: false, feedback: [], followUpQuestion: null },
    where: { loading: false, feedback: [], followUpQuestion: null },
    why: { loading: false, feedback: [], followUpQuestion: null },
  })

  // Refs
  const hasInitialized = useRef(false)
  const [isMounted, setIsMounted] = useState(false)

  // Debounced for auto-saving
  const debouncedStatement = useDebounce(problemStatement, 800)

  // Track mounted state for portal
  useEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [])

  // Firebase subscription (only if not using props)
  useEffect(() => {
    if (propProject) return // Skip if using props from parent

    let unsubscribe: (() => void) | undefined

    const init = async () => {
      try {
        await ensureAuth()

        unsubscribe = subscribeToProject(actualProjectId, (data) => {
          if (!data) {
            setProject(null)
            setLoading(false)
            return
          }

          setProject(data as ProjectData)

          // Initialize statement data on first load
          if (!hasInitialized.current) {
            hasInitialized.current = true
            const statement = data.problemStatement || EMPTY_STATEMENT
            setProblemStatement(statement)
          }

          setLoading(false)
        })
      } catch (error) {
        console.error('Error initializing project:', error)
        setLoading(false)
      }
    }

    init()

    return () => {
      if (unsubscribe) unsubscribe()
      hasInitialized.current = false
    }
  }, [actualProjectId, propProject])

  // Initialize from props if provided
  useEffect(() => {
    if (propProject && !hasInitialized.current) {
      hasInitialized.current = true
      const statement = propProject.problemStatement || EMPTY_STATEMENT
      setProblemStatement(statement)
      setProject(propProject)
      setLoading(false)
    }
  }, [propProject])

  // Auto-save to Firestore
  useEffect(() => {
    if (!hasInitialized.current) return

    const saveToFirestore = async () => {
      try {
        await updateProject(actualProjectId, {
          problemStatement: debouncedStatement,
        })
      } catch (error) {
        console.error('Error saving problem statement:', error)
      }
    }

    saveToFirestore()
  }, [debouncedStatement, actualProjectId])

  // Handle zone focus change
  useEffect(() => {
    if (onZoneFocusChange) {
      onZoneFocusChange(focusedZoneId !== null)
    }
  }, [focusedZoneId, onZoneFocusChange])

  // ESC key to close card
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && focusedZoneId) {
        closeCard()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [focusedZoneId])

  const handleUpdate = (zoneId: ZoneId, value: string) => {
    setProblemStatement(prev => ({
      ...prev,
      [zoneId]: {
        ...prev[zoneId],
        answer: value,
      },
    }))
  }

  const checkThinking = async (zoneId: ZoneId) => {
    setFeedback(prev => ({
      ...prev,
      [zoneId]: { ...prev[zoneId], loading: true },
    }))

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: actualProjectId,
          stepId: 'four-ws',
          zoneId,
          action: 'review',
          data: {
            answer: problemStatement[zoneId].answer,
          },
        }),
      })

      const result = await response.json()

      setFeedback(prev => ({
        ...prev,
        [zoneId]: {
          loading: false,
          feedback: result.feedback || [],
          followUpQuestion: result.followUpQuestion || null,
        },
      }))

      // Mark this zone as having checked feedback
      setProblemStatement(prev => ({
        ...prev,
        [zoneId]: {
          ...prev[zoneId],
          hasCheckedFeedback: true,
        },
      }))

      // Save immediately to Firestore
      await updateProject(actualProjectId, {
        [`problemStatement.${zoneId}.hasCheckedFeedback`]: true,
      })
    } catch (error) {
      console.error('Error getting feedback:', error)
      setFeedback(prev => ({
        ...prev,
        [zoneId]: {
          loading: false,
          feedback: ['Error getting feedback. Please try again.'],
          followUpQuestion: null,
        },
      }))
    }
  }

  const openCard = (zoneId: ZoneId) => {
    setFocusedZoneId(zoneId)
  }

  const closeCard = () => {
    setFocusedZoneId(null)
  }

  const positionStyles = {
    'top-left': { top: '20vh', left: '15vw' },
    'top-right': { top: '20vh', right: '15vw' },
    'bottom-left': { bottom: '20vh', left: '15vw' },
    'bottom-right': { bottom: '20vh', right: '15vw' },
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-background)',
      }}>
        <div className="spinner" />
      </div>
    )
  }

  if (!project?.chosenProblem) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-background)',
      }}>
        <p>No problem selected. Please complete the previous step.</p>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* Central Problem Card */}
      <div
        className="glass-panel"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          padding: '2rem',
          maxWidth: '500px',
          textAlign: 'center',
          opacity: focusedZoneId ? 0.3 : 1,
          transition: 'opacity 0.3s ease-in-out',
        }}
      >
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--color-secondary)' }}>
          Problem Statement
        </h2>
        <p style={{ fontSize: '1.1rem', lineHeight: 1.6 }}>{project.chosenProblem}</p>
      </div>

      {/* Four W Cards - Corner Previews */}
      {Object.entries(CARD_CONFIG).map(([key, config]) => {
        const zoneId = key as ZoneId
        const zoneData = problemStatement[zoneId]
        const value = zoneData?.answer || ''
        const hasContent = value.length > 0
        const isComplete = value.length >= 10 && zoneData?.hasCheckedFeedback === true

        return (
          <div
            key={key}
            className="glass-panel zone-card"
            style={{
              position: 'absolute',
              ...positionStyles[config.position],
              width: '280px',
              padding: '1.5rem',
              cursor: 'pointer',
              opacity: focusedZoneId && focusedZoneId !== key ? 0.3 : 1,
              transition: 'all 0.3s ease-in-out',
              borderLeft: `4px solid ${config.color.replace('0.2', '1')}`,
            }}
            onClick={() => openCard(zoneId)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>{config.title}</h3>
              {isComplete && <span style={{ color: 'var(--color-tertiary)', fontSize: '1.2rem' }}>✓</span>}
            </div>
            <p style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '0.75rem' }}>{config.question}</p>
            <p style={{
              fontSize: '0.85rem',
              opacity: hasContent ? 0.9 : 0.5,
              fontStyle: hasContent ? 'normal' : 'italic',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
            }}>
              {hasContent ? value : 'Click to add...'}
            </p>
          </div>
        )
      })}

      {/* Fullscreen Card Modal - Using Portal */}
      {isMounted && focusedZoneId && createPortal(
        <div
          onClick={closeCard}
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            animation: 'fadeIn 0.3s ease-in-out',
          }}
        >
          <div
            className="glass-panel"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '90vw',
              maxWidth: '1200px',
              maxHeight: '85vh',
              display: 'flex',
              gap: '2rem',
              padding: '0',
              overflowY: 'hidden',
              animation: 'slideUp 0.3s ease-in-out',
              borderLeft: `6px solid ${CARD_CONFIG[focusedZoneId].color.replace('0.2', '1')}`,
            }}
          >
            {/* Left Side - Input Area */}
            <div style={{
              flex: '1 1 60%',
              padding: '3rem',
              overflowY: 'auto',
            }}>
              <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--color-secondary)' }}>
                {CARD_CONFIG[focusedZoneId].title}
              </h2>
              <p style={{ fontSize: '1.1rem', marginBottom: '2rem', opacity: 0.9 }}>
                {CARD_CONFIG[focusedZoneId].question}
              </p>

              <textarea
                value={problemStatement[focusedZoneId]?.answer || ''}
                onChange={(e) => handleUpdate(focusedZoneId, e.target.value)}
                placeholder={CARD_CONFIG[focusedZoneId].placeholder}
                className="input-glass"
                rows={10}
                style={{ width: '100%', resize: 'vertical', minHeight: '200px', fontFamily: 'inherit' }}
              />

              <button
                onClick={closeCard}
                className="btn btn-secondary"
                style={{ marginTop: '1.5rem', width: '100%' }}
              >
                Close (ESC)
              </button>
            </div>

            {/* Right Side - Feedback Panel */}
            <div style={{
              flex: '1 1 40%',
              padding: '3rem',
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              overflowY: 'auto',
              borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
            }}>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem', color: 'var(--color-secondary)' }}>
                AI Feedback
              </h3>

              {feedback[focusedZoneId].feedback.length === 0 && !feedback[focusedZoneId].loading && (
                <p style={{ opacity: 0.6, marginBottom: '1.5rem', fontStyle: 'italic' }}>
                  Click "Check my thinking" below to get feedback on your response.
                </p>
              )}

              {feedback[focusedZoneId].loading && (
                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <div className="spinner" />
                  <p style={{ marginTop: '1rem', opacity: 0.7 }}>Getting feedback...</p>
                </div>
              )}

              {!feedback[focusedZoneId].loading && feedback[focusedZoneId].feedback.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  {feedback[focusedZoneId].feedback.map((point, idx) => (
                    <p key={idx} style={{ marginBottom: '1rem', lineHeight: 1.6 }}>
                      {point}
                    </p>
                  ))}
                  {feedback[focusedZoneId].followUpQuestion && (
                    <p style={{ marginTop: '1.5rem', fontStyle: 'italic', opacity: 0.9, paddingLeft: '1rem', borderLeft: '3px solid var(--color-secondary)' }}>
                      💭 {feedback[focusedZoneId].followUpQuestion}
                    </p>
                  )}
                </div>
              )}

              <button
                onClick={() => checkThinking(focusedZoneId)}
                disabled={feedback[focusedZoneId].loading || !problemStatement[focusedZoneId]?.answer.trim()}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  opacity: feedback[focusedZoneId].loading || !problemStatement[focusedZoneId]?.answer.trim() ? 0.5 : 1,
                }}
              >
                {feedback[focusedZoneId].loading ? 'Checking...' : 'Check my thinking'}
              </button>
            </div>

            {/* Animations - Inline styles within portal */}
            <style>{`
              @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
              }
              @keyframes slideUp {
                from {
                  opacity: 0;
                  transform: translateY(20px);
                }
                to {
                  opacity: 1;
                  transform: translateY(0);
                }
              }
            `}</style>
          </div>
        </div>,
        document.body
      )}

    </div>
  )
}
