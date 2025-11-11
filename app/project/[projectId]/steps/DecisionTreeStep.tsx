'use client'

import { useEffect, useRef, useState } from 'react'
import { subscribeToProject, updateProject } from '../../../../firebase'

interface StepProps {
  projectId?: string
  project?: any
}

type Answer = 'yes' | 'no' | 'not_sure' | 'no_or_not_sure'

interface DecisionState {
  possible?: {
    answer?: 'yes' | 'not_sure' | 'no'
    resources?: string
    time?: string
    people?: string
    conditions?: string
    risky?: boolean
  }
  planetImpact?: {
    answer?: 'yes' | 'no'
  }
  impact?: {
    answer?: 'yes' | 'no'
    explanation?: string
  }
  originality?: {
    answer?: 'yes' | 'no_or_not_sure'
    differentiation?: string
  }
}

export default function DecisionTreeStep({ projectId, project: initialProject }: StepProps) {
  const [project, setProject] = useState<any>(initialProject || null)
  const [decision, setDecision] = useState<DecisionState>(initialProject?.decision || {})

  const actualProjectId = projectId || initialProject?.id

  useEffect(() => {
    if (!actualProjectId) return
    const unsub = subscribeToProject(actualProjectId, (p) => {
      setProject(p)
      if (p?.decision) setDecision(p.decision)
    })
    return () => { if (unsub) unsub() }
  }, [actualProjectId])

  const save = async (next: DecisionState) => {
    setDecision(next)
    if (actualProjectId) {
      await updateProject(actualProjectId, { decision: next })
    }
  }

  const gate1Complete = () => {
    const g = decision.possible
    if (!g || !g.answer) return false
    if (g.answer === 'yes') {
      return !!(g.resources && g.resources.trim().length > 2 && g.time && g.time.trim().length > 2 && g.people && g.people.trim().length > 1)
    }
    if (g.answer === 'not_sure') {
      return !!(g.conditions && g.conditions.trim().length > 3)
    }
    return false
  }

  const gate2Complete = () => decision.planetImpact?.answer === 'no'
  const gate2Blocked = decision.planetImpact?.answer === 'yes'

  const gate3Complete = () => decision.impact?.answer === 'yes' && !!(decision.impact?.explanation && decision.impact.explanation.trim().length > 5)
  const gate3Blocked = decision.impact?.answer === 'no'

  const gate4Complete = () => {
    const g = decision.originality
    if (!g || !g.answer) return false
    if (g.answer === 'no_or_not_sure') return true
    if (g.answer === 'yes') return !!(g.differentiation && g.differentiation.trim().length > 5)
    return false
  }

  const isComplete = gate1Complete() && !gate2Blocked && gate2Complete() && gate3Complete() && gate4Complete()

  const solutionTitle = project?.coFounderLab?.proposedSolution?.title || 'Locked Solution'
  const solutionSummary = project?.coFounderLab?.proposedSolution?.description || project?.coFounderLab?.lockedVariant || ''

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
      }}
    >
      {/* Solution Card */}
      <div className="glass-panel" style={{ maxWidth: '900px', width: '100%', padding: '1rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-text-heading)', marginBottom: '0.5rem' }}>{solutionTitle}</h2>
        <p style={{ color: 'var(--color-text-primary)', opacity: 0.9 }}>{solutionSummary}</p>
      </div>

      <div style={{ display: 'flex', width: '100%', alignItems: 'flex-start', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
        {/* Gate 1 column */}
        <div style={{ flex: '0 0 260px', width: '260px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <NodeGate
            title="Gate 1"
            question="Is this solution realistically possible for you to start within about a term or a year?"
            status={gate1Complete() ? 'complete' : decision.possible?.answer === 'no' ? 'blocked' : (decision.possible?.answer ? 'active' : 'active')}
          >
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Btn small active={decision.possible?.answer === 'yes'} onClick={() => save({ ...decision, possible: { ...(decision.possible || {}), answer: 'yes', risky: false } })}>Yes</Btn>
              <Btn small active={decision.possible?.answer === 'not_sure'} onClick={() => save({ ...decision, possible: { ...(decision.possible || {}), answer: 'not_sure', risky: true } })}>Not sure</Btn>
              <Btn small active={decision.possible?.answer === 'no'} onClick={() => save({ ...decision, possible: { ...(decision.possible || {}), answer: 'no', risky: false } })}>No</Btn>
            </div>
            {decision.possible?.answer === 'no' && (
              <div style={{ color: 'var(--color-accent)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                If this version isn’t possible, it’s not ready. You can go back to your idea bank and choose another idea, or adjust this solution in the previous step.
              </div>
            )}
          </NodeGate>
          {(decision.possible?.answer === 'yes') && (
            <>
              <InputsPanel show={true}>
                <ExpandingTextarea placeholder="Resources you'll need" value={decision.possible?.resources || ''} onChange={(v) => save({ ...decision, possible: { ...(decision.possible || {}), resources: v } })} />
              </InputsPanel>
              <InputsPanel show={true}>
                <ExpandingTextarea placeholder="Time needed" value={decision.possible?.time || ''} onChange={(v) => save({ ...decision, possible: { ...(decision.possible || {}), time: v } })} />
              </InputsPanel>
              <InputsPanel show={true}>
                <ExpandingTextarea placeholder="People needed" value={decision.possible?.people || ''} onChange={(v) => save({ ...decision, possible: { ...(decision.possible || {}), people: v } })} />
              </InputsPanel>
            </>
          )}
          {(decision.possible?.answer === 'not_sure') && (
            <InputsPanel show={true}>
              <ExpandingTextarea minRows={4} placeholder="What must be true to make this possible? (support, time, tools, permission)" value={decision.possible?.conditions || ''} onChange={(v) => save({ ...decision, possible: { ...(decision.possible || {}), conditions: v } })} />
            </InputsPanel>
          )}
        </div>

        {/* Gate 2 column */}
        <div style={{ flex: '0 0 260px', width: '260px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <NodeGate
            title="Gate 2"
            question="Would the negative impact on the planet be high?"
            status={!gate1Complete() ? 'locked' : gate2Blocked ? 'blocked' : gate2Complete() ? 'complete' : 'active'}
          >
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Btn small active={decision.planetImpact?.answer === 'no'} disabled={!gate1Complete()} onClick={() => save({ ...decision, planetImpact: { answer: 'no' } })}>No</Btn>
              <Btn small active={decision.planetImpact?.answer === 'yes'} disabled={!gate1Complete()} onClick={() => save({ ...decision, planetImpact: { answer: 'yes' } })}>Yes</Btn>
            </div>
            {gate2Blocked && (
              <div style={{ color: 'var(--color-accent)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                If your idea harms the planet, it’s not acceptable in this programme. You need to change it or choose a different solution.
              </div>
            )}
          </NodeGate>
        </div>

        {/* Gate 3 column */}
        <div style={{ flex: '0 0 260px', width: '260px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <NodeGate
            title="Gate 3"
            question="Would your solution make a real difference to this problem (even for one school, street, or group)?"
            status={!(gate1Complete() && gate2Complete()) ? 'locked' : gate3Blocked ? 'blocked' : gate3Complete() ? 'complete' : 'active'}
          >
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Btn small active={decision.impact?.answer === 'yes'} disabled={!(gate1Complete() && gate2Complete())} onClick={() => save({ ...decision, impact: { ...(decision.impact || {}), answer: 'yes' } })}>Yes</Btn>
              <Btn small active={decision.impact?.answer === 'no'} disabled={!(gate1Complete() && gate2Complete())} onClick={() => save({ ...decision, impact: { ...(decision.impact || {}), answer: 'no' } })}>No / Not really</Btn>
            </div>
            {gate3Blocked && (
              <div style={{ color: 'var(--color-accent)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                If it wouldn’t make a difference, it’s not the right solution yet. Rework it or choose a stronger idea.
              </div>
            )}
          </NodeGate>
          {decision.impact?.answer === 'yes' && (
            <InputsPanel show={true}>
              <ExpandingTextarea minRows={3} placeholder="Who would benefit? What might change because of your idea?" value={decision.impact?.explanation || ''} onChange={(v) => save({ ...decision, impact: { ...(decision.impact || {}), explanation: v } })} />
            </InputsPanel>
          )}
        </div>

        {/* Gate 4 column */}
        <div style={{ flex: '0 0 260px', width: '260px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <NodeGate
            title="Gate 4"
            question="Has something similar been done before?"
            status={!(gate1Complete() && gate2Complete() && gate3Complete()) ? 'locked' : gate4Complete() ? 'complete' : 'active'}
          >
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Btn small active={decision.originality?.answer === 'yes'} disabled={!(gate1Complete() && gate2Complete() && gate3Complete())} onClick={() => save({ ...decision, originality: { ...(decision.originality || {}), answer: 'yes' } })}>Yes</Btn>
              <Btn small active={decision.originality?.answer === 'no_or_not_sure'} disabled={!(gate1Complete() && gate2Complete() && gate3Complete())} onClick={() => save({ ...decision, originality: { ...(decision.originality || {}), answer: 'no_or_not_sure' } })}>No / Not sure</Btn>
            </div>
          </NodeGate>
          {decision.originality?.answer === 'yes' && (
            <InputsPanel show={true}>
              <ExpandingTextarea minRows={3} placeholder="How will your version stand out or improve on what's been done?" value={decision.originality?.differentiation || ''} onChange={(v) => save({ ...decision, originality: { ...(decision.originality || {}), differentiation: v } })} />
            </InputsPanel>
          )}
        </div>

        {/* Ready column */}
        <div style={{ flex: '0 0 260px', width: '260px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <NodeGate
            title="Ready to Test"
            question=""
            status={isComplete ? 'complete' : 'locked'}
          >
            {isComplete ? <div style={{ color: 'var(--color-secondary)' }}>Passed basic test</div> : <div style={{ opacity: 0.6 }}>Locked</div>}
          </NodeGate>
        </div>
      </div>

      {isComplete && (
        <div className="glass-panel" style={{ marginTop: '1rem', padding: '0.75rem 1rem', color: 'var(--color-text-primary)' }}>
          Your solution has passed the basic test. Next: measure and plan it.
        </div>
      )}
      {!isComplete && (gate2Blocked || gate3Blocked || decision.possible?.answer === 'no') && (
        <div className="glass-panel" style={{ marginTop: '1rem', padding: '0.75rem 1rem', color: 'var(--color-accent)' }}>
          One or more gates are blocking. Adjust your solution in the previous step to continue.
        </div>
      )}
    </div>
  )
}

function NodeGate({ title, question, status, children, style }: { title: string; question: string; status: 'locked' | 'active' | 'complete' | 'blocked'; children?: React.ReactNode; style?: React.CSSProperties }) {
  const isLocked = status === 'locked'
  const border = status === 'complete' ? '2px solid var(--color-secondary)' : status === 'blocked' ? '2px solid var(--color-accent)' : '1px solid var(--glass-border)'
  const bg = isLocked ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)'
  return (
    <div className="glass-panel" style={{ width: '100%', padding: '1rem', border, background: bg, position: 'relative', ...(style || {}) }}>
      {isLocked ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100px',
          color: 'rgba(255,255,255,0.6)',
          fontSize: '0.95rem',
        }}>
          Locked
        </div>
      ) : (
        <>
          <div style={{ color: 'var(--color-text-heading)', fontWeight: 600, marginBottom: '0.25rem' }}>{title}</div>
          {question && <div style={{ color: 'var(--color-text-primary)', fontSize: '0.95rem', marginBottom: '0.5rem' }}>{question}</div>}
          <div>{children}</div>
        </>
      )}
    </div>
  )
}

function Connector({ active, style }: { active: boolean; style?: React.CSSProperties }) {
  return <div style={{ width: '60px', height: '4px', borderRadius: '2px', background: active ? 'var(--color-secondary)' : 'rgba(255,255,255,0.2)', ...(style || {}) }} />
}

function Btn({ children, onClick, small, disabled, active }: { children: React.ReactNode; onClick?: () => void; small?: boolean; disabled?: boolean; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: small ? '0.4rem 0.6rem' : '0.6rem 1rem',
        background: active ? 'var(--color-secondary)' : 'transparent',
        color: active ? 'var(--color-background)' : 'var(--color-text-primary)',
        border: '1px solid var(--glass-border)',
        borderRadius: '0.5rem',
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  )
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%',
        padding: '0.6rem 0.75rem',
        borderRadius: '0.5rem',
        border: '1px solid var(--glass-border)',
        background: 'transparent',
        color: 'var(--color-text-primary)',
      }}
    />
  )
}

function ExpandingTextarea({ value, onChange, placeholder, minRows }: { value: string; onChange: (v: string) => void; placeholder?: string; minRows?: number }) {
  const ref = useRef<HTMLTextAreaElement | null>(null)
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
    if (ref.current) {
      ref.current.style.height = 'auto'
      ref.current.style.height = `${ref.current.scrollHeight}px`
    }
  }
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto'
      ref.current.style.height = `${ref.current.scrollHeight}px`
    }
  }, [value])
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      rows={minRows ?? 2}
      style={{
        width: '100%',
        padding: '0.6rem 0.75rem',
        borderRadius: '0.5rem',
        border: '1px solid var(--glass-border)',
        background: 'transparent',
        color: 'var(--color-text-primary)',
        resize: 'none',
        overflow: 'hidden',
        minHeight: minRows ? `${minRows * 24}px` : undefined,
      }}
    />
  )
}

function InputsPanel({ show, children }: { show: boolean; children?: React.ReactNode }) {
  if (!show) return <div />
  return (
    <div className="glass-panel" style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.06)' }}>
      {children}
    </div>
  )
}

