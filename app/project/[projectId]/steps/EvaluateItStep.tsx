'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { subscribeToProject, updateProject } from '../../../../firebase'
import { useDebounce } from '../../../hooks/useDebounce'
import { isValidResponse } from '../../../utils/validation'

interface StepProps {
  projectId?: string
  project?: any
  onZoneFocusChange?: (isFocused: boolean) => void
}

interface EvaluateItData {
  worthIt: {
    whoCares: string
    value: string
    uniqueness: string
  }
  risks: {
    limitations: string
    fragilePoint: string
    pushback: string
    realityCheck: string
  }
  entrepreneur: {
    edge: string
    allies: string
    comeback: string
  }
}

const EMPTY_EVALUATE_IT: EvaluateItData = {
  worthIt: { whoCares: '', value: '', uniqueness: '' },
  risks: { limitations: '', fragilePoint: '', pushback: '', realityCheck: '' },
  entrepreneur: { edge: '', allies: '', comeback: '' },
}

export default function EvaluateItStep({ projectId, project: initialProject, onZoneFocusChange }: StepProps) {
  const [project, setProject] = useState<any>(initialProject || null)
  const [evaluateIt, setEvaluateIt] = useState<EvaluateItData>(
    initialProject?.evaluateIt || EMPTY_EVALUATE_IT
  )
  const [focusedCard, setFocusedCard] = useState<'worthIt' | 'risks' | 'entrepreneur' | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  const actualProjectId = projectId || initialProject?.id

  // Subscribe to project data
  useEffect(() => {
    if (!actualProjectId) return
    const unsub = subscribeToProject(actualProjectId, (p) => {
      setProject(p)
      if (p?.evaluateIt) setEvaluateIt(p.evaluateIt)
    })
    return () => { if (unsub) unsub() }
  }, [actualProjectId])

  // Debounced autosave
  const debounced = useDebounce(evaluateIt, 800)
  useEffect(() => {
    if (!actualProjectId) return
    const save = async () => {
      try {
        await updateProject(actualProjectId, { evaluateIt: debounced })
      } catch (e) {
        console.error('Failed to save Evaluate It data', e)
      }
    }
    save()
  }, [debounced, actualProjectId])

  // Completion logic helpers
  const worthComplete = (() => {
    const vals = [
      evaluateIt.worthIt.whoCares,
      evaluateIt.worthIt.value,
      evaluateIt.worthIt.uniqueness,
    ]
    const validCount = vals.filter((v) => isValidResponse(v)).length
    return validCount >= 2
  })()

  const risksComplete = (() => {
    const vals = [
      evaluateIt.risks.limitations,
      evaluateIt.risks.fragilePoint,
      evaluateIt.risks.pushback,
      evaluateIt.risks.realityCheck,
    ]
    const validCount = vals.filter((v) => isValidResponse(v)).length
    return validCount >= 3
  })()

  const entrepreneurComplete = (
    isValidResponse(evaluateIt.entrepreneur.edge) &&
    isValidResponse(evaluateIt.entrepreneur.comeback)
  )

  const cardStatus = [worthComplete, risksComplete, entrepreneurComplete]

  const solutionTitle =
    project?.coFounderLab?.proposedSolution?.title || 'Your Solution'
  const solutionSummary =
    project?.coFounderLab?.proposedSolution?.description || project?.coFounderLab?.lockedVariant || ''

  // Notify parent about focus state (for arrows/progress)
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    ;(onZoneFocusChange && onZoneFocusChange(focusedCard !== null))
  }, [focusedCard, onZoneFocusChange])

  useEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && focusedCard) setFocusedCard(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focusedCard])

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: '#162237',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
        padding: '2rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* noop */}
      {/* Liquid background blobs */}
      <div className="liquid-bg">
        <div className="liquid-blob orange" style={{ top: '-10%', left: '-10%', width: '60%', height: '60%' }} />
        <div className="liquid-blob green" style={{ top: '-15%', right: '-10%', width: '60%', height: '60%' }} />
        <div className="liquid-blob blue" style={{ bottom: '-20%', left: '10%', width: '70%', height: '70%' }} />
      </div>

      {/* Modal expanded work area */}
      {isMounted && focusedCard && createPortal(
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(22,34,55,0.9)',
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'fadeIn 0.3s ease-out'
          }}
          onClick={() => setFocusedCard(null)}
        >
          <div
            className="glass-card"
            onClick={(e) => e.stopPropagation()}
            style={{ width: '92%', maxWidth: 1200, height: '80vh', display: 'flex', overflow: 'hidden', animation: 'slideUp 0.35s cubic-bezier(0.16,1,0.3,1)' }}
          >
            <div style={{ flex: '1 1 60%', padding: '2rem', overflow: 'auto' }}>
              {focusedCard === 'worthIt' && (
                <div>
                  <h2 style={{ marginBottom: '0.75rem' }}>Why it’s worth it</h2>
                  <p style={{ opacity: 0.85, marginBottom: '1.25rem' }}>Value & Relevance</p>
                  <Field label="Who actually cares?" placeholder="Name the specific people or groups who will genuinely care about this idea." value={evaluateIt.worthIt.whoCares} onChange={(v) => setEvaluateIt({ ...evaluateIt, worthIt: { ...evaluateIt.worthIt, whoCares: v } })} />
                  <Field label="What value do they get?" placeholder="What changes for them if this idea works — time saved, harm reduced, pride, fun, safety, etc.?" value={evaluateIt.worthIt.value} onChange={(v) => setEvaluateIt({ ...evaluateIt, worthIt: { ...evaluateIt.worthIt, value: v } })} />
                  <Field label="Why this idea, not a boring one?" placeholder="What makes this more interesting or powerful than a basic poster or awareness campaign?" value={evaluateIt.worthIt.uniqueness} onChange={(v) => setEvaluateIt({ ...evaluateIt, worthIt: { ...evaluateIt.worthIt, uniqueness: v } })} />
                </div>
              )}

              {focusedCard === 'risks' && (
                <div>
                  <h2 style={{ marginBottom: '0.75rem' }}>What could break it</h2>
                  <p style={{ opacity: 0.85, marginBottom: '1.25rem' }}>Critical Risk Thinking</p>
                  <Field label="Limitations" placeholder="Where might this idea struggle — too big, too costly, too few people, wrong timing, rules?" value={evaluateIt.risks.limitations} onChange={(v) => setEvaluateIt({ ...evaluateIt, risks: { ...evaluateIt.risks, limitations: v } })} />
                  <Field label="Fragile Points" placeholder="What one element, if it fails, could cause the whole thing to collapse?" value={evaluateIt.risks.fragilePoint} onChange={(v) => setEvaluateIt({ ...evaluateIt, risks: { ...evaluateIt.risks, fragilePoint: v } })} />
                  <Field label="Pushback" placeholder="Who might not like this idea or might block it — teachers, brands, officials, older students — and why?" value={evaluateIt.risks.pushback} onChange={(v) => setEvaluateIt({ ...evaluateIt, risks: { ...evaluateIt.risks, pushback: v } })} />
                  <Field label="Reality Check" placeholder="Is there any chance this could backfire or accidentally make things worse?" value={evaluateIt.risks.realityCheck} onChange={(v) => setEvaluateIt({ ...evaluateIt, risks: { ...evaluateIt.risks, realityCheck: v } })} />
                </div>
              )}

              {focusedCard === 'entrepreneur' && (
                <div>
                  <h2 style={{ marginBottom: '0.75rem' }}>Why you (entrepreneur mode)</h2>
                  <p style={{ opacity: 0.85, marginBottom: '1.25rem' }}>Strengths & Ownership</p>
                  <Field label="Your Edge" placeholder="What skills, hobbies, or connections make you well-suited to run this project?" value={evaluateIt.entrepreneur.edge} onChange={(v) => setEvaluateIt({ ...evaluateIt, entrepreneur: { ...evaluateIt.entrepreneur, edge: v } })} />
                  <Field label="Allies" placeholder="Who could you realistically get on board — friends, teachers, local groups, online communities?" value={evaluateIt.entrepreneur.allies} onChange={(v) => setEvaluateIt({ ...evaluateIt, entrepreneur: { ...evaluateIt.entrepreneur, allies: v } })} />
                  <Field label="Resilience" placeholder="If someone said ‘this will never work’, what’s your one-sentence comeback?" value={evaluateIt.entrepreneur.comeback} onChange={(v) => setEvaluateIt({ ...evaluateIt, entrepreneur: { ...evaluateIt.entrepreneur, comeback: v } })} />
                </div>
              )}

              <button onClick={() => setFocusedCard(null)} className="btn btn-secondary" style={{ marginTop: '1rem', width: '100%' }}>Close (ESC)</button>
            </div>

            {/* Right side – tips panel */}
            <div style={{ flex: '1 1 40%', padding: '2rem', background: 'rgba(0,0,0,0.2)', borderLeft: '1px solid rgba(255,255,255,0.08)', overflow: 'auto' }}>
              <h3 style={{ marginBottom: '0.75rem', color: 'var(--color-secondary)' }}>Tips</h3>
              {focusedCard === 'worthIt' && (
                <div style={{ lineHeight: 1.6, opacity: 0.9 }}>
                  <p>Be specific about people and outcomes. Avoid generic “raise awareness”.</p>
                </div>
              )}
              {focusedCard === 'risks' && (
                <div style={{ lineHeight: 1.6, opacity: 0.9 }}>
                  <p>Spot constraints early. Choose one fragile point you’d harden first.</p>
                </div>
              )}
              {focusedCard === 'entrepreneur' && (
                <div style={{ lineHeight: 1.6, opacity: 0.9 }}>
                  <p>Call out your real advantages and allies. Make your comeback tight.</p>
                </div>
              )}
            </div>

            <style>{`
              @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
              @keyframes slideUp { from { opacity: 0; transform: translateY(18px) } to { opacity: 1; transform: translateY(0) } }
            `}</style>
          </div>
        </div>, document.body)
      }
      {/* Framing text */}
      <div style={{ maxWidth: 1000, textAlign: 'center' }}>
        <h2 style={{ marginBottom: '0.5rem' }}>Evaluate it</h2>
        <p style={{ opacity: 0.9 }}>
          Now it’s time to think like a founder. Every good idea has value, risks, and a team behind it. Test yours across these three areas before moving forward.
        </p>
      </div>

      {/* Solution Card */}
      <div className="glass-card" style={{ maxWidth: 900, width: '100%', padding: '1rem', textAlign: 'center' }}>
        <h3 style={{ color: 'var(--color-text-heading)', marginBottom: '0.5rem' }}>{solutionTitle}</h3>
        {solutionSummary && (
          <p style={{ color: 'var(--color-text-primary)', opacity: 0.9 }}>{solutionSummary}</p>
        )}
      </div>

      {/* Compact clickable cards */}
      <div style={{ display: 'flex', width: '100%', maxWidth: 1200, gap: '1rem', marginTop: '0.5rem' }}>
        <SummaryCard
          title="Why it’s worth it"
          subtitle="Value & Relevance"
          bullets={[ 'Who actually cares?', 'What value do they get?', 'Why this idea, not a boring one?' ]}
          complete={worthComplete}
          onClick={() => setFocusedCard('worthIt')}
        />
        <SummaryCard
          title="What could break it"
          subtitle="Critical Risk Thinking"
          bullets={[ 'Limitations', 'Fragile Points', 'Pushback', 'Reality Check' ]}
          complete={risksComplete}
          onClick={() => setFocusedCard('risks')}
        />
        <SummaryCard
          title="Why you (entrepreneur mode)"
          subtitle="Strengths & Ownership"
          bullets={[ 'Your Edge', 'Allies', 'Resilience' ]}
          complete={entrepreneurComplete}
          onClick={() => setFocusedCard('entrepreneur')}
        />
      </div>

      {/* Inner Progress Indicator for this step (3 dots) */}
      <div
        style={{
          position: 'fixed',
          bottom: '6rem', // above global journey indicator
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'center',
          zIndex: 900,
        }}
      >
        {cardStatus.map((done, i) => (
          <div key={i} className={`progress-dot ${done ? 'done' : ''}`} title={done ? 'Complete' : 'Incomplete'} />
        ))}
      </div>
    </div>
  )
}

function SummaryCard({ title, subtitle, bullets, complete, onClick }: {
  title: string
  subtitle?: string
  bullets?: string[]
  complete?: boolean
  onClick?: () => void
}) {
  return (
    <div
      className="glass-card"
      data-complete={complete ? 'true' : 'false'}
      style={{
        flex: '1 1 0',
        minWidth: 0,
        padding: '1rem',
        cursor: 'pointer',
      }}
      onClick={onClick}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <div>
          <div style={{ color: 'var(--color-text-heading)', fontWeight: 600 }}>{title}</div>
          {subtitle && <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>{subtitle}</div>}
        </div>
        {complete && (
          <div aria-label="card complete" style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-secondary), #a7ead1)', color: 'var(--color-background)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>✓</div>
        )}
      </div>
      {bullets && bullets.length > 0 && (
        <ul style={{ marginLeft: '1rem', lineHeight: 1.5, opacity: 0.9 }}>
          {bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Field({ label, placeholder, value, onChange }: {
  label: string
  placeholder?: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{ fontSize: '0.9rem', marginBottom: '0.25rem', opacity: 0.9 }}>{label}</div>
      <textarea
        className="input-glass"
        style={{ minHeight: 140, resize: 'vertical' }}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
