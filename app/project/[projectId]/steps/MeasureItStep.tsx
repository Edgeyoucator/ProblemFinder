'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { subscribeToProject, updateProject } from '../../../../firebase'
import { useDebounce } from '../../../hooks/useDebounce'
import { isValidResponse } from '../../../utils/validation'

type MethodId =
  | 'surveys'
  | 'interviews'
  | 'observations'
  | 'beforeAfter'
  | 'abTest'
  | 'analytics'
  | 'pilotRun'
  | 'usability'
  | 'feedbackForms'

interface MethodData {
  answers: Record<string, string>
}

interface MeasureItState {
  selectedMethod?: MethodId
  methods: Record<MethodId, MethodData>
}

interface StepProps {
  projectId?: string
  project?: any
  onZoneFocusChange?: (isFocused: boolean) => void
}

interface MethodConfig {
  id: MethodId
  title: string
  blurb: string
  prompts: string[]
  accent: string // hex or rgb
  accentSoft: string // rgba for overlays
}

const METHODS: MethodConfig[] = [
  {
    id: 'surveys',
    title: 'Surveys',
    blurb: 'Structured questions to gather opinions at scale.',
    accent: '#f15f24',
    accentSoft: 'rgba(241, 95, 36, 0.28)',
    prompts: [
      'Who will you survey and why?',
      'What 3 key questions will you ask?',
      'How will you distribute and collect responses?',
    ],
  },
  {
    id: 'interviews',
    title: 'Interviews',
    blurb: '1:1 conversations to probe depth and stories.',
    accent: '#ff9f1c',
    accentSoft: 'rgba(255, 159, 28, 0.26)',
    prompts: [
      'Who will you interview and why them?',
      'What topics must you explore?',
      'How will you record insights reliably?',
    ],
  },
  {
    id: 'observations',
    title: 'Observations',
    blurb: 'Watch real behaviour to see what actually happens.',
    accent: '#1abc9c',
    accentSoft: 'rgba(26, 188, 156, 0.26)',
    prompts: [
      'Where and when will you observe?',
      'What behaviours or signals will you track?',
      'How will you avoid bias while observing?',
    ],
  },
  {
    id: 'beforeAfter',
    title: 'Before / After',
    blurb: 'Compare snapshots to see change over time.',
    accent: '#5c7cfa',
    accentSoft: 'rgba(92, 124, 250, 0.26)',
    prompts: [
      'What baseline will you capture now?',
      'What will “after” look like and when?',
      'Which metrics or artifacts will you compare?',
    ],
  },
  {
    id: 'abTest',
    title: 'A/B Test',
    blurb: 'Compare two variants to learn what works better.',
    accent: '#e056fd',
    accentSoft: 'rgba(224, 86, 253, 0.25)',
    prompts: [
      'What are A and B, exactly?',
      'What outcome will decide the winner?',
      'How will you keep conditions fair?',
    ],
  },
  {
    id: 'analytics',
    title: 'Analytics',
    blurb: 'Use counts, clicks, or usage to measure impact.',
    accent: '#00c2ff',
    accentSoft: 'rgba(0, 194, 255, 0.26)',
    prompts: [
      'What signals will you track?',
      'What tools or logs will you use?',
      'How often will you review results?',
    ],
  },
  {
    id: 'pilotRun',
    title: 'Pilot Run',
    blurb: 'Small trial to test viability and fix issues.',
    accent: '#86dabd',
    accentSoft: 'rgba(134, 218, 189, 0.28)',
    prompts: [
      'What is your pilot scope and length?',
      'How will you recruit participants?',
      'What will success look like for the pilot?',
    ],
  },
  {
    id: 'usability',
    title: 'Usability Test',
    blurb: 'Watch someone try it; note friction points.',
    accent: '#ff6b6b',
    accentSoft: 'rgba(255, 107, 107, 0.28)',
    prompts: [
      'Who will test and what task will they try?',
      'What will you observe or time?',
      'How will you capture and prioritise fixes?',
    ],
  },
  {
    id: 'feedbackForms',
    title: 'Feedback Forms',
    blurb: 'Quick forms to gather targeted reactions.',
    accent: '#a29bfe',
    accentSoft: 'rgba(162, 155, 254, 0.26)',
    prompts: [
      'What questions will you include and why?',
      'When will you send forms and to whom?',
      'How will you summarise and act on answers?',
    ],
  },
]

const EMPTY_STATE: MeasureItState = {
  selectedMethod: undefined,
  methods: {
    surveys: { answers: {} },
    interviews: { answers: {} },
    observations: { answers: {} },
    beforeAfter: { answers: {} },
    abTest: { answers: {} },
    analytics: { answers: {} },
    pilotRun: { answers: {} },
    usability: { answers: {} },
    feedbackForms: { answers: {} },
  },
}

export default function MeasureItStep({ projectId, project: initialProject, onZoneFocusChange }: StepProps) {
  const [project, setProject] = useState<any>(initialProject || null)
  const [measure, setMeasure] = useState<MeasureItState>(initialProject?.measureIt || EMPTY_STATE)
  const [focusedMethod, setFocusedMethod] = useState<MethodId | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const hasInitialized = useRef(false)

  const actualProjectId = projectId || initialProject?.id

  useEffect(() => {
    if (!actualProjectId) return
    const unsub = subscribeToProject(actualProjectId, (p) => {
      setProject(p)
      if (!hasInitialized.current) {
        if (p?.measureIt) setMeasure(p.measureIt)
        hasInitialized.current = true
      }
    })
    return () => { if (unsub) unsub() }
  }, [actualProjectId])

  const debounced = useDebounce(measure, 800)
  useEffect(() => {
    if (!actualProjectId) return
    if (!hasInitialized.current) return
    const save = async () => {
      try { await updateProject(actualProjectId, { measureIt: debounced }) } catch (e) {
        console.error('Failed to save measureIt', e)
      }
    }
    save()
  }, [debounced, actualProjectId])

  useEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [])

  useEffect(() => {
    onZoneFocusChange?.(focusedMethod !== null)
  }, [focusedMethod, onZoneFocusChange])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && focusedMethod) setFocusedMethod(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focusedMethod])

  const selectMethod = async (methodId: MethodId) => {
    setMeasure(prev => ({ ...prev, selectedMethod: methodId }))
    if (actualProjectId) {
      await updateProject(actualProjectId, { 'measureIt.selectedMethod': methodId })
    }
    // Open workspace immediately
    setFocusedMethod(methodId)
  }

  const updateAnswer = (methodId: MethodId, promptIndex: number, value: string) => {
    setMeasure(prev => ({
      ...prev,
      methods: {
        ...prev.methods,
        [methodId]: {
          answers: { ...prev.methods[methodId]?.answers, [String(promptIndex)]: value },
        },
      },
    }))
  }

  const isMethodComplete = (methodId: MethodId) => {
    const cfg = METHODS.find(m => m.id === methodId)
    const answers = measure.methods[methodId]?.answers || {}
    const values = cfg ? cfg.prompts.map((_, i) => answers[String(i)] || '') : []
    return values.filter(v => isValidResponse(v)).length >= 3
  }

  const selectedTitle = METHODS.find(m => m.id === measure.selectedMethod)?.title || 'None selected'

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#162237', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
      {/* Liquid background */}
      <div className="liquid-bg">
        <div className="liquid-blob orange" style={{ top: '-10%', left: '-10%', width: '60%', height: '60%' }} />
        <div className="liquid-blob green" style={{ top: '-15%', right: '-10%', width: '60%', height: '60%' }} />
      </div>

      {/* Intro */}
      <div style={{ maxWidth: 1000, textAlign: 'center' }}>
        <h2 style={{ marginBottom: '0.5rem' }}>Measure it</h2>
        <p style={{ opacity: 0.9 }}>Choose how you will measure impact. Hover to preview, select one method, then plan it out.</p>
      </div>

      {/* 3x3 methods grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '1rem', width: '100%', maxWidth: 1200 }}>
        {METHODS.map((m) => {
          const selected = measure.selectedMethod === m.id
          const complete = isMethodComplete(m.id)
          return (
            <div key={m.id} className="glass-card" data-complete={complete ? 'true' : 'false'}
              style={{
                padding: '1rem',
                position: 'relative',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
                borderColor: m.accentSoft,
                background:
                  `linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0) 60%),
                   radial-gradient(600px 220px at 0% -20%, ${m.accentSoft}, transparent 60%),
                   radial-gradient(700px 260px at 120% 0%, ${m.accentSoft}, transparent 60%),
                   var(--glass-bg)`,
              }}
              onMouseEnter={(e) => {
                const el = (e.currentTarget as HTMLDivElement)
                el.style.transform = 'translateY(-2px) scale(1.03)'
                el.style.boxShadow = `0 12px 40px rgba(0,0,0,0.45), 0 0 22px ${m.accentSoft}`
              }}
              onMouseLeave={(e) => {
                const el = (e.currentTarget as HTMLDivElement)
                el.style.transform = ''
                el.style.boxShadow = ''
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ color: 'var(--color-text-heading)', fontWeight: 600 }}>{m.title}</div>
                  <div style={{ fontSize: '0.95rem', opacity: 0.9 }}>{m.blurb}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div title="accent" style={{ width: 12, height: 12, borderRadius: '50%', background: m.accent }} />
                  {complete && (
                    <div aria-label="complete" style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-secondary), #a7ead1)', color: 'var(--color-background)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>✓</div>
                  )}
                </div>
              </div>
              <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="radio" name="method" checked={selected} onChange={() => selectMethod(m.id)} />
                  <span>Select</span>
                </label>
                {selected && (
                  <button className="btn btn-secondary" onClick={() => setFocusedMethod(m.id)} style={{ borderColor: m.accentSoft }}>Open workspace</button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Selected summary */}
      <div className="glass-card" style={{ marginTop: '0.5rem', width: '100%', maxWidth: 1200, padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong>Selected:</strong> {selectedTitle}
        </div>
        {measure.selectedMethod && (
          <button className="btn btn-primary" onClick={() => setFocusedMethod(measure.selectedMethod!)}>Open workspace</button>
        )}
      </div>

      {/* Modal workspace */}
      {isMounted && focusedMethod && createPortal(
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(22,34,55,0.95)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.25s ease-out' }}
          onClick={() => setFocusedMethod(null)}
        >
          <div className="glass-card" onClick={(e) => e.stopPropagation()} style={{ width: '92%', maxWidth: 1200, height: '80vh', display: 'flex', overflow: 'hidden', animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)', borderLeft: `6px solid ${METHODS.find(m=>m.id===focusedMethod)?.accent}` }}>
            <div style={{ flex: '1 1 60%', padding: '2rem', overflow: 'auto' }}>
              <h2 style={{ marginBottom: '0.5rem' }}>{METHODS.find(m => m.id === focusedMethod)?.title}</h2>
              <p style={{ opacity: 0.85, marginBottom: '1rem' }}>{METHODS.find(m => m.id === focusedMethod)?.blurb}</p>
              {METHODS.find(m => m.id === focusedMethod)?.prompts.map((p, idx) => (
                <Field key={idx} label={p} value={measure.methods[focusedMethod!]?.answers[String(idx)] || ''} onChange={(v) => updateAnswer(focusedMethod!, idx, v)} />
              ))}
              <button onClick={() => setFocusedMethod(null)} className="btn btn-secondary" style={{ marginTop: '0.5rem', width: '100%' }}>Close (ESC)</button>
            </div>
            <div style={{ flex: '1 1 40%', padding: '2rem', background: 'rgba(0,0,0,0.2)', borderLeft: '1px solid rgba(255,255,255,0.08)', overflow: 'auto' }}>
              <h3 style={{ marginBottom: '0.75rem', color: 'var(--color-secondary)' }}>Notes</h3>
              <p style={{ opacity: 0.9, lineHeight: 1.6 }}>Focus on clear, measurable outcomes. Aim for unbiased collection and simple analysis you can actually do.</p>
            </div>
            <style>{`
              @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
              @keyframes slideUp { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
            `}</style>
          </div>
        </div>, document.body)
      }
    </div>
  )
}

function Field({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{ fontSize: '0.95rem', marginBottom: '0.35rem', opacity: 0.9 }}>{label}</div>
      <textarea
        className="input-glass"
        style={{ minHeight: 140, resize: 'vertical' }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
