'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createProject } from '../firebase'

export default function LandingPage() {
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)

  const handleStartProject = async () => {
    setIsCreating(true)
    try {
      // Create new project in Firestore
      const projectId = await createProject()

      // Redirect to the project workspace
      router.push(`/project/${projectId}`)
    } catch (error) {
      console.error('Error creating project:', error)
      alert('Failed to create project. Please try again.')
      setIsCreating(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div className="glass-panel" style={{
        padding: '4rem 3rem',
        textAlign: 'center',
        maxWidth: '600px',
        width: '100%'
      }}>
        {/* Main heading with gradient */}
        <h1 style={{ marginBottom: '1rem' }}>
          Catalyst Change Project
        </h1>

        <h2 style={{
          marginBottom: '2.5rem',
          fontWeight: 400,
          fontSize: '1.35rem'
        }}>
          Problem Incubator
        </h2>

        <p style={{
          marginBottom: '3rem',
          lineHeight: '1.6',
          fontSize: '1.05rem',
          color: 'var(--color-text-primary)'
        }}>
          Discover and define problems that matter to you.
          Our AI mentor will guide you through exploring your passions
          and crafting clear, actionable problem statements.
        </p>

        {/* Start button */}
        <button
          onClick={handleStartProject}
          disabled={isCreating}
          className="btn btn-primary"
          style={{
            fontSize: '1.15rem',
            padding: '1.125rem 3rem',
            minWidth: '240px'
          }}
        >
          {isCreating ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center' }}>
              <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
              Creating...
            </span>
          ) : (
            'Start a new project'
          )}
        </button>

        {/* Subtle info text */}
        <p style={{
          marginTop: '2rem',
          fontSize: '0.9rem',
          color: 'rgba(224, 224, 224, 0.6)',
          fontStyle: 'italic'
        }}>
          Your progress is automatically saved as you work
        </p>
      </div>
    </div>
  )
}
