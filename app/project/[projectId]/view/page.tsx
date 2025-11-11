'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { subscribeToProject } from '../../../../firebase'

interface ProjectData {
  id: string
  passionTopic: string | null
  problemMap: Array<{ statement: string; timestamp: number }>
  chosenProblem: string | null
  currentStep: string
  updatedAt: any
  createdAt: any
}

export default function ProjectViewPage() {
  const params = useParams()
  const projectId = params.projectId as string

  const [project, setProject] = useState<ProjectData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Subscribe to project updates in real-time
    const unsubscribe = subscribeToProject(projectId, (data) => {
      if (!data) {
        setProject(null)
      } else {
        setProject(data as ProjectData)
      }
      setLoading(false)
    })

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [projectId])

  // Format timestamp for display
  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'N/A'

    let date: Date

    // Handle Firestore Timestamp objects
    if (timestamp?.toDate) {
      date = timestamp.toDate()
    } else if (timestamp?.seconds) {
      date = new Date(timestamp.seconds * 1000)
    } else if (typeof timestamp === 'number') {
      date = new Date(timestamp)
    } else {
      return 'N/A'
    }

    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner"></div>
      </div>
    )
  }

  if (!project) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <h2>Project Not Found</h2>
          <p style={{ marginTop: '1rem', color: 'var(--color-text-primary)' }}>
            The project you're looking for doesn't exist.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', padding: '2rem' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                Problem Incubator View
              </h1>
              <p style={{ color: 'var(--color-text-primary)', fontSize: '0.95rem', opacity: 0.8 }}>
                Read-only live view
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.85rem', color: 'rgba(224, 224, 224, 0.6)', marginBottom: '0.25rem' }}>
                Last updated
              </div>
              <div style={{ fontSize: '0.95rem', color: 'var(--color-secondary)', fontWeight: 500 }}>
                {formatTimestamp(project.updatedAt)}
              </div>
            </div>
          </div>

          {/* Live indicator */}
          <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--color-secondary)',
              boxShadow: '0 0 10px var(--color-secondary)',
              animation: 'pulse 2s ease-in-out infinite'
            }}></div>
            <span style={{ fontSize: '0.9rem', color: 'var(--color-secondary)' }}>
              Live updates enabled
            </span>
          </div>
        </div>

        {/* Passion Topic */}
        <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>Passion Topic</h2>
          {project.passionTopic ? (
            <div style={{
              padding: '1.5rem',
              background: 'rgba(241, 95, 36, 0.1)',
              border: '1px solid rgba(241, 95, 36, 0.3)',
              borderRadius: '1rem',
              fontSize: '1.15rem',
              fontWeight: 500,
              color: 'var(--color-accent)'
            }}>
              {project.passionTopic}
            </div>
          ) : (
            <p style={{ color: 'rgba(224, 224, 224, 0.5)', fontStyle: 'italic' }}>
              Not yet defined
            </p>
          )}
        </div>

        {/* Problem Map */}
        <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>
            Problem Map
            {project.problemMap && project.problemMap.length > 0 && (
              <span style={{
                marginLeft: '0.75rem',
                fontSize: '0.9rem',
                color: 'var(--color-secondary)',
                fontWeight: 400
              }}>
                ({project.problemMap.length} statement{project.problemMap.length !== 1 ? 's' : ''})
              </span>
            )}
          </h2>

          {project.problemMap && project.problemMap.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {project.problemMap.map((problem, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '1.5rem',
                    background: 'rgba(134, 218, 189, 0.08)',
                    border: '1px solid rgba(134, 218, 189, 0.25)',
                    borderRadius: '1rem',
                    position: 'relative'
                  }}
                >
                  <div style={{
                    fontSize: '0.8rem',
                    color: 'var(--color-secondary)',
                    marginBottom: '0.75rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Problem Statement {idx + 1}
                  </div>

                  <p style={{
                    fontSize: '1.05rem',
                    lineHeight: '1.6',
                    color: 'var(--color-text-primary)',
                    marginBottom: '0.75rem'
                  }}>
                    {problem.statement}
                  </p>

                  {/* Show if this is the chosen problem */}
                  {project.chosenProblem === problem.statement && (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 1rem',
                      background: 'rgba(241, 95, 36, 0.15)',
                      border: '1px solid rgba(241, 95, 36, 0.3)',
                      borderRadius: '0.75rem',
                      fontSize: '0.85rem',
                      color: 'var(--color-accent)',
                      fontWeight: 600
                    }}>
                      <span>✓</span>
                      <span>Selected for project</span>
                    </div>
                  )}

                  {/* Timestamp */}
                  <div style={{
                    fontSize: '0.8rem',
                    color: 'rgba(224, 224, 224, 0.5)',
                    marginTop: '0.75rem'
                  }}>
                    Added: {formatTimestamp(problem.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'rgba(224, 224, 224, 0.5)', fontStyle: 'italic' }}>
              No problem statements yet
            </p>
          )}
        </div>

        {/* Chosen Problem (if set) */}
        {project.chosenProblem && (
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>Final Problem Choice</h2>
            <div style={{
              padding: '1.5rem',
              background: 'rgba(241, 95, 36, 0.12)',
              border: '2px solid rgba(241, 95, 36, 0.4)',
              borderRadius: '1rem',
              fontSize: '1.1rem',
              lineHeight: '1.6',
              color: 'var(--color-text-primary)'
            }}>
              {project.chosenProblem}
            </div>
            <p style={{
              marginTop: '1rem',
              fontSize: '0.9rem',
              color: 'var(--color-secondary)',
              fontStyle: 'italic'
            }}>
              The student has chosen to move forward with this problem.
            </p>
          </div>
        )}

        {/* Footer info */}
        <div style={{
          marginTop: '3rem',
          textAlign: 'center',
          fontSize: '0.85rem',
          color: 'rgba(224, 224, 224, 0.5)'
        }}>
          This page updates automatically as the student works.
          <br />
          Project ID: <code style={{ color: 'var(--color-secondary)' }}>{projectId}</code>
        </div>
      </div>

      {/* CSS for pulse animation */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  )
}
