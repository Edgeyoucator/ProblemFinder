'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { subscribeToProject, updateProject } from '../../../../firebase'
import { useDebounce } from '../../../hooks/useDebounce'
import { isValidResponse } from '../../../utils/validation'

type NodeId =
  | 'influencers'
  | 'media'
  | 'government'
  | 'experts'
  | 'financial'
  | 'community'
  | 'suppliers'
  | 'beneficiaries'

interface StakeholderAnswers {
  name?: string
  contactMethod?: string
  introductionMessage?: string
  involvement?: string
  appeal?: string
}

interface StakeholderNodeState {
  planned?: boolean
  answers: StakeholderAnswers
  groups?: Record<string, string>
}

interface StakeholdersState {
  nodes: Record<NodeId, StakeholderNodeState>
}

interface StepProps {
  projectId?: string
  project?: any
  onZoneFocusChange?: (isFocused: boolean) => void
}

interface NodeConfig {
  id: NodeId
  title: string
  blurb: string
  // Orbital offsets from center for desktop (no dynamic math)
  dx: string // e.g., '0px', '220px', '-220px'
  dy: string // e.g., '-220px', '140px'
  accent: string
  accentSoft: string
}

const NODE_CONFIGS: NodeConfig[] = [
  // Top-center
  { id: 'influencers', title: 'Influencers', blurb: 'Local influencers and social media influencers who can amplify your message.', dx: '0vmin', dy: '-34vmin', accent: '#f15f24', accentSoft: 'rgba(241,95,36,0.22)' },
  // Top-right
  { id: 'media', title: 'Media', blurb: 'Journalists, reporters, bloggers, and content creators.', dx: '26vmin', dy: '-20vmin', accent: '#00c2ff', accentSoft: 'rgba(0,194,255,0.22)' },
  // Right-center
  { id: 'government', title: 'Government Officials', blurb: 'Regulatory authorities and policy makers.', dx: '36vmin', dy: '0vmin', accent: '#a29bfe', accentSoft: 'rgba(162,155,254,0.22)' },
  // Bottom-right
  { id: 'experts', title: 'Industry Experts', blurb: 'Consultants, academics, and professional associations.', dx: '26vmin', dy: '20vmin', accent: '#1abc9c', accentSoft: 'rgba(26,188,156,0.22)' },
  // Bottom-center
  { id: 'financial', title: 'Financial Stakeholders', blurb: 'Investors, donors, banks, and other funders.', dx: '0vmin', dy: '34vmin', accent: '#86dabd', accentSoft: 'rgba(134,218,189,0.22)' },
  // Bottom-left
  { id: 'community', title: 'Community & Special Interest Groups', blurb: 'Environmental and civic organisations connected to your issue.', dx: '-26vmin', dy: '20vmin', accent: '#ff6b6b', accentSoft: 'rgba(255,107,107,0.22)' },
  // Left-center
  { id: 'suppliers', title: 'Suppliers & Partners', blurb: 'Vendors, suppliers, and strategic partners.', dx: '-36vmin', dy: '0vmin', accent: '#ff9f1c', accentSoft: 'rgba(255,159,28,0.22)' },
  // Top-left
  { id: 'beneficiaries', title: 'Beneficiaries', blurb: 'Direct and indirect beneficiaries of your project.', dx: '-26vmin', dy: '-20vmin', accent: '#5c7cfa', accentSoft: 'rgba(92,124,250,0.22)' },
]

// Exact subgroup copy from stakeholder.md
const GROUP_DEFS: Record<NodeId, Array<{ key: string; title: string; description: string }>> = {
  influencers: [
    { key: 'local', title: 'Local Influencers', description: 'Community leaders, local celebrities, or respected figures who can sway public opinion.' },
    { key: 'social', title: 'Social Media Influencers', description: 'Individuals with significant followings who can amplify the project’s message.' },
  ],
  media: [
    { key: 'journalists', title: 'Journalists & Reporters', description: 'Local or school media interested in stories with community impact.' },
    { key: 'bloggers', title: 'Bloggers & Content Creators', description: 'Writers or vloggers who cover relevant topics.' },
  ],
  government: [
    { key: 'regulators', title: 'Regulatory Authorities', description: 'Officials who can grant permissions or ensure compliance.' },
    { key: 'policymakers', title: 'Policy Makers', description: 'Elected representatives or civil servants who can influence related issues.' },
  ],
  experts: [
    { key: 'consultants', title: 'Consultants & Academics', description: 'Specialists who can lend credibility or technical advice.' },
    { key: 'associations', title: 'Professional Associations', description: 'Organizations representing relevant professions or industries.' },
  ],
  financial: [
    { key: 'investors', title: 'Investors & Donors', description: 'Individuals or institutions who could fund the project.' },
    { key: 'banks', title: 'Banks & Financial Institutions', description: 'Possible sources of small grants or financial advice.' },
  ],
  community: [
    { key: 'environmental', title: 'Environmental Groups', description: 'Potential supporters or watchdogs if your project affects the environment.' },
    { key: 'civic', title: 'Civic Organizations', description: 'Local or national groups involved in community improvement.' },
  ],
  suppliers: [
    { key: 'vendors', title: 'Vendors & Suppliers', description: 'Companies providing materials or services.' },
    { key: 'partners', title: 'Strategic Partners', description: 'Organizations that can collaborate directly.' },
  ],
  beneficiaries: [
    { key: 'direct', title: 'Direct Beneficiaries', description: 'The people who directly receive the project’s benefit.' },
    { key: 'indirect', title: 'Indirect Beneficiaries', description: 'Wider community or secondary audiences.' },
  ],
}

const EMPTY_STAKEHOLDERS: StakeholdersState = {
  nodes: {
    influencers: { planned: false, answers: {} },
    media: { planned: false, answers: {} },
    government: { planned: false, answers: {} },
    experts: { planned: false, answers: {} },
    financial: { planned: false, answers: {} },
    community: { planned: false, answers: {} },
    suppliers: { planned: false, answers: {} },
    beneficiaries: { planned: false, answers: {} },
  },
}

export default function StakeholderMapStep({ projectId, project: initialProject, onZoneFocusChange }: StepProps) {
  const [project, setProject] = useState<any>(initialProject || null)
  const [stakeholders, setStakeholders] = useState<StakeholdersState>(initialProject?.stakeholders || EMPTY_STAKEHOLDERS)
  const [focusedNode, setFocusedNode] = useState<NodeId | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const hasInitialized = useRef(false)

  const actualProjectId = projectId || initialProject?.id

  // Subscribe
  useEffect(() => {
    if (!actualProjectId) return
    const unsub = subscribeToProject(actualProjectId, (p) => {
      setProject(p)

      // Only update stakeholders state on initial load, not on every Firestore update
      if (!hasInitialized.current) {
        if (p?.stakeholders) {
          // Merge with EMPTY_STAKEHOLDERS to ensure all nodes exist
          const merged = { ...EMPTY_STAKEHOLDERS }
          if (p.stakeholders.nodes) {
            Object.keys(merged.nodes).forEach((nodeId) => {
              if (p.stakeholders.nodes[nodeId]) {
                merged.nodes[nodeId as NodeId] = {
                  ...EMPTY_STAKEHOLDERS.nodes[nodeId as NodeId],
                  ...p.stakeholders.nodes[nodeId]
                }
              }
            })
          }
          setStakeholders(merged)
          hasInitialized.current = true
        } else {
          // Initialize stakeholders if it doesn't exist
          console.log('[StakeholderMap] No stakeholders data found, initializing...')
          updateProject(actualProjectId, { stakeholders: EMPTY_STAKEHOLDERS })
            .then(() => {
              console.log('[StakeholderMap] Initialized stakeholders')
              hasInitialized.current = true
            })
            .catch((e) => console.error('[StakeholderMap] Failed to initialize:', e))
        }
      }
    })
    return () => { if (unsub) unsub() }
  }, [actualProjectId])

  // Debounced autosave
  const debounced = useDebounce(stakeholders, 800)
  useEffect(() => {
    if (!actualProjectId) return
    console.log('[StakeholderMap] Saving stakeholders...', debounced)
    updateProject(actualProjectId, { stakeholders: debounced })
      .then(() => console.log('[StakeholderMap] Save successful'))
      .catch((e) => {
        console.error('[StakeholderMap] Save failed:', e)
        alert('Failed to save stakeholders. Check console for details.')
      })
  }, [debounced, actualProjectId])

  useEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [])

  useEffect(() => {
    const sync = () => setIsMobile(window.innerWidth < 820)
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])

  useEffect(() => {
    onZoneFocusChange?.(focusedNode !== null)
  }, [focusedNode, onZoneFocusChange])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && focusedNode) setFocusedNode(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focusedNode])

  const isNodeComplete = (id: NodeId): boolean => {
    const a = stakeholders.nodes[id]?.answers || {}
    return (
      isValidResponse(a.name || '', 3) &&
      isValidResponse(a.contactMethod || '', 3) &&
      isValidResponse(a.introductionMessage || '', 3) &&
      isValidResponse(a.involvement || '', 3) &&
      isValidResponse(a.appeal || '', 3)
    )
  }

  const anyComplete = useMemo(() => (Object.keys(stakeholders.nodes) as NodeId[]).some((id) => isNodeComplete(id)), [stakeholders])

  const centerX = '50%'
  const centerY = '50%'

  const solutionTitle = project?.coFounderLab?.proposedSolution?.title || 'Your Project'
  const solutionSummary = project?.coFounderLab?.proposedSolution?.description || project?.coFounderLab?.lockedVariant || ''

  const updateAnswer = (nodeId: NodeId, key: keyof StakeholderAnswers, value: string) => {
    setStakeholders((prev) => ({
      ...prev,
      nodes: {
        ...prev.nodes,
        [nodeId]: { ...prev.nodes[nodeId], answers: { ...prev.nodes[nodeId]?.answers, [key]: value } },
      },
    }))
  }

  const togglePlanned = (nodeId: NodeId, planned: boolean) => {
    setStakeholders((prev) => ({
      ...prev,
      nodes: { ...prev.nodes, [nodeId]: { ...prev.nodes[nodeId], planned } },
    }))
  }

  const updateGroupField = (nodeId: NodeId, groupKey: string, value: string) => {
    setStakeholders((prev) => ({
      ...prev,
      nodes: {
        ...prev.nodes,
        [nodeId]: {
          ...prev.nodes[nodeId],
          groups: { ...(prev.nodes[nodeId]?.groups || {}), [groupKey]: value },
        },
      },
    }))
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#162237', position: 'relative', overflow: 'hidden' }}>
      {/* Liquid background */}
      <div className="liquid-bg">
        <div className="liquid-blob orange" style={{ top: '-10%', left: '-10%', width: '60%', height: '60%' }} />
        <div className="liquid-blob green" style={{ top: '-15%', right: '-10%', width: '60%', height: '60%' }} />
      </div>

      {/* Banner when at least one node complete */}
      {anyComplete && (
        <div className="glass-card" style={{ position: 'absolute', top: '1rem', left: '50%', transform: 'translateX(-50%)', padding: '0.5rem 1rem', borderColor: 'rgba(134,218,189,0.6)', boxShadow: '0 0 16px rgba(134,218,189,0.3)' }}>
          <strong>Stakeholder identified</strong> — great start to collaboration!
        </div>
      )}

      {/* Center node */}
      <div className="glass-card" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 360, maxWidth: '48vmin', padding: '1rem', textAlign: 'center' }}>
        <div style={{ fontSize: '0.85rem', letterSpacing: '0.06em', opacity: 0.85, marginBottom: '0.25rem', color: 'var(--color-secondary)' }}>Chosen Direction</div>
        <h3 style={{ marginBottom: '0.25rem' }}>{solutionTitle}</h3>
        {solutionSummary && <p style={{ opacity: 0.9 }}>{solutionSummary}</p>}
      </div>

      {/* Orbital ring and anchors (no spaghetti lines) */}
      {!isMobile && (
        <>
          <div style={{ position: 'absolute', top: '50%', left: '50%', width: '68vmin', height: '68vmin', transform: 'translate(-50%, -50%)', borderRadius: '50%', border: '1px solid rgba(134,218,189,0.18)', boxShadow: 'inset 0 0 70px rgba(134,218,189,0.08)' }} />
          {/* Anchor dots */}
          {[
            { dx: '0vmin', dy: '-34vmin' },
            { dx: '36vmin', dy: '0vmin' },
            { dx: '0vmin', dy: '34vmin' },
            { dx: '-36vmin', dy: '0vmin' },
          ].map((p, i) => (
            <div key={i} style={{ position: 'absolute', top: '50%', left: '50%', width: 6, height: 6, borderRadius: '50%', background: 'rgba(134,218,189,0.5)', transform: `translate(-50%, -50%) translate(${p.dx}, ${p.dy})` }} />
          ))}
        </>
      )}

      {/* Nodes */}
      {!isMobile && NODE_CONFIGS.map((n) => {
        const complete = isNodeComplete(n.id)
        return (
          <div
            key={n.id}
            className="glass-card"
            data-complete={complete ? 'true' : 'false'}
            style={{
              position: 'absolute', top: '50%', left: '50%', width: 240, minHeight: 120, padding: '0.85rem', cursor: 'pointer',
              transform: `translate(-50%, -50%) translate(${n.dx}, ${n.dy})`, transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
              borderColor: n.accentSoft,
              background: `linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0) 60%),
                           radial-gradient(600px 220px at 0% -20%, ${n.accentSoft}, transparent 60%),
                           radial-gradient(700px 260px at 120% 0%, ${n.accentSoft}, transparent 60%),
                           var(--glass-bg)`,
            }}
            onClick={() => setFocusedNode(n.id)}
            onMouseEnter={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.transform = `translate(-50%, -50%) translate(${n.dx}, ${n.dy}) scale(1.02)`; el.style.boxShadow = `0 12px 40px rgba(0,0,0,0.45), 0 0 22px ${n.accentSoft}`; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = `translate(-50%, -50%) translate(${n.dx}, ${n.dy})`; (e.currentTarget as HTMLDivElement).style.boxShadow = ''; }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: 'var(--color-text-heading)', fontWeight: 600 }}>{n.title}</div>
                <div style={{ fontSize: '0.9rem', opacity: 0.88 }}>{n.blurb}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div title="accent" style={{ width: 10, height: 10, borderRadius: '50%', background: n.accent }} />
                {complete && (
                  <div aria-label="complete" style={{ width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-secondary), #a7ead1)', color: 'var(--color-background)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>✓</div>
                )}
              </div>
            </div>
          </div>
        )
      })}

      {/* Mobile layout: center then stacked grid of nodes */}
      {isMobile && (
        <div style={{ position: 'absolute', top: 'calc(50% + 120px)', left: '50%', transform: 'translateX(-50%)', width: '92vw', maxWidth: 1200 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem' }}>
            {NODE_CONFIGS.map((n) => {
              const complete = isNodeComplete(n.id)
              return (
                <div
                  key={n.id}
                  className="glass-card"
                  data-complete={complete ? 'true' : 'false'}
                  style={{ padding: '0.75rem', cursor: 'pointer', borderColor: n.accentSoft,
                    background: `linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0) 60%),
                                 radial-gradient(600px 220px at 0% -20%, ${n.accentSoft}, transparent 60%),
                                 radial-gradient(700px 260px at 120% 0%, ${n.accentSoft}, transparent 60%),
                                 var(--glass-bg)` }}
                  onClick={() => setFocusedNode(n.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ color: 'var(--color-text-heading)', fontWeight: 600 }}>{n.title}</div>
                      <div style={{ fontSize: '0.9rem', opacity: 0.88 }}>{n.blurb}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div title="accent" style={{ width: 10, height: 10, borderRadius: '50%', background: n.accent }} />
                      {complete && (
                        <div aria-label="complete" style={{ width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-secondary), #a7ead1)', color: 'var(--color-background)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>✓</div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Modal for focused node */}
      {isMounted && focusedNode && createPortal(
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(22,34,55,0.95)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.25s ease-out' }}
          onClick={() => setFocusedNode(null)}
        >
          <div className="glass-card" onClick={(e) => e.stopPropagation()} style={{ width: '92%', maxWidth: 1200, height: '80vh', display: 'flex', overflow: 'hidden', animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)' }}>
            <div style={{ flex: '1 1 60%', padding: '2rem', overflow: 'auto' }}>
              <h2 style={{ marginBottom: '0.5rem' }}>{NODE_CONFIGS.find(x => x.id === focusedNode)?.title}</h2>
              <p style={{ opacity: 0.85, marginBottom: '1rem' }}>{NODE_CONFIGS.find(x => x.id === focusedNode)?.blurb}</p>

              {/* Subgroup definitions and inputs (exact copy) */}
              {focusedNode && GROUP_DEFS[focusedNode].map((g) => (
                <div key={g.key} style={{ marginBottom: '1rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--color-text-heading)' }}>{g.title}</div>
                  <div style={{ opacity: 0.85, marginBottom: '0.5rem' }}>{g.description}</div>
                  <Field
                    label={`Add specific ${g.title.toLowerCase()} (names or organisations)`}
                    value={stakeholders.nodes[focusedNode]?.groups?.[g.key] || ''}
                    onChange={(v) => updateGroupField(focusedNode, g.key, v)}
                  />
                </div>
              ))}

              <Field label="Which stakeholder are you approaching?" value={stakeholders.nodes[focusedNode]?.answers.name || ''} onChange={(v) => updateAnswer(focusedNode, 'name', v)} />
              <Field label="How will you find their contact information and reach out?" value={stakeholders.nodes[focusedNode]?.answers.contactMethod || ''} onChange={(v) => updateAnswer(focusedNode, 'contactMethod', v)} />
              <Field label="What will you say to introduce yourself and your project?" value={stakeholders.nodes[focusedNode]?.answers.introductionMessage || ''} onChange={(v) => updateAnswer(focusedNode, 'introductionMessage', v)} />
              <Field label="What kind of involvement or support are you seeking?" value={stakeholders.nodes[focusedNode]?.answers.involvement || ''} onChange={(v) => updateAnswer(focusedNode, 'involvement', v)} />
              <Field label="How can you make it appealing for them to participate or help?" value={stakeholders.nodes[focusedNode]?.answers.appeal || ''} onChange={(v) => updateAnswer(focusedNode, 'appeal', v)} />

              <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="checkbox" checked={!!stakeholders.nodes[focusedNode]?.planned} onChange={(e) => togglePlanned(focusedNode, e.target.checked)} />
                  Mark as planned / contact ready
                </label>
              </div>

              <button onClick={() => setFocusedNode(null)} className="btn btn-secondary" style={{ marginTop: '1rem', width: '100%' }}>Close (ESC)</button>
            </div>
            <div style={{ flex: '1 1 40%', padding: '2rem', background: 'rgba(0,0,0,0.2)', borderLeft: '1px solid rgba(255,255,255,0.08)', overflow: 'auto' }}>
              <h3 style={{ marginBottom: '0.75rem', color: 'var(--color-secondary)' }}>Why stakeholders?</h3>
              <p style={{ opacity: 0.9, lineHeight: 1.6 }}>Real projects move faster with allies. Identifying even one real person to contact is a powerful step towards momentum.</p>
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

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{ fontSize: '0.95rem', marginBottom: '0.35rem', opacity: 0.9 }}>{label}</div>
      <textarea className="input-glass" style={{ minHeight: 140, resize: 'vertical' }} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}
