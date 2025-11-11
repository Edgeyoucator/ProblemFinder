'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { subscribeToProject, updateProject } from '../../../../firebase'
import { useDebounce } from '../../../hooks/useDebounce'

// ========================================
// TYPES
// ========================================

type StationId = 'hiTech' | 'lowTech' | 'perspectives' | 'superpowers' | 'bottomlessDollar' | 'leader' | 'friends' | 'tinySeeds'

interface StationData {
  idea: string
  hasCheckedFeedback?: boolean
}

interface SolutionWheelData {
  hiTech: StationData
  lowTech: StationData
  perspectives: StationData
  superpowers: StationData
  bottomlessDollar: StationData
  leader: StationData
  friends: StationData
  tinySeeds: StationData
}

interface StationConfig {
  id: StationId
  number: number
  title: string
  prompt: string
}

interface StepProps {
  projectId?: string
  project?: any
  onZoneFocusChange?: (isFocused: boolean) => void
}

// ========================================
// STATION CONFIGURATIONS
// ========================================

const STATIONS: StationConfig[] = [
  {
    id: 'hiTech',
    number: 1,
    title: 'Hi Tech',
    prompt: 'Think of one solution that uses technology — for example, AI, robotics, software, or machines.',
  },
  {
    id: 'lowTech',
    number: 2,
    title: 'Low Tech',
    prompt: 'Think of another solution that uses little or no technology at all — something human, social, or analogue.',
  },
  {
    id: 'perspectives',
    number: 3,
    title: 'Different Perspectives',
    prompt: 'What if you were a teacher, an actor, an engineer, or a lawyer?\nThink about what special skills and talents these people have.\nHow might they use their expertise or perspective to solve the problem?\nSometimes creative ideas come from combining a problem with unexpected skills.',
  },
  {
    id: 'superpowers',
    number: 4,
    title: 'Superpowers',
    prompt: 'If you were a superhero, what powers could you use to tackle this problem?\nImagine what you could do if you could move at supersonic speed, control nature, or travel through time.\nDon\'t worry about realism — just think playfully and boldly.',
  },
  {
    id: 'bottomlessDollar',
    number: 5,
    title: 'The Bottomless Dollar',
    prompt: 'What would you do if you had unlimited money and resources?\nHow could you use those resources to make a difference?\nBe ambitious — imagine there are no limits to what you could fund or create.',
  },
  {
    id: 'leader',
    number: 6,
    title: 'Leader of Your Country',
    prompt: 'What would you do if you were the leader of your country?\nWhich policies, laws, or national actions would you introduce?\nWould you take bold or even extreme measures to change things?',
  },
  {
    id: 'friends',
    number: 7,
    title: 'With a Little Help from My Friends',
    prompt: 'What could be done if everyone pitched in to help?\nThink about collective action — what could schools, communities, or young people do together?\nKeep it realistic and small-scale: how might teamwork make the difference?',
  },
  {
    id: 'tinySeeds',
    number: 8,
    title: 'From Tiny Seeds, Mighty Oaks Grow',
    prompt: 'Think small.\nWhat small, simple actions could spark long-term change?\nHow might one small idea, habit, or message grow into something much bigger over time?',
  },
]

const EMPTY_SOLUTION_WHEEL: SolutionWheelData = {
  hiTech: { idea: '', hasCheckedFeedback: false },
  lowTech: { idea: '', hasCheckedFeedback: false },
  perspectives: { idea: '', hasCheckedFeedback: false },
  superpowers: { idea: '', hasCheckedFeedback: false },
  bottomlessDollar: { idea: '', hasCheckedFeedback: false },
  leader: { idea: '', hasCheckedFeedback: false },
  friends: { idea: '', hasCheckedFeedback: false },
  tinySeeds: { idea: '', hasCheckedFeedback: false },
}

// ========================================
// MAIN COMPONENT
// ========================================

export default function SolutionsStep({ projectId, project: initialProject, onZoneFocusChange }: StepProps) {
  const [project, setProject] = useState<any>(initialProject || null)
  const [solutionWheel, setSolutionWheel] = useState<SolutionWheelData>(EMPTY_SOLUTION_WHEEL)
  const [focusedStationId, setFocusedStationId] = useState<StationId | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const hasInitialized = useRef(false)

  // AI feedback state
  const [checkingFeedback, setCheckingFeedback] = useState<Record<StationId, boolean>>({
    hiTech: false,
    lowTech: false,
    perspectives: false,
    superpowers: false,
    bottomlessDollar: false,
    leader: false,
    friends: false,
    tinySeeds: false,
  })
  const [feedback, setFeedback] = useState<Record<StationId, string[]>>({
    hiTech: [],
    lowTech: [],
    perspectives: [],
    superpowers: [],
    bottomlessDollar: [],
    leader: [],
    friends: [],
    tinySeeds: [],
  })

  const actualProjectId = projectId || initialProject?.id

  // Subscribe to project data
  useEffect(() => {
    if (!actualProjectId) return

    const unsubscribe = subscribeToProject(actualProjectId, (updatedProject) => {
      setProject(updatedProject)

      if (!hasInitialized.current && updatedProject) {
        const existing = updatedProject.solutionWheel
        if (existing) {
          setSolutionWheel(existing)
        }
        hasInitialized.current = true
      }
    })

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [actualProjectId])

  // Debounced autosave
  const debouncedSolutionWheel = useDebounce(solutionWheel, 800)

  useEffect(() => {
    if (!hasInitialized.current) return
    if (!actualProjectId) return

    const saveToFirestore = async () => {
      try {
        await updateProject(actualProjectId, { solutionWheel: debouncedSolutionWheel })
      } catch (error) {
        console.error('Failed to save solution wheel:', error)
      }
    }

    saveToFirestore()
  }, [debouncedSolutionWheel, actualProjectId])

  // Track mounted state for portal
  useEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [])

  // ESC key handler
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && focusedStationId) {
        closeStation()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [focusedStationId])

  // Notify parent of zone focus changes
  useEffect(() => {
    onZoneFocusChange?.(focusedStationId !== null)
  }, [focusedStationId, onZoneFocusChange])

  // ========================================
  // HANDLERS
  // ========================================

  const openStation = (stationId: StationId) => {
    setFocusedStationId(stationId)
  }

  const closeStation = () => {
    setFocusedStationId(null)
  }

  const updateStationIdea = (stationId: StationId, idea: string) => {
    setSolutionWheel((prev) => ({
      ...prev,
      [stationId]: {
        ...prev[stationId],
        idea,
      },
    }))
  }

  const checkThinking = async (stationId: StationId) => {
    if (!actualProjectId) return

    setCheckingFeedback((prev) => ({ ...prev, [stationId]: true }))

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: actualProjectId,
          stepId: 'solutions',
          zoneId: stationId,
          action: 'review',
          data: {
            idea: solutionWheel[stationId].idea,
          },
        }),
      })

      const result = await response.json()

      if (result.success) {
        setFeedback((prev) => ({ ...prev, [stationId]: result.feedback || [] }))

        // Immediately update hasCheckedFeedback
        setSolutionWheel((prev) => ({
          ...prev,
          [stationId]: {
            ...prev[stationId],
            hasCheckedFeedback: true,
          },
        }))

        // Save immediately to Firestore (no debounce)
        await updateProject(actualProjectId, {
          [`solutionWheel.${stationId}.hasCheckedFeedback`]: true,
        })
      }
    } catch (error) {
      console.error('Failed to get AI feedback:', error)
    } finally {
      setCheckingFeedback((prev) => ({ ...prev, [stationId]: false }))
    }
  }

  const isStationComplete = (stationId: StationId): boolean => {
    const station = solutionWheel[stationId]
    return (
      station.idea.length > 15 &&
      station.hasCheckedFeedback === true
    )
  }

  // ========================================
  // LAYOUT CALCULATIONS
  // ========================================

  const calculateStationPosition = (index: number) => {
    const angle = (index / STATIONS.length) * 2 * Math.PI - Math.PI / 2 // Start from top
    const radius = 280 // Distance from center

    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    }
  }

  // ========================================
  // RENDER
  // ========================================

  const chosenProblem = project?.chosenProblem || 'Your chosen problem'

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: '#162237',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Central Problem Statement */}
      <div
        className="glass-panel"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          maxWidth: '400px',
          padding: '2rem',
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            color: 'var(--color-text-heading)',
            fontSize: '1.5rem',
            fontWeight: 600,
            margin: 0,
          }}
        >
          {chosenProblem}
        </h2>
        <p
          style={{
            color: 'var(--color-text-primary)',
            fontSize: '0.9rem',
            marginTop: '0.5rem',
            opacity: 0.7,
          }}
        >
          What should we do about it?
        </p>
      </div>

      {/* Circular Stations */}
      {STATIONS.map((station, index) => {
        const pos = calculateStationPosition(index)
        const isComplete = isStationComplete(station.id)

        return (
          <div
            key={station.id}
            onClick={() => openStation(station.id)}
            className="glass-panel"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
              width: '140px',
              height: '140px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
              transition: 'all 0.3s ease',
              border: isComplete
                ? '2px solid var(--color-secondary)'
                : '1px solid var(--glass-border)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px)) scale(1.1)`
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.5)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`
              e.currentTarget.style.boxShadow = ''
            }}
          >
            {/* Station Number */}
            <div
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'var(--color-accent)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
                fontWeight: 'bold',
              }}
            >
              {station.number}
            </div>

            {/* Completion Checkmark */}
            {isComplete && (
              <div
                style={{
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'var(--color-secondary)',
                  color: 'var(--color-background)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                }}
              >
                ✓
              </div>
            )}

            {/* Station Title */}
            <span
              style={{
                color: 'var(--color-text-heading)',
                fontSize: '0.85rem',
                fontWeight: 600,
                textAlign: 'center',
                lineHeight: '1.2',
              }}
            >
              {station.title}
            </span>
          </div>
        )
      })}

      {/* Modal */}
      {isMounted &&
        focusedStationId &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(22, 34, 55, 0.95)',
              backdropFilter: 'blur(12px)',
              zIndex: 2000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'fadeIn 0.3s ease-out',
            }}
            onClick={closeStation}
          >
            <div
              className="glass-panel"
              style={{
                width: '90%',
                maxWidth: '1200px',
                height: '80vh',
                display: 'flex',
                animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                overflow: 'hidden',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Left Panel - Input */}
              <div
                style={{
                  flex: 1,
                  padding: '2rem',
                  borderRight: '1px solid var(--glass-border)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'var(--color-accent)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1rem',
                        fontWeight: 'bold',
                      }}
                    >
                      {STATIONS.find((s) => s.id === focusedStationId)?.number}
                    </div>
                    <h2
                      style={{
                        color: 'var(--color-text-heading)',
                        fontSize: '1.75rem',
                        fontWeight: 600,
                        margin: 0,
                      }}
                    >
                      {STATIONS.find((s) => s.id === focusedStationId)?.title}
                    </h2>
                  </div>
                  <p
                    style={{
                      color: 'var(--color-text-primary)',
                      fontSize: '0.95rem',
                      lineHeight: '1.6',
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {STATIONS.find((s) => s.id === focusedStationId)?.prompt}
                  </p>
                </div>

                <textarea
                  value={solutionWheel[focusedStationId]?.idea || ''}
                  onChange={(e) => updateStationIdea(focusedStationId, e.target.value)}
                  placeholder="Type your idea here..."
                  style={{
                    flex: 1,
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '0.75rem',
                    padding: '1rem',
                    color: 'var(--color-text-primary)',
                    fontSize: '1rem',
                    resize: 'none',
                    fontFamily: 'inherit',
                  }}
                />

                <button
                  onClick={() => checkThinking(focusedStationId)}
                  disabled={
                    checkingFeedback[focusedStationId] ||
                    solutionWheel[focusedStationId]?.idea.length <= 15
                  }
                  style={{
                    marginTop: '1rem',
                    padding: '0.75rem 1.5rem',
                    background:
                      solutionWheel[focusedStationId]?.idea.length <= 15
                        ? 'rgba(255, 255, 255, 0.1)'
                        : 'var(--color-accent)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    fontWeight: 600,
                    cursor:
                      solutionWheel[focusedStationId]?.idea.length <= 15
                        ? 'not-allowed'
                        : 'pointer',
                    opacity:
                      checkingFeedback[focusedStationId] ||
                      solutionWheel[focusedStationId]?.idea.length <= 15
                        ? 0.5
                        : 1,
                  }}
                >
                  {checkingFeedback[focusedStationId] ? 'Checking...' : 'Check My Idea'}
                </button>
              </div>

              {/* Right Panel - Feedback */}
              <div
                style={{
                  flex: 1,
                  padding: '2rem',
                  overflowY: 'auto',
                }}
              >
                <h3
                  style={{
                    color: 'var(--color-text-heading)',
                    fontSize: '1.25rem',
                    fontWeight: 600,
                    marginBottom: '1rem',
                  }}
                >
                  AI Feedback
                </h3>

                {feedback[focusedStationId]?.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {feedback[focusedStationId].map((point, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: 'rgba(0, 0, 0, 0.3)',
                          padding: '1rem',
                          borderRadius: '0.5rem',
                          color: 'var(--color-text-primary)',
                          fontSize: '0.95rem',
                          lineHeight: '1.6',
                        }}
                      >
                        {point}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p
                    style={{
                      color: 'var(--color-text-primary)',
                      fontSize: '0.95rem',
                      opacity: 0.6,
                    }}
                  >
                    Click "Check My Idea" to get feedback on your solution.
                  </p>
                )}
              </div>

              {/* Close Button */}
              <button
                onClick={closeStation}
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--color-text-primary)',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
