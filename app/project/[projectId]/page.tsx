'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { subscribeToProject, updateProject, ensureAuth } from '../../../firebase'

type Stage = 'passion' | 'domain' | 'issue' | 'statement' | 'next_action'

interface Message {
  role: 'mentor' | 'student'
  content: string
  timestamp: number
}

interface ButtonOption {
  id: string
  label: string
  type: 'domain' | 'issue' | 'action' | 'other'
}

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
    what: string
    who: string
    where: string
    why: string
  }
  updatedAt: any
}

export default function ProjectWorkspace() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string

  const [project, setProject] = useState<ProjectData | null>(null)
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])

  // State machine
  const [stage, setStage] = useState<Stage>('passion')
  const [passionInput, setPassionInput] = useState('')
  const [selectedDomain, setSelectedDomain] = useState<string>('')
  const [selectedIssues, setSelectedIssues] = useState<string[]>([])
  const [currentStatement, setCurrentStatement] = useState<string>('')

  // Track previous suggestions for regeneration
  const [previousDomains, setPreviousDomains] = useState<string[]>([])
  const [previousIssues, setPreviousIssues] = useState<string[]>([])

  // UI state
  const [buttons, setButtons] = useState<ButtonOption[]>([])
  const [showOtherInput, setShowOtherInput] = useState(false)
  const [otherInput, setOtherInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isCommitting, setIsCommitting] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    statement: string
  } | null>(null)

  const chatEndRef = useRef<HTMLDivElement>(null)
  const hasInitialized = useRef(false) // Track if we've already initialized

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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

          // Initialize based on saved data (only once!)
          if (!hasInitialized.current) {
            hasInitialized.current = true

            if (data.passionTopic) {
              const initialMsg: Message = {
                role: 'mentor',
                content: `Welcome back! You're working on ${data.passionTopic}. Let's continue exploring problems in this space.`,
                timestamp: Date.now(),
              }
              setMessages([initialMsg])
              setPassionInput(data.passionTopic)
              // Auto-load domains
              loadDomains(data.passionTopic, false)
            } else {
              const initialMsg: Message = {
                role: 'mentor',
                content: "Hi there! To start, please tell me about a topic you are passionate about. This can be anything from sports, politics, environment, maths, gaming, arts, or anything else that matters to you.",
                timestamp: Date.now(),
              }
              setMessages([initialMsg])
            }
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
      hasInitialized.current = false // Reset on unmount
    }
  }, [projectId])

  // Helper function to sanitize user input (remove newlines and extra spaces)
  const sanitizeInput = (input: string): string => {
    return input
      .trim()
      .replace(/\n/g, ' ')      // Replace newlines with spaces
      .replace(/\s+/g, ' ')      // Collapse multiple spaces into one
  }

  // Load domains from AI
  const loadDomains = async (topic: string, regenerate: boolean) => {
    setIsLoading(true)

    // Safeguard: use project.passionTopic as fallback if topic is empty
    const effectiveTopic = topic || project?.passionTopic || ''

    try {
      const response = await fetch('/api/mentor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: 'domain',
          passionTopic: effectiveTopic,
          regenerate,
          previousSuggestions: regenerate ? previousDomains : [],
        }),
      })

      const data = await response.json()

      // Track new domain suggestions (excluding action buttons)
      if (data.buttons && regenerate) {
        const newDomains = data.buttons
          .filter((btn: ButtonOption) => btn.type === 'domain')
          .map((btn: ButtonOption) => btn.label)
        setPreviousDomains(prev => [...prev, ...newDomains])
      } else if (data.buttons && !regenerate) {
        // Reset tracking for new passion topic
        const newDomains = data.buttons
          .filter((btn: ButtonOption) => btn.type === 'domain')
          .map((btn: ButtonOption) => btn.label)
        setPreviousDomains(newDomains)
      }

      // Add mentor message
      const mentorMsg: Message = {
        role: 'mentor',
        content: data.message,
        timestamp: Date.now(),
      }
      setMessages(prev => [...prev, mentorMsg])

      // Set buttons
      setButtons(data.buttons || [])
      setStage('domain')
    } catch (error) {
      console.error('Error loading domains:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Load issues from AI
  const loadIssues = async (domain: string, issues: string[], regenerate: boolean = false) => {
    setIsLoading(true)

    // Safeguard: use project.passionTopic as fallback if passionInput is empty
    const effectiveTopic = passionInput || project?.passionTopic || ''

    try {
      const response = await fetch('/api/mentor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: 'issue',
          passionTopic: effectiveTopic,
          selectedDomain: domain,
          selectedIssues: issues,
          regenerate,
          previousSuggestions: regenerate ? previousIssues : [],
        }),
      })

      const data = await response.json()

      // Check if we got a statement instead (depth limit reached)
      if (data.stage === 'statement') {
        handleStatementGenerated(data.message, data.buttons, data.problemStatement)
        return
      }

      // Track new issue suggestions (excluding action buttons)
      if (data.buttons && regenerate) {
        const newIssues = data.buttons
          .filter((btn: ButtonOption) => btn.type === 'issue')
          .map((btn: ButtonOption) => btn.label)
        setPreviousIssues(prev => [...prev, ...newIssues])
      } else if (data.buttons && !regenerate) {
        // Reset tracking for new domain
        const newIssues = data.buttons
          .filter((btn: ButtonOption) => btn.type === 'issue')
          .map((btn: ButtonOption) => btn.label)
        setPreviousIssues(newIssues)
      }

      // Add mentor message
      const mentorMsg: Message = {
        role: 'mentor',
        content: data.message,
        timestamp: Date.now(),
      }
      setMessages(prev => [...prev, mentorMsg])

      // Set buttons
      setButtons(data.buttons || [])
      setStage('issue')
    } catch (error) {
      console.error('Error loading issues:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Generate problem statement
  const generateStatement = async () => {
    setIsLoading(true)

    // Safeguard: use project.passionTopic as fallback if passionInput is empty
    const effectiveTopic = passionInput || project?.passionTopic || ''

    try {
      const response = await fetch('/api/mentor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: 'statement',
          passionTopic: effectiveTopic,
          selectedDomain,
          selectedIssues,
        }),
      })

      const data = await response.json()
      handleStatementGenerated(data.message, data.buttons, data.problemStatement)
    } catch (error) {
      console.error('Error generating statement:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatementGenerated = (message: string, btns: ButtonOption[], statement: string) => {
    const mentorMsg: Message = {
      role: 'mentor',
      content: message,
      timestamp: Date.now(),
    }
    setMessages(prev => [...prev, mentorMsg])
    setButtons(btns || [])
    setCurrentStatement(statement)
    setStage('statement')
  }

  // Handle passion topic submission
  const handlePassionSubmit = async () => {
    if (!passionInput.trim()) return

    const sanitized = sanitizeInput(passionInput)

    // Add student message
    const studentMsg: Message = {
      role: 'student',
      content: sanitized,
      timestamp: Date.now(),
    }
    setMessages(prev => [...prev, studentMsg])

    // Save to Firestore
    await updateProject(projectId, {
      passionTopic: sanitized,
    })

    // Load domains
    await loadDomains(sanitized, false)
  }

  // Handle button click
  const handleButtonClick = async (button: ButtonOption) => {
    // Add student message showing what they clicked
    const studentMsg: Message = {
      role: 'student',
      content: button.label,
      timestamp: Date.now(),
    }
    setMessages(prev => [...prev, studentMsg])

    // Reset other input
    setShowOtherInput(false)
    setOtherInput('')

    // Handle based on button type
    if (button.type === 'other') {
      setShowOtherInput(true)
      return
    }

    if (button.id === 'show_different') {
      // Regenerate domains
      await loadDomains(passionInput, true)
      return
    }

    if (button.id === 'regenerate_issues') {
      // Regenerate issues within the same domain
      await loadIssues(selectedDomain, selectedIssues, true)
      return
    }

    if (button.id === 'start_over') {
      // Full reset to beginning
      await fullReset()
      return
    }

    if (stage === 'domain') {
      // Domain selected
      setSelectedDomain(button.label)
      setSelectedIssues([])
      await loadIssues(button.label, [])
    } else if (stage === 'issue') {
      // Issue selected
      const newIssues = [...selectedIssues, button.label]
      setSelectedIssues(newIssues)
      await loadIssues(selectedDomain, newIssues)
    } else if (stage === 'statement') {
      // Statement confirmation
      if (button.id === 'yes') {
        // Save to problem map
        await saveProblemStatement()
      } else if (button.id === 'tweak') {
        // Show text input for tweaking
        setShowOtherInput(true)
        const msg: Message = {
          role: 'mentor',
          content: 'What would you like to change about the problem statement?',
          timestamp: Date.now(),
        }
        setMessages(prev => [...prev, msg])
      } else if (button.id === 'different') {
        // Go back to domain selection
        resetToPassion()
        await loadDomains(passionInput, false)
      }
    } else if (stage === 'next_action') {
      if (button.id === 'explore') {
        // Explore another domain
        resetToPassion()
        await loadDomains(passionInput, false)
      } else if (button.id === 'continue') {
        // Mark as chosen and complete
        await updateProject(projectId, {
          chosenProblem: currentStatement,
        })

        const msg: Message = {
          role: 'mentor',
          content: "Fantastic! This will be your starting point for the full Catalyst Change Project. You've completed the Problem Incubator step.",
          timestamp: Date.now(),
        }
        setMessages(prev => [...prev, msg])
        setButtons([])
      } else if (button.id === 'new_passion') {
        // Complete reset - explore a different passion topic
        setPassionInput('')
        setSelectedDomain('')
        setSelectedIssues([])
        setCurrentStatement('')
        setPreviousDomains([])
        setPreviousIssues([])
        setButtons([])
        setStage('passion')

        // Clear Firestore data
        await updateProject(projectId, {
          passionTopic: null,
        })

        const msg: Message = {
          role: 'mentor',
          content: "Great! Let's explore a completely different area. What new topic are you passionate about?",
          timestamp: Date.now(),
        }
        setMessages(prev => [...prev, msg])
      }
    }
  }

  // Handle "Other" text submission
  const handleOtherSubmit = async () => {
    if (!otherInput.trim()) return

    const sanitized = sanitizeInput(otherInput)

    const studentMsg: Message = {
      role: 'student',
      content: sanitized,
      timestamp: Date.now(),
    }
    setMessages(prev => [...prev, studentMsg])

    if (stage === 'domain') {
      // Custom domain
      setSelectedDomain(sanitized)
      setSelectedIssues([])
      setOtherInput('')
      setShowOtherInput(false)
      await loadIssues(sanitized, [])
    } else if (stage === 'statement') {
      // Tweaking statement - call API to modify based on instructions
      setIsLoading(true)
      setOtherInput('')
      setShowOtherInput(false)

      try {
        const response = await fetch('/api/mentor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stage: 'tweak',
            originalStatement: currentStatement,
            tweakInstructions: sanitized,
          }),
        })

        const data = await response.json()

        // Add mentor message with tweaked statement
        const mentorMsg: Message = {
          role: 'mentor',
          content: data.message,
          timestamp: Date.now(),
        }
        setMessages(prev => [...prev, mentorMsg])

        // Update current statement
        setCurrentStatement(data.problemStatement)

        // Show confirmation buttons
        setButtons(data.buttons || [])
      } catch (error) {
        console.error('Error tweaking statement:', error)
        const errorMsg: Message = {
          role: 'mentor',
          content: "I'm having trouble modifying the statement. Please try again.",
          timestamp: Date.now(),
        }
        setMessages(prev => [...prev, errorMsg])
      } finally {
        setIsLoading(false)
      }
    }
  }

  // Save problem statement to Firestore
  const saveProblemStatement = async () => {
    const newProblem = {
      statement: currentStatement,
      domain: selectedDomain,
      path: selectedIssues,
      timestamp: Date.now(),
    }

    await updateProject(projectId, {
      problemMap: [...(project?.problemMap || []), newProblem],
    })

    // Show next action options
    const msg: Message = {
      role: 'mentor',
      content: "Excellent! I've saved that problem statement to your Problem Map. Before committing to a problem, I encourage you to explore a few more options. This will help you choose the problem you're most passionate about solving.",
      timestamp: Date.now(),
    }
    setMessages(prev => [...prev, msg])

    setButtons([
      { id: 'explore', label: `Explore more problems in ${project?.passionTopic || 'this area'}`, type: 'action' },
      { id: 'new_passion', label: 'Explore a different passion area', type: 'action' },
    ])
    setStage('next_action')
  }

  // Reset to passion (for exploring new domains)
  const resetToPassion = () => {
    setSelectedDomain('')
    setSelectedIssues([])
    setCurrentStatement('')
    setShowOtherInput(false)
    setOtherInput('')
  }

  // Full reset to beginning (clear everything)
  const fullReset = async () => {
    setPassionInput('')
    setSelectedDomain('')
    setSelectedIssues([])
    setCurrentStatement('')
    setShowOtherInput(false)
    setOtherInput('')
    setPreviousDomains([])
    setPreviousIssues([])
    setButtons([])
    setStage('passion')

    // Clear Firestore data
    await updateProject(projectId, {
      passionTopic: null,
    })

    // Show initial message
    const initialMsg: Message = {
      role: 'mentor',
      content: "Hi there! To start, please tell me about a topic you are passionate about. This can be anything from sports, politics, environment, maths, gaming, arts, or anything else that matters to you.",
      timestamp: Date.now(),
    }
    setMessages([initialMsg])
  }

  // Choose a problem from the map
  const handleChooseProblem = async (statement: string) => {
    setIsCommitting(true)

    try {
      await updateProject(projectId, {
        chosenProblem: statement,
        currentStep: 'explore',
      })

      // Show success message
      const msg: Message = {
        role: 'mentor',
        content: "Excellent! This will be your starting point for the Catalyst Change Project. Let's explore it deeper...",
        timestamp: Date.now(),
      }
      setMessages(prev => [...prev, msg])

      // Navigate to journey for horizontal navigation through steps
      setTimeout(() => {
        router.push(`/project/${projectId}/journey`)
      }, 1500)
    } catch (error) {
      console.error('Error choosing problem:', error)
      setIsCommitting(false)

      // Show error message
      const errorMsg: Message = {
        role: 'mentor',
        content: "Sorry, there was an error saving your choice. Please try again.",
        timestamp: Date.now(),
      }
      setMessages(prev => [...prev, errorMsg])
    }
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
    <div style={{ minHeight: '100vh', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Workflow Progress Bar */}
      {project.chosenProblem && (
        <div style={{
          position: 'sticky',
          top: '1rem',
          zIndex: 50,
        }}>
          <div className="glass-panel" style={{
            padding: '1rem 2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(134, 218, 189, 0.08)',
            border: '1px solid rgba(134, 218, 189, 0.3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ color: 'var(--color-secondary)', fontWeight: 600 }}>
                Step 1: Problem Incubator
              </span>
              <span style={{ color: 'var(--color-text-primary)', opacity: 0.5 }}>→</span>
              <span style={{ color: 'var(--color-text-primary)', opacity: 0.7 }}>
                Step 2: Explore
              </span>
            </div>

            <button
              onClick={() => router.push(`/project/${projectId}/journey`)}
              className="btn btn-primary"
              style={{
                fontSize: '0.9rem',
                padding: '0.65rem 1.5rem',
              }}
            >
              Continue to Explore →
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flex: 1 }}>
        {/* Left side: Chat area */}
        <div style={{ flex: '1 1 600px', display: 'flex', flexDirection: 'column' }}>
          <div className="glass-panel" style={{ padding: '2rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Problem Incubator Session</h2>

          {/* Breadcrumb */}
          {(selectedDomain || selectedIssues.length > 0) && (
            <div style={{
              marginBottom: '1rem',
              padding: '0.75rem 1rem',
              background: 'rgba(134, 218, 189, 0.08)',
              border: '1px solid rgba(134, 218, 189, 0.2)',
              borderRadius: '0.75rem',
              fontSize: '0.85rem',
              color: 'var(--color-secondary)'
            }}>
              <strong>{passionInput}</strong>
              {selectedDomain && ` → ${selectedDomain}`}
              {selectedIssues.length > 0 && ` → ${selectedIssues.join(' → ')}`}
            </div>
          )}

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            marginBottom: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`message-bubble ${msg.role === 'mentor' ? 'message-mentor' : 'message-student'}`}
                style={{ whiteSpace: 'pre-wrap' }}
              >
                {msg.content}
              </div>
            ))}
            {isLoading && (
              <div className="message-bubble message-mentor" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                <span>Thinking...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Buttons */}
          {buttons.length > 0 && !showOtherInput && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '0.75rem',
              marginBottom: '1rem'
            }}>
              {buttons.map((button) => (
                <button
                  key={button.id}
                  onClick={() => handleButtonClick(button)}
                  className={button.type === 'other' || button.id === 'show_different' ? 'btn btn-secondary' : 'btn btn-primary'}
                  style={{
                    fontSize: '0.9rem',
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    whiteSpace: 'normal',
                    height: 'auto',
                    minHeight: '50px'
                  }}
                  disabled={isLoading}
                >
                  {button.label}
                </button>
              ))}
            </div>
          )}

          {/* Other text input */}
          {showOtherInput && (
            <div style={{ marginBottom: '1rem' }}>
              <textarea
                value={otherInput}
                onChange={(e) => setOtherInput(e.target.value)}
                placeholder={stage === 'statement' ? 'Describe how you\'d like to adjust the statement...' : 'Describe your own...'}
                className="input-glass"
                style={{
                  minHeight: '80px',
                  resize: 'vertical',
                  marginBottom: '0.75rem'
                }}
                disabled={isLoading}
              />
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={handleOtherSubmit}
                  disabled={!otherInput.trim() || isLoading}
                  className="btn btn-primary"
                >
                  Submit
                </button>
                <button
                  onClick={() => {
                    setShowOtherInput(false)
                    setOtherInput('')
                  }}
                  className="btn btn-secondary"
                  disabled={isLoading}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Passion input (initial stage) */}
          {stage === 'passion' && !project.passionTopic && (
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <input
                type="text"
                value={passionInput}
                onChange={(e) => setPassionInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !isLoading && handlePassionSubmit()}
                placeholder="Type your passion topic..."
                className="input-glass"
                style={{ flex: 1 }}
                disabled={isLoading}
              />
              <button
                onClick={handlePassionSubmit}
                disabled={!passionInput.trim() || isLoading}
                className="btn btn-primary"
              >
                Submit
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right side: Problem Map */}
      <div style={{
        flex: '0 1 350px',
        minWidth: '300px',
        position: 'sticky',
        top: '2rem',
        alignSelf: 'flex-start',
        maxHeight: 'calc(100vh - 4rem)'
      }}>
        <div className="glass-panel" style={{
          padding: '2rem',
          maxHeight: 'calc(100vh - 4rem)',
          overflowY: 'auto'
        }}>
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--color-secondary)' }}>Problem Map</h3>

          {/* Passion Topic */}
          {project.passionTopic && (
            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--color-text-primary)', marginBottom: '0.5rem', opacity: 0.8 }}>
                Passion Topic
              </h4>
              <p style={{ color: 'var(--color-accent)', fontWeight: 600, fontSize: '1.1rem' }}>
                {project.passionTopic}
              </p>
            </div>
          )}

          {/* Problem Statements */}
          {project.problemMap && project.problemMap.length > 0 && (
            <div>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--color-text-primary)', marginBottom: '1rem', opacity: 0.8 }}>
                Explored Problems ({project.problemMap.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {project.problemMap.map((problem, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '1rem',
                      background: 'rgba(134, 218, 189, 0.08)',
                      border: '1px solid rgba(134, 218, 189, 0.2)',
                      borderRadius: '0.875rem',
                      fontSize: '0.9rem',
                      lineHeight: '1.5'
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-secondary)', marginBottom: '0.5rem', opacity: 0.8 }}>
                      {problem.domain}
                    </div>
                    <div style={{ marginBottom: '0.75rem' }}>
                      {problem.statement}
                    </div>
                    {project.chosenProblem === problem.statement ? (
                      <>
                        <div style={{
                          color: 'var(--color-accent)',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          marginBottom: '0.75rem'
                        }}>
                          ✓ Chosen for project
                        </div>
                        <button
                          onClick={() => router.push(`/project/${projectId}/journey`)}
                          className="btn btn-primary"
                          style={{
                            fontSize: '0.8rem',
                            padding: '0.5rem 1rem',
                            width: '100%'
                          }}
                        >
                          Explore this problem →
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setConfirmModal({ isOpen: true, statement: problem.statement })}
                        className="btn btn-secondary"
                        style={{
                          fontSize: '0.8rem',
                          padding: '0.5rem 1rem',
                          width: '100%'
                        }}
                      >
                        Choose this problem
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!project.passionTopic && (!project.problemMap || project.problemMap.length === 0) && (
            <p style={{ color: 'rgba(224, 224, 224, 0.5)', fontStyle: 'italic', fontSize: '0.95rem' }}>
              Your passion topic and problem statements will appear here as you explore.
            </p>
          )}

          {/* View link */}
          <div style={{
            marginTop: '2rem',
            padding: '1rem',
            background: 'rgba(241, 95, 36, 0.08)',
            border: '1px solid rgba(241, 95, 36, 0.2)',
            borderRadius: '0.875rem',
          }}>
            <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem', opacity: 0.9 }}>
              Share with your teacher:
            </p>
            <code style={{
              fontSize: '0.8rem',
              color: 'var(--color-secondary)',
              wordBreak: 'break-all',
              display: 'block'
            }}>
              {typeof window !== 'undefined' ? window.location.origin : ''}/project/{projectId}/view
            </code>
          </div>
        </div>
      </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal?.isOpen && (
        <div
          className="modal-overlay"
          onClick={() => setConfirmModal(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
          }}
        >
          <div
            className="glass-panel"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '500px',
              width: '90%',
              padding: '2rem',
              zIndex: 3001,
              background: 'rgba(26, 32, 44, 0.95)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(134, 218, 189, 0.3)',
              borderRadius: '1rem',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              position: 'relative',
            }}
          >
            {/* Modal Content - gets blurred during commit */}
            <div style={{
              filter: isCommitting ? 'blur(2px)' : 'none',
              pointerEvents: isCommitting ? 'none' : 'auto',
              transition: 'filter 0.3s ease',
            }}>
              <h3 style={{ marginBottom: '1rem', color: 'var(--color-accent)' }}>
                Ready to commit to this problem?
              </h3>

              <div style={{
                padding: '1.25rem',
                background: 'rgba(134, 218, 189, 0.08)',
                border: '1px solid rgba(134, 218, 189, 0.2)',
                borderRadius: '0.875rem',
                marginBottom: '1.5rem',
                lineHeight: '1.6'
              }}>
                {confirmModal.statement}
              </div>

              <p style={{
                marginBottom: '1.5rem',
                color: 'var(--color-text-primary)',
                opacity: 0.9,
                lineHeight: '1.5'
              }}>
                This will become your Catalyst Change Project focus. You can always explore
                more problems, but choosing this one will mark it as your primary project.
              </p>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setConfirmModal(null)}
                  className="btn btn-secondary"
                  style={{ padding: '0.75rem 1.5rem' }}
                  disabled={isCommitting}
                >
                  Not yet
                </button>
                <button
                  onClick={async () => {
                    await handleChooseProblem(confirmModal.statement)
                  }}
                  className="btn btn-primary"
                  style={{
                    padding: '0.75rem 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                  disabled={isCommitting}
                >
                  {isCommitting ? (
                    <>
                      <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                      <span>Committing...</span>
                    </>
                  ) : (
                    'Yes, choose this problem'
                  )}
                </button>
              </div>
            </div>

            {/* Loading Overlay - stays sharp, not blurred */}
            {isCommitting && (
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1rem',
                zIndex: 10,
                pointerEvents: 'none',
              }}>
                <div className="spinner" style={{ width: '48px', height: '48px' }}></div>
                <p style={{ color: 'var(--color-secondary)', fontWeight: 600, fontSize: '1.1rem' }}>
                  Setting up your journey...
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
