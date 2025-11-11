'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { subscribeToProject, ensureAuth, db } from '../../../../firebase'
import { doc, updateDoc } from 'firebase/firestore'
import { isZoneComplete, isValidResponse } from '../../../utils/validation'

// Import step components
import ExploreStep from '../steps/ExploreStep'
import FourWsStep from '../steps/FourWsStep'
import SolutionsStep from '../steps/SolutionsStep'
import CoFounderLabStep from '../steps/CoFounderLabStep'
import DecisionTreeStep from '../steps/DecisionTreeStep'
import EvaluateItStep from '../steps/EvaluateItStep'
import MeasureItStep from '../steps/MeasureItStep'
import StakeholderMapStep from '../steps/StakeholderMapStep'

// ========================================
// TYPES
// ========================================

interface ProjectData {
  id: string
  passionTopic: string | null
  problemMap: Array<{
    statement: string
    domain: string
    path: string[]
    timestamp: number
  }>
  chosenProblem: string | null
  currentStep: string
  currentStepId?: string
  problemStatement?: {
    what: { answer: string; hasCheckedFeedback: boolean }
    who: { answer: string; hasCheckedFeedback: boolean }
    where: { answer: string; hasCheckedFeedback: boolean }
    why: { answer: string; hasCheckedFeedback: boolean }
  }
  problemExploration?: any
  solutionWheel?: any
  coFounderLab?: any
  decision?: any
  evaluateIt?: any
  measureIt?: any
  stakeholders?: any
  updatedAt: any
}

interface Step {
  id: string
  title: string
  component: React.ComponentType<any>
  isComplete: (project: ProjectData) => boolean
}

// ========================================
// STEP CONFIGURATION
// ========================================

const STEPS: Step[] = [
  {
    id: 'explore',
    title: 'Explore',
    component: ExploreStep,
    isComplete: (project) => {
      const exploration = project.problemExploration
      if (!exploration) return false
      // Each zone requires valid responses AND having checked feedback
      // Think Big/Small/Causes need 3 responses, Motivation needs 1
      return (
        isZoneComplete(exploration.thinkBig?.answers || [], 3) &&
        exploration.thinkBig?.hasCheckedFeedback === true &&
        isZoneComplete(exploration.thinkSmall?.answers || [], 3) &&
        exploration.thinkSmall?.hasCheckedFeedback === true &&
        isZoneComplete(exploration.causes?.answers || [], 3) &&
        exploration.causes?.hasCheckedFeedback === true &&
        isZoneComplete(exploration.motivation?.answers || [], 1) &&
        exploration.motivation?.hasCheckedFeedback === true
      )
    },
  },
  {
    id: 'four-ws',
    title: '4Ws',
    component: FourWsStep,
    isComplete: (project) => {
      const stmt = project.problemStatement
      if (!stmt) return false
      // Each zone requires at least 10 characters AND having checked feedback
      return (
        stmt.what?.answer?.length >= 10 &&
        stmt.what?.hasCheckedFeedback === true &&
        stmt.who?.answer?.length >= 10 &&
        stmt.who?.hasCheckedFeedback === true &&
        stmt.where?.answer?.length >= 10 &&
        stmt.where?.hasCheckedFeedback === true &&
        stmt.why?.answer?.length >= 10 &&
        stmt.why?.hasCheckedFeedback === true
      )
    },
  },
  {
    id: 'solutions',
    title: 'Solutions',
    component: SolutionsStep,
    isComplete: (project) => {
      const wheel = project.solutionWheel
      if (!wheel) return false
      // All 8 stations must be complete: idea >15 chars + hasCheckedFeedback
      const stations = [
        'hiTech',
        'lowTech',
        'perspectives',
        'superpowers',
        'bottomlessDollar',
        'leader',
        'friends',
        'tinySeeds',
      ]
      return stations.every((stationId) => {
        const station = wheel[stationId]
        return (
          station?.idea?.length > 15 &&
          station?.hasCheckedFeedback === true
        )
      })
    },
  },
  {
    id: 'cofounder-lab',
    title: 'Co-Founder Lab',
    component: CoFounderLabStep,
    isComplete: (project) => {
      const lab = project.coFounderLab
      if (!lab) return false
      // Complete when proposedSolution is set and stage is completed
      return (
        lab.proposedSolution?.title?.length > 0 &&
        lab.currentStage === 'completed'
      )
    },
  },
  {
    id: 'decision-tree',
    title: 'Time to Decide',
    component: DecisionTreeStep,
    isComplete: (project) => {
      const d = project.decision
      if (!d) return false
      const gate1 = d.possible?.answer === 'yes'
        ? (d.possible?.resources?.length > 2 && d.possible?.time?.length > 2 && d.possible?.people?.length > 1)
        : (d.possible?.answer === 'not_sure' && d.possible?.conditions?.length > 3)
      const gate2 = d.planetImpact?.answer === 'no'
      const gate3 = d.impact?.answer === 'yes' && (d.impact?.explanation?.length > 5)
      const gate4 = d.originality?.answer === 'no_or_not_sure' || (d.originality?.answer === 'yes' && d.originality?.differentiation?.length > 5)
      return !!(gate1 && gate2 && gate3 && gate4)
    },
  },
  {
    id: 'evaluate-it',
    title: 'Evaluate it',
    component: EvaluateItStep,
    isComplete: (project) => {
      const e = project.evaluateIt
      if (!e) return false
      const worthVals = [e?.worthIt?.whoCares, e?.worthIt?.value, e?.worthIt?.uniqueness].filter(Boolean)
      const risksVals = [e?.risks?.limitations, e?.risks?.fragilePoint, e?.risks?.pushback, e?.risks?.realityCheck].filter(Boolean)
      const worthOk = worthVals.filter((v: string) => isValidResponse(v)).length >= 2
      const risksOk = risksVals.filter((v: string) => isValidResponse(v)).length >= 3
      const entOk = isValidResponse(e?.entrepreneur?.edge || '') && isValidResponse(e?.entrepreneur?.comeback || '')
      return !!(worthOk && risksOk && entOk)
    },
  },
  {
    id: 'measure-it',
    title: 'Measure it',
    component: MeasureItStep,
    isComplete: (project) => {
      const m = project.measureIt
      if (!m?.selectedMethod) return false
      const answers = m?.methods?.[m.selectedMethod]?.answers || {}
      const answerList = Object.values(answers) as string[]
      // Require at least 3 valid responses for the chosen method
      return answerList.filter((v: string) => isValidResponse(v)).length >= 3
    },
  },
  {
    id: 'stakeholders',
    title: 'Stakeholders',
    component: StakeholderMapStep,
    isComplete: (project) => {
      const s = project.stakeholders
      if (!s?.nodes) return false
      // Complete when at least one node has all 5 reflection fields valid
      const nodeIds = Object.keys(s.nodes)
      for (const id of nodeIds) {
        const a = s.nodes[id]?.answers || {}
        const planned = s.nodes[id]?.planned === true
        const ok = [a.name, a.contactMethod, a.introductionMessage, a.involvement, a.appeal]
          .every((x: string) => isValidResponse(x || '')) && planned
        if (ok) return true
      }
      return false
    },
  },
]

// ========================================
// MAIN COMPONENT
// ========================================

export default function HorizontalCanvasJourney() {
  const params = useParams()
  const projectId = params.projectId as string

  const [project, setProject] = useState<ProjectData | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [isZoneFocused, setIsZoneFocused] = useState(false)

  // Subscribe to project
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

          // Resume from saved step
          if (data.currentStepId) {
            const stepIndex = STEPS.findIndex(s => s.id === data.currentStepId)
            if (stepIndex !== -1) {
              setCurrentStepIndex(stepIndex)
            }
          }

          setLoading(false)
        })
      } catch (error) {
        console.error('Error loading project:', error)
        setLoading(false)
      }
    }

    init()

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [projectId])

  // Save current step to Firestore
  useEffect(() => {
    if (project && projectId) {
      const currentStep = STEPS[currentStepIndex]
      if (currentStep && project.currentStepId !== currentStep.id) {
        const projectRef = doc(db, 'projects', projectId)
        updateDoc(projectRef, {
          currentStepId: currentStep.id,
          updatedAt: new Date(),
        })
      }
    }
  }, [currentStepIndex, project, projectId])

  const goToPreviousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1)
    }
  }

  const currentStep = STEPS[currentStepIndex]
  const isCurrentStepComplete = project ? currentStep.isComplete(project) : false

  const goToNextStep = () => {
    if (currentStepIndex < STEPS.length - 1 && isCurrentStepComplete) {
      setCurrentStepIndex(currentStepIndex + 1)
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goToPreviousStep()
      } else if (e.key === 'ArrowRight' && isCurrentStepComplete) {
        goToNextStep()
      }
    }
    window.addEventListener('keydown', handleKeyboard)
    return () => window.removeEventListener('keydown', handleKeyboard)
  }, [currentStepIndex, project, isCurrentStepComplete])

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontSize: '1.2rem',
        opacity: 0.7,
      }}>
        Loading your project...
      </div>
    )
  }

  if (!project) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontSize: '1.2rem',
        opacity: 0.7,
      }}>
        Project not found
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflowX: 'hidden' }}>
      {/* Horizontal Sliding Container */}
      <div
        style={{
          display: 'flex',
          width: `${STEPS.length * 100}vw`,
          height: '100vh',
          transform: `translateX(-${currentStepIndex * 100}vw)`,
          transition: 'transform 0.5s ease-in-out',
        }}
      >
        {STEPS.map((step) => (
          <div
            key={step.id}
            style={{
              width: '100vw',
              height: '100vh',
              flexShrink: 0,
            }}
          >
            <step.component
              projectId={projectId}
              project={project}
              onZoneFocusChange={setIsZoneFocused}
            />
          </div>
        ))}
      </div>

      {/* Left Arrow */}
      {currentStepIndex > 0 && !isZoneFocused && (
        <button
          onClick={goToPreviousStep}
          className="btn btn-secondary"
          style={{
            position: 'fixed',
            left: '2rem',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '3rem',
            height: '3rem',
            borderRadius: '50%',
            fontSize: '1.5rem',
            padding: 0,
            zIndex: 1000,
          }}
          aria-label="Previous step"
        >
          ←
        </button>
      )}

      {/* Right Arrow */}
      {currentStepIndex < STEPS.length - 1 && !isZoneFocused && (
        <button
          onClick={goToNextStep}
          disabled={!isCurrentStepComplete}
          className="btn btn-primary"
          style={{
            position: 'fixed',
            right: '2rem',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '3rem',
            height: '3rem',
            borderRadius: '50%',
            fontSize: '1.5rem',
            padding: 0,
            opacity: isCurrentStepComplete ? 1 : 0.3,
            cursor: isCurrentStepComplete ? 'pointer' : 'not-allowed',
            zIndex: 1000,
          }}
          aria-label="Next step"
        >
          →
        </button>
      )}

      {/* Progress Indicator */}
      {!isZoneFocused && (
        <div
          style={{
            position: 'fixed',
            bottom: '2rem',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          {STEPS.map((step, index) => {
            const isActive = index === currentStepIndex
            const isCompleted = step.isComplete(project)

            return (
              <div
                key={step.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <div
                  style={{
                    width: isActive ? '3rem' : '2rem',
                    height: isActive ? '3rem' : '2rem',
                    borderRadius: '50%',
                    backgroundColor: isCompleted
                      ? 'var(--color-tertiary)'
                      : isActive
                      ? 'var(--color-secondary)'
                      : 'rgba(255, 255, 255, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: isActive ? '1rem' : '0.8rem',
                    fontWeight: isActive ? 600 : 400,
                    transition: 'all 0.3s ease-in-out',
                    border: isActive ? '2px solid var(--color-secondary)' : 'none',
                  }}
                >
                  {isCompleted ? '✓' : index + 1}
                </div>
                {isActive && (
                  <span style={{ fontSize: '0.85rem', opacity: 0.8, whiteSpace: 'nowrap' }}>
                    {step.title}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
