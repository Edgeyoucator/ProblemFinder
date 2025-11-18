'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { subscribeToProject, updateProject, ensureAuth } from '../../../../firebase'
import { useDebounce } from '../../../hooks/useDebounce'
import { isValidResponse, isUniqueResponse } from '../../../utils/validation'

// ========================================
// TYPES
// ========================================

type ZoneId = 'thinkBig' | 'thinkSmall' | 'causes' | 'motivation'

interface ProblemExploration {
  thinkBig: {
    answers: string[]
    resources: { label: string; url: string }[]
    hasCheckedFeedback?: boolean
  }
  thinkSmall: {
    answers: string[]
    imageUrls: string[]
    hasCheckedFeedback?: boolean
  }
  causes: {
    answers: string[]
    hasCheckedFeedback?: boolean
  }
  motivation: {
    answers: string[]
    hasCheckedFeedback?: boolean
  }
}

interface ProjectData {
  id: string
  passionTopic: string | null
  chosenProblem: string | null
  problemExploration?: ProblemExploration
  currentStepId?: string
  problemStatement?: {
    what: string
    who: string
    where: string
    why: string
  }
  updatedAt: any
}

interface ZoneFeedback {
  loading: boolean
  feedback: string[]
  followUpQuestion: string | null
}

// ========================================
// CONSTANTS
// ========================================

const ZONE_CONFIG = {
  thinkBig: {
    title: 'Think Big',
    prompt: 'What are the effects of this problem on the wider world?',
    icon: '🌍',
    color: 'rgba(241, 95, 36, 0.2)',
    position: 'top-left' as const,
  },
  thinkSmall: {
    title: 'Think Small',
    prompt: 'Do you see this problem in your community / school / city? What does it look like?',
    icon: '🏘️',
    color: 'rgba(134, 218, 189, 0.2)',
    position: 'top-right' as const,
  },
  causes: {
    title: 'Causes',
    prompt: 'Who or what do you think is causing this problem?',
    icon: '🔍',
    color: 'rgba(100, 150, 220, 0.2)',
    position: 'bottom-left' as const,
  },
  motivation: {
    title: 'Motivation',
    prompt: 'Why do you want to change this? What makes this feel important to you?',
    icon: '💡',
    color: 'rgba(200, 120, 200, 0.2)',
    position: 'bottom-right' as const,
  },
}

// Initialize empty problem exploration structure
const EMPTY_EXPLORATION: ProblemExploration = {
  thinkBig: { answers: ['', '', ''], resources: [], hasCheckedFeedback: false },
  thinkSmall: { answers: ['', '', ''], imageUrls: [], hasCheckedFeedback: false },
  causes: { answers: ['', '', ''], hasCheckedFeedback: false },
  motivation: { answers: [], hasCheckedFeedback: false },
}

// ========================================
// MAIN COMPONENT
// ========================================
// Fullscreen modal approach - no zoom/pan complexity

interface ExploreStepProps {
  projectId?: string
  project?: any
  onZoneFocusChange?: (isFocused: boolean) => void
}

export default function ExploreStep({ onZoneFocusChange }: Partial<ExploreStepProps> = {}) {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string

  // Project data
  const [project, setProject] = useState<ProjectData | null>(null)
  const [loading, setLoading] = useState(true)

  // Zone state
  const [focusedZoneId, setFocusedZoneId] = useState<ZoneId | null>(null)
  const [zoneData, setZoneData] = useState<ProblemExploration>(EMPTY_EXPLORATION)

  // Feedback state (per zone)
  const [feedback, setFeedback] = useState<Record<ZoneId, ZoneFeedback>>({
    thinkBig: { loading: false, feedback: [], followUpQuestion: null },
    thinkSmall: { loading: false, feedback: [], followUpQuestion: null },
    causes: { loading: false, feedback: [], followUpQuestion: null },
    motivation: { loading: false, feedback: [], followUpQuestion: null },
  })

  // Refs
  const hasInitialized = useRef(false)

  // Debounced zone data for auto-saving
  const debouncedZoneData = useDebounce(zoneData, 800)

  // ========================================
  // FIREBASE SUBSCRIPTION
  // ========================================

  useEffect(() => {
    let unsubscribe: (() => void) | undefined

    const init = async () => {
      try {
        await ensureAuth()

        unsubscribe = subscribeToProject(projectId, (data) => {
          if (!data) {
            setProject(null)
            setLoading(false)
            return
          }

          setProject(data as ProjectData)

          // Initialize zone data on first load
          if (!hasInitialized.current) {
            hasInitialized.current = true
            const exploration = data.problemExploration || EMPTY_EXPLORATION
            setZoneData(exploration)
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
  }, [projectId])

  // ========================================
  // AUTO-SAVE TO FIRESTORE
  // ========================================

  useEffect(() => {
    // Don't save on initial load
    if (!hasInitialized.current) return

    // Save debounced changes to Firestore
    const saveToFirestore = async () => {
      try {
        await updateProject(projectId, {
          problemExploration: debouncedZoneData,
        })
      } catch (error) {
        console.error('Error saving problem exploration:', error)
      }
    }

    saveToFirestore()
  }, [debouncedZoneData, projectId])

  // ========================================
  // ZONE INTERACTION
  // ========================================

  /**
   * Open zone in fullscreen modal
   */
  const openZone = (zoneId: ZoneId) => {
    setFocusedZoneId(zoneId)
    onZoneFocusChange?.(true)
  }

  /**
   * Close fullscreen modal
   */
  const closeZone = () => {
    setFocusedZoneId(null)
    onZoneFocusChange?.(false)
  }

  // ========================================
  // ESC KEY HANDLER
  // ========================================

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && focusedZoneId) {
        closeZone()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [focusedZoneId])

  // ========================================
  // ZONE DATA UPDATES
  // ========================================

  /**
   * Update answers for a zone
   */
  const updateAnswers = (zoneId: ZoneId, answers: string[]) => {
    setZoneData(prev => ({
      ...prev,
      [zoneId]: {
        ...prev[zoneId],
        answers,
      },
    }))
  }

  /**
   * Add a new answer to a zone
   */
  const addAnswer = (zoneId: ZoneId) => {
    setZoneData(prev => ({
      ...prev,
      [zoneId]: {
        ...prev[zoneId],
        answers: [...prev[zoneId].answers, ''],
      },
    }))
  }

  /**
   * Remove an answer from a zone
   */
  const removeAnswer = (zoneId: ZoneId, index: number) => {
    setZoneData(prev => ({
      ...prev,
      [zoneId]: {
        ...prev[zoneId],
        answers: prev[zoneId].answers.filter((_, i) => i !== index),
      },
    }))
  }

  /**
   * Update resources for thinkBig zone
   */
  const updateResources = (resources: { label: string; url: string }[]) => {
    setZoneData(prev => ({
      ...prev,
      thinkBig: {
        ...prev.thinkBig,
        resources,
      },
    }))
  }

  /**
   * Update image URLs for thinkSmall zone
   */
  const updateImageUrls = (imageUrls: string[]) => {
    setZoneData(prev => ({
      ...prev,
      thinkSmall: {
        ...prev.thinkSmall,
        imageUrls,
      },
    }))
  }

  // ========================================
  // AI FEEDBACK
  // ========================================

  /**
   * Request AI feedback for a zone
   */
  const checkThinking = async (zoneId: ZoneId) => {
    // Set loading state
    setFeedback(prev => ({
      ...prev,
      [zoneId]: { ...prev[zoneId], loading: true },
    }))

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          stepId: 'explore',
          zoneId,
          action: 'review',
          data: {
            answers: zoneData[zoneId].answers,
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
      setZoneData(prev => ({
        ...prev,
        [zoneId]: {
          ...prev[zoneId],
          hasCheckedFeedback: true,
        },
      }))

      // Save immediately to Firestore (don't wait for debounce)
      await updateProject(projectId, {
        [`problemExploration.${zoneId}.hasCheckedFeedback`]: true,
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

  // ========================================
  // RENDER
  // ========================================

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
        flexDirection: 'column',
        gap: '2rem',
        background: 'var(--color-background)',
        padding: '2rem',
      }}>
        <h2>No Problem Selected</h2>
        <p>You need to choose a problem before exploring it.</p>
        <Link href={`/project/${projectId}`} className="btn btn-primary">
          Go to Problem Incubator
        </Link>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-background)',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Breadcrumb Navigation */}
      <nav style={{
        position: 'absolute',
        top: '1.5rem',
        left: '2rem',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: '0.9rem',
      }}>
        <Link
          href={`/project/${projectId}`}
          style={{
            color: 'var(--color-text-primary)',
            textDecoration: 'none',
            opacity: 0.7,
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
        >
          Problem Incubator
        </Link>
        <span style={{ color: 'var(--color-text-primary)', opacity: 0.5 }}>→</span>
        <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>Explore</span>
      </nav>

      {/* Page Title */}
      <h1 style={{
        position: 'absolute',
        top: '2rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        fontSize: '2.5rem',
        fontWeight: 600,
        background: 'linear-gradient(135deg, #ffffff 0%, #86dabd 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        textAlign: 'center',
        margin: 0,
        whiteSpace: 'nowrap',
        letterSpacing: '0.02em',
        lineHeight: 1.3,
      }}>
        Step 1: What is the problem?
      </h1>

      {/* Static Canvas Layout */}
      <div style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {/* Central Problem Card */}
        <div
          className="glass-panel"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'clamp(280px, 22vw, 400px)',
            padding: 'clamp(1.5rem, 2vw, 2rem)',
            textAlign: 'center',
            background: 'var(--glass-bg)',
            border: '2px solid var(--color-accent)',
            boxShadow: '0 0 40px rgba(241, 95, 36, 0.3)',
            transition: 'opacity 0.3s ease',
            opacity: focusedZoneId ? 0.3 : 1,
            pointerEvents: focusedZoneId ? 'none' : 'auto',
          }}
        >
          <h3 style={{ color: 'var(--color-accent)', marginBottom: '1rem', fontSize: '1.1rem' }}>
            Your Problem
          </h3>
          <p style={{ lineHeight: 1.6 }}>{project.chosenProblem}</p>
        </div>

        {/* Corner Zone Cards */}
        {(Object.keys(ZONE_CONFIG) as ZoneId[]).map((zoneId) => (
          <ZoneCardCorner
            key={zoneId}
            zoneId={zoneId}
            config={ZONE_CONFIG[zoneId]}
            data={zoneData[zoneId]}
            isDimmed={focusedZoneId !== null}
            onClick={() => openZone(zoneId)}
          />
        ))}
      </div>

      {/* Fullscreen Modal */}
      {focusedZoneId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(22, 34, 55, 0.95)',
            backdropFilter: 'blur(12px)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeIn 0.3s ease-out',
            cursor: 'pointer',
          }}
          onClick={closeZone}
        >
          <div
            style={{
              width: '95vw',
              maxWidth: '1400px',
              height: '90vh',
              cursor: 'default',
              animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              position: 'relative',
              display: 'flex',
              padding: '1rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={closeZone}
              className="btn btn-secondary"
              style={{
                position: 'absolute',
                left: '-140px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                padding: 0,
                fontSize: '4rem',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ×
            </button>

            {/* Fullscreen Zone Card */}
            <ZoneCardFullscreen
              zoneId={focusedZoneId}
              config={ZONE_CONFIG[focusedZoneId]}
              data={zoneData[focusedZoneId]}
              feedback={feedback[focusedZoneId]}
              onClose={closeZone}
              onUpdateAnswers={(answers) => updateAnswers(focusedZoneId, answers)}
              onAddAnswer={() => addAnswer(focusedZoneId)}
              onRemoveAnswer={(index) => removeAnswer(focusedZoneId, index)}
              onUpdateResources={focusedZoneId === 'thinkBig' ? updateResources : undefined}
              onUpdateImageUrls={focusedZoneId === 'thinkSmall' ? updateImageUrls : undefined}
              onCheckThinking={() => checkThinking(focusedZoneId)}
            />
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(40px) scale(0.95);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}

// ========================================
// ZONE CARD COMPONENTS
// ========================================

// Corner preview card
interface ZoneCardCornerProps {
  zoneId: ZoneId
  config: typeof ZONE_CONFIG[ZoneId]
  data: any
  isDimmed: boolean
  onClick: () => void
}

function ZoneCardCorner({ zoneId, config, data, isDimmed, onClick }: ZoneCardCornerProps) {
  const positionStyles = {
    'top-left': { top: 'max(2rem, 15vh)', left: 'max(2rem, 12vw)' },
    'top-right': { top: 'max(2rem, 15vh)', right: 'max(2rem, 12vw)' },
    'bottom-left': { bottom: 'max(2rem, 15vh)', left: 'max(2rem, 12vw)' },
    'bottom-right': { bottom: 'max(2rem, 15vh)', right: 'max(2rem, 12vw)' },
  }

  return (
    <div
      className="glass-panel"
      onClick={onClick}
      style={{
        position: 'absolute',
        ...positionStyles[config.position],
        width: 'clamp(220px, 18vw, 320px)',
        padding: 'clamp(1rem, 1.5vw, 1.5rem)',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        background: `linear-gradient(135deg, var(--glass-bg), ${config.color})`,
        opacity: isDimmed ? 0.3 : 1,
        pointerEvents: isDimmed ? 'none' : 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={(e) => {
        if (!isDimmed) {
          e.currentTarget.style.transform = 'translateY(-5px)'
          e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.5)'
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = ''
        e.currentTarget.style.boxShadow = ''
      }}
    >
      <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{config.icon}</div>
      <h3 style={{ color: 'var(--color-text-heading)', marginBottom: '0.5rem', fontSize: '1.2rem' }}>
        {config.title}
      </h3>
      <p style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '0.75rem' }}>
        {config.prompt}
      </p>
      {data.answers && data.answers.length > 0 && (
        <div style={{ fontSize: '0.8rem', color: 'var(--color-secondary)', marginBottom: '0.75rem' }}>
          {data.answers.filter((a: string) => a.trim()).length} response(s)
        </div>
      )}

      {/* Progress Tracker */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 'auto',
        paddingTop: '0.75rem',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        {Array.from({ length: zoneId === 'motivation' ? 1 : 3 }).map((_, index) => {
          // Check if this specific answer is valid and unique
          const answer = data.answers?.[index] || ''
          const allAnswers = data.answers || []
          const isComplete = isValidResponse(answer) && isUniqueResponse(answer, allAnswers)

          return (
            <div
              key={index}
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                border: '2px solid var(--color-secondary)',
                background: isComplete ? 'var(--color-secondary)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
              }}
            >
              {isComplete && (
                <span style={{ color: 'var(--color-background)', fontSize: '0.7rem', fontWeight: 'bold' }}>
                  ✓
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Fullscreen modal card
interface ZoneCardFullscreenProps {
  zoneId: ZoneId
  config: typeof ZONE_CONFIG[ZoneId]
  data: any
  feedback: ZoneFeedback
  onClose: () => void
  onUpdateAnswers: (answers: string[]) => void
  onAddAnswer: () => void
  onRemoveAnswer: (index: number) => void
  onUpdateResources?: (resources: { label: string; url: string }[]) => void
  onUpdateImageUrls?: (imageUrls: string[]) => void
  onCheckThinking: () => void
}

function ZoneCardFullscreen({
  zoneId,
  config,
  data,
  feedback,
  onClose,
  onUpdateAnswers,
  onAddAnswer,
  onRemoveAnswer,
  onUpdateResources,
  onUpdateImageUrls,
  onCheckThinking,
}: ZoneCardFullscreenProps) {
  return (
    <div style={{ display: 'flex', gap: '2rem', height: '100%', width: '100%' }}>
      {/* Left Side - Workable Focus Area */}
      <div
        className="glass-panel"
        style={{
          flex: 1,
          padding: '3rem',
          background: `linear-gradient(135deg, var(--glass-bg), ${config.color})`,
          border: `2px solid var(--color-accent)`,
          position: 'relative',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '2.5rem' }}>{config.icon}</span>
            <h2 style={{ fontSize: '1.8rem' }}>{config.title}</h2>
          </div>
        </div>

        {/* Prompt */}
        <p style={{
          fontSize: '1.1rem',
          marginBottom: '2rem',
          padding: '1rem',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '0.75rem',
          borderLeft: '4px solid var(--color-accent)',
        }}>
          {config.prompt}
        </p>

        {/* Zone-specific inputs */}
        {zoneId === 'thinkBig' && (
          <ThinkBigInputs
            data={data}
            onUpdateAnswers={onUpdateAnswers}
          />
        )}

        {zoneId === 'thinkSmall' && (
          <ThinkSmallInputs
            data={data}
            onUpdateAnswers={onUpdateAnswers}
          />
        )}

        {zoneId === 'causes' && (
          <CausesInputs
            data={data}
            onUpdateAnswers={onUpdateAnswers}
          />
        )}

        {zoneId === 'motivation' && (
          <MotivationInputs
            data={data}
            onUpdateAnswers={onUpdateAnswers}
            onAddAnswer={onAddAnswer}
            onRemoveAnswer={onRemoveAnswer}
          />
        )}
      </div>

      {/* Right Side - Feedback Panel */}
      <div
        className="glass-panel"
        style={{
          width: '400px',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.5rem',
          background: 'rgba(134, 218, 189, 0.05)',
          border: '1px solid var(--color-secondary)',
        }}
      >
        {/* Check Thinking Button at Top */}
        <button
          onClick={onCheckThinking}
          disabled={feedback.loading}
          className="btn btn-primary"
          style={{
            width: '100%',
            padding: '1rem',
            fontSize: '1.1rem',
            opacity: feedback.loading ? 0.6 : 1,
            marginBottom: '1.5rem',
          }}
        >
          {feedback.loading ? 'Checking...' : '✓ Check my thinking'}
        </button>

        {/* Feedback Display Area */}
        {feedback.feedback.length > 0 ? (
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
            }}
          >
            <h4 style={{ color: 'var(--color-secondary)', marginBottom: '1rem', fontSize: '1.1rem' }}>
              💭 Feedback
            </h4>
            <ul style={{ paddingLeft: '1.5rem', lineHeight: 1.8 }}>
              {feedback.feedback.map((point, i) => (
                <li key={i} style={{ marginBottom: '0.5rem' }}>{point}</li>
              ))}
            </ul>
            {feedback.followUpQuestion && (
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                background: 'rgba(241, 95, 36, 0.1)',
                borderRadius: '0.5rem',
                borderLeft: '3px solid var(--color-accent)',
              }}>
                <strong style={{ color: 'var(--color-accent)' }}>Consider:</strong>{' '}
                {feedback.followUpQuestion}
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.5,
              textAlign: 'center',
              padding: '2rem',
            }}
          >
            <p>Click "Check my thinking" to get AI feedback on your responses</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ========================================
// INPUT COMPONENTS
// ========================================

function ThinkBigInputs({ data, onUpdateAnswers }: any) {
  return (
    <div>
      <h4 style={{ marginBottom: '1rem', color: 'var(--color-secondary)' }}>3 Effects on the Wider World</h4>
      {data.answers.map((answer: string, index: number) => (
        <div key={index} style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '0.5rem', display: 'block' }}>
            Effect {index + 1}
          </label>
          <textarea
            value={answer}
            onChange={(e) => {
              const newAnswers = [...data.answers]
              newAnswers[index] = e.target.value
              onUpdateAnswers(newAnswers)
            }}
            placeholder="Describe an effect on the wider world..."
            className="input-glass"
            rows={6}
            style={{ width: '100%', resize: 'vertical', minHeight: '140px', fontFamily: 'inherit' }}
          />
        </div>
      ))}
    </div>
  )
}

function ThinkSmallInputs({ data, onUpdateAnswers }: any) {
  return (
    <div>
      <h4 style={{ marginBottom: '1rem', color: 'var(--color-secondary)' }}>3 Observations from Your Community</h4>
      {data.answers.map((answer: string, index: number) => (
        <div key={index} style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
            Observation {index + 1}
          </label>
          <textarea
            value={answer}
            onChange={(e) => {
              const newAnswers = [...data.answers]
              newAnswers[index] = e.target.value
              onUpdateAnswers(newAnswers)
            }}
            placeholder="Describe what you observe in your community, school, or city..."
            className="input-glass"
            rows={6}
            style={{ width: '100%', resize: 'vertical', minHeight: '140px', fontFamily: 'inherit' }}
          />
        </div>
      ))}
    </div>
  )
}

function CausesInputs({ data, onUpdateAnswers }: any) {
  return (
    <div>
      <h4 style={{ marginBottom: '1rem', color: 'var(--color-secondary)' }}>3 Identified Causes</h4>
      {data.answers.map((answer: string, index: number) => (
        <div key={index} style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
            Cause {index + 1}
          </label>
          <textarea
            value={answer}
            onChange={(e) => {
              const newAnswers = [...data.answers]
              newAnswers[index] = e.target.value
              onUpdateAnswers(newAnswers)
            }}
            placeholder="Describe a person, group, or system that contributes to this problem..."
            className="input-glass"
            rows={6}
            style={{ width: '100%', resize: 'vertical', minHeight: '140px', fontFamily: 'inherit' }}
          />
        </div>
      ))}
    </div>
  )
}

function MotivationInputs({ data, onUpdateAnswers, onAddAnswer, onRemoveAnswer }: any) {
  return (
    <div>
      <h4 style={{ marginBottom: '1rem', color: 'var(--color-secondary)' }}>Your Motivation</h4>
      {data.answers.map((answer: string, index: number) => (
        <div key={index} style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', opacity: 0.7 }}>Reflection {index + 1}</span>
            {data.answers.length > 1 && (
              <button
                onClick={() => onRemoveAnswer(index)}
                className="btn btn-secondary"
                style={{ padding: '0.3rem 0.8rem', fontSize: '0.85rem' }}
              >
                Remove
              </button>
            )}
          </div>
          <textarea
            value={answer}
            onChange={(e) => {
              const newAnswers = [...data.answers]
              newAnswers[index] = e.target.value
              onUpdateAnswers(newAnswers)
            }}
            placeholder="Write about why this matters to you..."
            className="input-glass"
            rows={6}
            style={{ width: '100%', resize: 'vertical', minHeight: '140px', fontFamily: 'inherit' }}
          />
        </div>
      ))}
      {data.answers.length < 3 && (
        <button onClick={onAddAnswer} className="btn btn-secondary" style={{ width: '100%' }}>
          + Add reflection
        </button>
      )}
    </div>
  )
}
