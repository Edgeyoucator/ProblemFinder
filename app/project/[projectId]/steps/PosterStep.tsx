'use client'

import { useEffect, useState, useRef } from 'react'
import { subscribeToProject, updateProject } from '../../../../firebase'
import { useDebounce } from '../../../hooks/useDebounce'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

interface StepProps {
  projectId?: string
  project?: any
  onZoneFocusChange?: (isFocused: boolean) => void
}

interface PosterData {
  teamName: string
  imageUrl: string
  nextSteps: string
  selectedStakeholders: string[]
  customHeaders: Record<string, string>
  hasExported: boolean
  hasEdited: boolean
}

const EMPTY_POSTER: PosterData = {
  teamName: '',
  imageUrl: '',
  nextSteps: '',
  selectedStakeholders: [],
  customHeaders: {},
  hasExported: false,
  hasEdited: false,
}

export default function PosterStep({ projectId, project: initialProject, onZoneFocusChange }: StepProps) {
  const [project, setProject] = useState<any>(initialProject || null)
  const [posterData, setPosterData] = useState<PosterData>(initialProject?.poster || EMPTY_POSTER)
  const [isExporting, setIsExporting] = useState(false)
  const [showStakeholderSelector, setShowStakeholderSelector] = useState(false)
  const [contentHeight, setContentHeight] = useState(0)
  const posterRef = useRef<HTMLDivElement>(null)

  const actualProjectId = projectId || initialProject?.id

  // Subscribe to project updates
  useEffect(() => {
    if (!actualProjectId) return
    const unsub = subscribeToProject(actualProjectId, (p) => {
      setProject(p)
      if (p?.poster) setPosterData(p.poster)
    })
    return () => { if (unsub) unsub() }
  }, [actualProjectId])

  // Debounced autosave
  const debounced = useDebounce(posterData, 800)
  useEffect(() => {
    if (!actualProjectId || !posterData.hasEdited) return
    updateProject(actualProjectId, { poster: debounced })
      .catch((e) => console.error('Poster save failed:', e))
  }, [debounced, actualProjectId, posterData.hasEdited])

  // Measure content height
  useEffect(() => {
    if (!posterRef.current) return
    const measureHeight = () => {
      const height = posterRef.current?.scrollHeight || 0
      setContentHeight(height)
    }
    measureHeight()
    // Re-measure when data changes
    const timer = setTimeout(measureHeight, 100)
    return () => clearTimeout(timer)
  }, [posterData, project, showStakeholderSelector])

  // Extract data from previous steps
  const solutionTitle = project?.coFounderLab?.proposedSolution?.title || 'Our Solution'
  const solutionDescription = project?.coFounderLab?.proposedSolution?.description ||
                              project?.coFounderLab?.lockedVariant ||
                              'No solution defined yet'
  const solutionDetails = project?.coFounderLab?.proposedSolution || {}

  const problemStatement = project?.problemStatement || {}
  const exploration = project?.problemExploration || {}
  const decision = project?.decision || {}
  const evaluation = project?.evaluateIt || {}
  const measureIt = project?.measureIt || {}
  const stakeholdersData = project?.stakeholders?.nodes || {}

  // Get measurement method name
  const measurementMethods: Record<string, string> = {
    surveys: 'Surveys',
    interviews: 'Interviews',
    observations: 'Observations',
    beforeAfter: 'Before/After Comparison',
    abTest: 'A/B Testing',
    analytics: 'Analytics & Data',
    pilotRun: 'Pilot Run',
    usability: 'Usability Testing',
    feedbackForms: 'Feedback Forms',
  }
  const selectedMethod = measureIt.selectedMethod
  const methodName = selectedMethod ? measurementMethods[selectedMethod] : 'Not selected'
  const methodAnswers = selectedMethod ? measureIt.methods?.[selectedMethod]?.answers || {} : {}

  // Get available stakeholder nodes
  const availableStakeholders = Object.entries(stakeholdersData)
    .filter(([_, data]: [string, any]) => data?.planned)
    .map(([id, data]: [string, any]) => ({
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1),
      answers: data.answers
    }))

  // Handle field updates
  const updateField = (field: keyof PosterData, value: any) => {
    setPosterData(prev => ({ ...prev, [field]: value, hasEdited: true }))
  }

  // Toggle stakeholder selection
  const toggleStakeholder = (id: string) => {
    const current = posterData.selectedStakeholders
    let updated: string[]

    if (current.includes(id)) {
      updated = current.filter(s => s !== id)
    } else if (current.length < 3) {
      updated = [...current, id]
    } else {
      // Replace the first one if already at 3
      updated = [...current.slice(1), id]
    }

    updateField('selectedStakeholders', updated)
  }

  // Export to PDF
  const exportToPDF = async () => {
    if (!posterRef.current) return

    setIsExporting(true)
    try {
      const element = posterRef.current
      const actualHeight = element.scrollHeight
      const targetHeight = 1000
      const needsScaling = actualHeight > targetHeight
      const scaleFactor = needsScaling ? targetHeight / actualHeight : 1

      console.log(`Content height: ${actualHeight}px, Needs scaling: ${needsScaling}, Scale factor: ${scaleFactor}`)

      // Capture as canvas with smart scaling
      const canvas = await html2canvas(element, {
        scale: 2 * scaleFactor,
        backgroundColor: '#162237',
        logging: false,
        height: actualHeight,
        windowHeight: actualHeight,
      })

      // Convert to PDF (A2 Landscape dimensions: 594mm × 420mm)
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a2',
      })

      const imgData = canvas.toDataURL('image/png')
      pdf.addImage(imgData, 'PNG', 0, 0, 594, 420)

      // Download
      const filename = posterData.teamName
        ? `${posterData.teamName.replace(/[^a-z0-9]/gi, '-')}-poster.pdf`
        : 'project-poster.pdf'
      pdf.save(filename)

      // Mark as exported
      updateField('hasExported', true)
    } catch (error) {
      console.error('PDF export failed:', error)
      alert('Failed to export PDF. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  // Get selected stakeholder details
  const selectedStakeholderDetails = posterData.selectedStakeholders
    .map(id => availableStakeholders.find(s => s.id === id))
    .filter(Boolean)

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#162237',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      overflow: 'auto',
      position: 'relative',
    }}>
      {/* Background blobs */}
      <div className="liquid-bg">
        <div className="liquid-blob orange" style={{ top: '-10%', left: '-10%', width: '60%', height: '60%' }} />
        <div className="liquid-blob green" style={{ top: '-15%', right: '-10%', width: '60%', height: '60%' }} />
      </div>

      {/* Export Button (floating) */}
      <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
        <button
          onClick={exportToPDF}
          disabled={isExporting}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'linear-gradient(135deg, var(--color-accent), #d94d1a)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: isExporting ? 'wait' : 'pointer',
            boxShadow: '0 4px 12px rgba(241, 95, 36, 0.3)',
          }}
        >
          {isExporting ? 'Exporting...' : '📄 Export to PDF'}
        </button>
        {contentHeight > 1000 && (
          <div style={{
            padding: '0.5rem 1rem',
            background: 'rgba(134, 218, 189, 0.2)',
            border: '1px solid #86dabd',
            borderRadius: '6px',
            fontSize: '0.85rem',
            color: '#86dabd',
            textAlign: 'center',
            backdropFilter: 'blur(10px)',
          }}>
            📏 Content will scale to fit A2<br/>
            <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>({contentHeight}px → 1000px)</span>
          </div>
        )}
      </div>

      {/* A2 Poster Container (594:420 ratio - Landscape) */}
      <div
        ref={posterRef}
        style={{
          width: '1414px',
          height: '1000px',
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          position: 'relative',
          overflow: 'auto',
        }}
      >
        {/* Header Section */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid rgba(241, 95, 36, 0.3)', paddingBottom: '1rem' }}>
          {posterData.imageUrl && (
            <img
              src={posterData.imageUrl}
              alt="Project Logo"
              style={{
                maxWidth: '100px',
                maxHeight: '100px',
                marginBottom: '0.75rem',
                borderRadius: '8px',
              }}
            />
          )}
          <input
            type="text"
            placeholder="Team Name"
            value={posterData.teamName}
            onChange={(e) => updateField('teamName', e.target.value)}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              borderBottom: '2px solid rgba(241, 95, 36, 0.5)',
              color: '#f15f24',
              fontSize: '2rem',
              fontWeight: 700,
              textAlign: 'center',
              padding: '0.4rem',
              outline: 'none',
            }}
          />
          <input
            type="text"
            placeholder="https://your-logo-url.com/image.png"
            value={posterData.imageUrl}
            onChange={(e) => updateField('imageUrl', e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '0.85rem',
              padding: '0.5rem',
              marginTop: '0.5rem',
              outline: 'none',
            }}
          />
        </div>

        {/* Problem Section */}
        <div style={{ flex: '0 0 auto' }}>
          <h2 style={{ color: '#f15f24', fontSize: '1.3rem', marginBottom: '0.5rem' }}>The Problem</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
            <div>
              <strong style={{ color: '#86dabd' }}>What:</strong>
              <p style={{ color: 'rgba(255, 255, 255, 0.9)', margin: '0.25rem 0 0 0' }}>
                {problemStatement.what?.answer || 'Not defined'}
              </p>
            </div>
            <div>
              <strong style={{ color: '#86dabd' }}>Who:</strong>
              <p style={{ color: 'rgba(255, 255, 255, 0.9)', margin: '0.25rem 0 0 0' }}>
                {problemStatement.who?.answer || 'Not defined'}
              </p>
            </div>
            <div>
              <strong style={{ color: '#86dabd' }}>Where:</strong>
              <p style={{ color: 'rgba(255, 255, 255, 0.9)', margin: '0.25rem 0 0 0' }}>
                {problemStatement.where?.answer || 'Not defined'}
              </p>
            </div>
            <div>
              <strong style={{ color: '#86dabd' }}>Why:</strong>
              <p style={{ color: 'rgba(255, 255, 255, 0.9)', margin: '0.25rem 0 0 0' }}>
                {problemStatement.why?.answer || 'Not defined'}
              </p>
            </div>
          </div>
        </div>

        {/* Exploration Insights */}
        <div style={{ flex: '0 0 auto' }}>
          <h2 style={{ color: '#f15f24', fontSize: '1.3rem', marginBottom: '0.5rem' }}>Key Insights</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
            <div>
              <strong style={{ color: '#86dabd' }}>Think Big:</strong>
              <ul style={{ margin: '0.25rem 0 0 1rem', padding: 0, color: 'rgba(255, 255, 255, 0.9)' }}>
                {exploration.thinkBig?.answers?.slice(0, 2).map((ans: string, i: number) => (
                  <li key={i}>{ans}</li>
                ))}
              </ul>
            </div>
            <div>
              <strong style={{ color: '#86dabd' }}>Think Small:</strong>
              <ul style={{ margin: '0.25rem 0 0 1rem', padding: 0, color: 'rgba(255, 255, 255, 0.9)' }}>
                {exploration.thinkSmall?.answers?.slice(0, 2).map((ans: string, i: number) => (
                  <li key={i}>{ans}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Solution Section */}
        <div style={{ flex: '0 0 auto', background: 'rgba(241, 95, 36, 0.1)', padding: '1rem', borderRadius: '8px', border: '2px solid rgba(241, 95, 36, 0.3)' }}>
          <h2 style={{ color: '#f15f24', fontSize: '1.6rem', marginBottom: '0.5rem' }}>{solutionTitle}</h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.85rem', lineHeight: '1.4', marginBottom: '0.75rem' }}>
            {solutionDescription}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
            <div>
              <strong style={{ color: '#86dabd' }}>Who It's For:</strong>
              <p style={{ color: 'rgba(255, 255, 255, 0.9)', margin: '0.25rem 0 0 0' }}>
                {solutionDetails.whoItsFor || 'Not specified'}
              </p>
            </div>
            <div>
              <strong style={{ color: '#86dabd' }}>How It Works:</strong>
              <p style={{ color: 'rgba(255, 255, 255, 0.9)', margin: '0.25rem 0 0 0' }}>
                {solutionDetails.howItWorks || 'Not specified'}
              </p>
            </div>
          </div>
        </div>

        {/* Decision Gates */}
        <div style={{ flex: '0 0 auto' }}>
          <h2 style={{ color: '#f15f24', fontSize: '1.3rem', marginBottom: '0.5rem' }}>Feasibility Check</h2>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.8rem' }}>
            <div style={{
              padding: '0.5rem 1rem',
              borderRadius: '20px',
              background: decision.possible?.answer === 'yes' ? 'rgba(134, 218, 189, 0.2)' : 'rgba(255, 255, 255, 0.1)',
              border: `1px solid ${decision.possible?.answer === 'yes' ? '#86dabd' : 'rgba(255, 255, 255, 0.2)'}`,
              color: 'rgba(255, 255, 255, 0.9)',
            }}>
              Is it possible? {decision.possible?.answer === 'yes' ? '✓ Yes' : decision.possible?.answer === 'no' ? '✗ No' : '? Not Sure'}
            </div>
            <div style={{
              padding: '0.5rem 1rem',
              borderRadius: '20px',
              background: decision.impact?.answer === 'yes' ? 'rgba(134, 218, 189, 0.2)' : 'rgba(255, 255, 255, 0.1)',
              border: `1px solid ${decision.impact?.answer === 'yes' ? '#86dabd' : 'rgba(255, 255, 255, 0.2)'}`,
              color: 'rgba(255, 255, 255, 0.9)',
            }}>
              Big impact? {decision.impact?.answer === 'yes' ? '✓ Yes' : '✗ No'}
            </div>
            <div style={{
              padding: '0.5rem 1rem',
              borderRadius: '20px',
              background: decision.originality?.answer === 'yes' ? 'rgba(134, 218, 189, 0.2)' : 'rgba(255, 255, 255, 0.1)',
              border: `1px solid ${decision.originality?.answer === 'yes' ? '#86dabd' : 'rgba(255, 255, 255, 0.2)'}`,
              color: 'rgba(255, 255, 255, 0.9)',
            }}>
              Original? {decision.originality?.answer === 'yes' ? '✓ Yes' : '✗ No/Not Sure'}
            </div>
          </div>
        </div>

        {/* Evaluation */}
        <div style={{ flex: '0 0 auto' }}>
          <h2 style={{ color: '#f15f24', fontSize: '1.3rem', marginBottom: '0.5rem' }}>Value & Risks</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
            <div>
              <strong style={{ color: '#86dabd' }}>Value Proposition:</strong>
              <p style={{ color: 'rgba(255, 255, 255, 0.9)', margin: '0.25rem 0 0 0' }}>
                {evaluation.worthIt?.value || 'Not defined'}
              </p>
            </div>
            <div>
              <strong style={{ color: '#86dabd' }}>Key Risk:</strong>
              <p style={{ color: 'rgba(255, 255, 255, 0.9)', margin: '0.25rem 0 0 0' }}>
                {evaluation.risks?.fragilePoint || 'Not defined'}
              </p>
            </div>
          </div>
        </div>

        {/* Measure It */}
        <div style={{ flex: '0 0 auto' }}>
          <h2 style={{ color: '#f15f24', fontSize: '1.3rem', marginBottom: '0.5rem' }}>Impact Measurement</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <div style={{
              padding: '0.4rem 1rem',
              borderRadius: '20px',
              background: 'rgba(134, 218, 189, 0.2)',
              border: '1px solid #86dabd',
              color: '#86dabd',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}>
              Method: {methodName}
            </div>
          </div>
          {Object.keys(methodAnswers).length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
              {Object.entries(methodAnswers).slice(0, 2).map(([key, value]: [string, any], index) => (
                <div key={key}>
                  <strong style={{ color: '#86dabd' }}>Metric {index + 1}:</strong>
                  <p style={{ color: 'rgba(255, 255, 255, 0.9)', margin: '0.25rem 0 0 0' }}>
                    {value || 'Not defined'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stakeholders */}
        <div style={{ flex: '0 0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h2 style={{ color: '#f15f24', fontSize: '1.3rem', margin: 0 }}>Key Stakeholders</h2>
            <button
              onClick={() => setShowStakeholderSelector(!showStakeholderSelector)}
              style={{
                padding: '0.5rem 1rem',
                background: 'rgba(134, 218, 189, 0.2)',
                border: '1px solid #86dabd',
                borderRadius: '6px',
                color: '#86dabd',
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              {showStakeholderSelector ? 'Close' : 'Select 3'}
            </button>
          </div>

          {showStakeholderSelector && (
            <div style={{
              marginBottom: '1rem',
              padding: '1rem',
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '8px',
              display: 'flex',
              gap: '0.5rem',
              flexWrap: 'wrap',
            }}>
              {availableStakeholders.map((stakeholder) => (
                <button
                  key={stakeholder.id}
                  onClick={() => toggleStakeholder(stakeholder.id)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: posterData.selectedStakeholders.includes(stakeholder.id)
                      ? 'rgba(134, 218, 189, 0.3)'
                      : 'rgba(255, 255, 255, 0.1)',
                    border: `2px solid ${posterData.selectedStakeholders.includes(stakeholder.id) ? '#86dabd' : 'rgba(255, 255, 255, 0.2)'}`,
                    borderRadius: '6px',
                    color: 'rgba(255, 255, 255, 0.9)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  {stakeholder.name}
                </button>
              ))}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', fontSize: '0.8rem' }}>
            {selectedStakeholderDetails.slice(0, 3).map((stakeholder: any) => (
              <div key={stakeholder.id} style={{
                background: 'rgba(134, 218, 189, 0.1)',
                padding: '0.6rem',
                borderRadius: '6px',
                border: '1px solid rgba(134, 218, 189, 0.3)',
              }}>
                <strong style={{ color: '#86dabd' }}>{stakeholder.name}</strong>
                <p style={{ color: 'rgba(255, 255, 255, 0.9)', margin: '0.2rem 0 0 0', fontSize: '0.75rem' }}>
                  {stakeholder.answers?.name || 'No name provided'}
                </p>
              </div>
            ))}
            {posterData.selectedStakeholders.length === 0 && (
              <p style={{ color: 'rgba(255, 255, 255, 0.6)', gridColumn: '1 / -1', textAlign: 'center' }}>
                Click "Select 3" to choose key stakeholders
              </p>
            )}
          </div>
        </div>

        {/* Next Steps */}
        <div style={{ flex: '1 1 auto' }}>
          <h2 style={{ color: '#f15f24', fontSize: '1.3rem', marginBottom: '0.5rem' }}>Next Steps</h2>
          <textarea
            placeholder="What are the next steps for this project? (e.g., build a prototype, conduct user testing, secure funding...)"
            value={posterData.nextSteps}
            onChange={(e) => updateField('nextSteps', e.target.value)}
            style={{
              width: '100%',
              minHeight: '80px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '0.85rem',
              padding: '0.75rem',
              outline: 'none',
              resize: 'vertical',
              lineHeight: '1.5',
            }}
          />
        </div>

        {/* Footer */}
        <div style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.2)',
          paddingTop: '1rem',
          textAlign: 'center',
          fontSize: '0.75rem',
          color: 'rgba(255, 255, 255, 0.5)',
        }}>
          Powered by Catalyst Change Project
        </div>
      </div>

      {/* Instructions */}
      <p style={{
        marginTop: '1.5rem',
        color: 'rgba(255, 255, 255, 0.7)',
        textAlign: 'center',
        fontSize: '0.9rem',
      }}>
        Click fields to edit • Select 3 key stakeholders • Export when ready
      </p>
    </div>
  )
}
