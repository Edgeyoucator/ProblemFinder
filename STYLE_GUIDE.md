# Catalyst Change Project - Design System Style Guide

**Version:** 1.0
**Last Updated:** November 2025
**Based on:** ExploreStep.tsx design patterns

This comprehensive style guide documents the design system used in the Catalyst Change Project ProblemFinder application. Use this as a reference for maintaining consistency and retrofitting existing components.

---

## Table of Contents

1. [CSS Custom Properties](#css-custom-properties)
2. [Color Palette](#color-palette)
3. [Typography System](#typography-system)
4. [Spacing & Sizing](#spacing--sizing)
5. [Glass Morphism System](#glass-morphism-system)
6. [Button Styles](#button-styles)
7. [Input Fields](#input-fields)
8. [Message Bubbles](#message-bubbles)
9. [Progress Indicators](#progress-indicators)
10. [Modal Patterns](#modal-patterns)
11. [Animations](#animations)
12. [Layout Systems](#layout-systems)
13. [Positioning in Journey Steps](#positioning-in-journey-steps)
14. [Interactive States](#interactive-states)
15. [Utility Classes](#utility-classes)
16. [Component Patterns](#component-patterns)
17. [Design Conventions](#design-conventions)
18. [Inconsistencies to Fix](#inconsistencies-to-fix)

---

## CSS Custom Properties

All CSS variables are defined in `app/globals.css`.

### Brand Colors

```css
--color-background: #162237        /* Dark navy background */
--color-accent: #f15f24            /* Primary orange (buttons, highlights) */
--color-secondary: #86dabd         /* Teal (secondary elements, completion states) */
--color-text-primary: #e0e0e0      /* Primary text color */
--color-text-heading: #ffffff      /* Heading text color */
```

### Glass Morphism System

```css
--glass-bg: rgba(22, 34, 55, 0.6)           /* Base glass background */
--glass-border: rgba(134, 218, 189, 0.2)    /* Glass border color */
--glass-edge: rgba(255, 255, 255, 0.12)     /* Glass edge highlight */
--glass-highlight: rgba(255, 255, 255, 0.08) /* Glass sheen effect */
--glass-shadow: 0 8px 32px rgba(0,0,0,0.35) /* Glass drop shadow */
```

---

## Color Palette

### Primary Colors

| Color Name | Value | Usage |
|------------|-------|--------|
| **Background** | `#162237` | Main background, card backgrounds |
| **Accent Orange** | `#f15f24` | Primary buttons, key highlights, active borders |
| **Secondary Teal** | `#86dabd` | Secondary buttons, completion indicators, success states |
| **Text Primary** | `#e0e0e0` | Body text |
| **Text Heading** | `#ffffff` | Headings, titles |

### Contextual Zone Colors (20% opacity overlays)

**ExploreStep Zones:**
- Think Big: `rgba(241, 95, 36, 0.2)` - Orange
- Think Small: `rgba(134, 218, 189, 0.2)` - Teal
- Causes: `rgba(100, 150, 220, 0.2)` - Blue
- Motivation: `rgba(200, 120, 200, 0.2)` - Purple

**FourWsStep Zones:**
- What: `rgba(241, 95, 36, 0.2)` - Orange
- Who: `rgba(17, 138, 178, 0.2)` - Blue
- Where: `rgba(119, 158, 203, 0.2)` - Light Blue
- Why: `rgba(68, 1, 84, 0.2)` - Dark Purple

### Gradient Backgrounds

```css
/* Body gradient */
background: linear-gradient(135deg, #162237 0%, #1a2940 100%);

/* Primary button gradient */
background: linear-gradient(135deg, #f15f24 0%, #d94d1a 100%);

/* Heading gradient text */
background: linear-gradient(135deg, #ffffff 0%, #86dabd 100%);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
```

---

## Typography System

### Font Family

```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

**Source:** Google Fonts (`@import` in `globals.css`)

### Font Weights

- 300 (Light)
- 400 (Regular) - Body text
- 500 (Medium)
- 600 (Semi-Bold) - Headings, buttons
- 700 (Bold)

### Typography Hierarchy

| Element | Size | Line Height | Weight | Color | Usage |
|---------|------|-------------|--------|-------|--------|
| **h1** | 2.5rem (40px) | 1.3 | 600 | Gradient | Main page headings |
| **h2** | 1.75rem (28px) | 1.3 | 600 | `--color-secondary` | Section headings |
| **h3** | 1.35rem (22px) | 1.3 | 600 | `--color-text-heading` | Subsection headings |
| **h4** | 1.1rem (18px) | 1.4 | 600 | varies | Card titles |
| **Body** | 1rem (16px) | Default | 400 | `--color-text-primary` | Body text |
| **Button** | 1rem | - | 600 | white | Button text |
| **Small** | 0.85-0.95rem | 1.6-1.8 | 400-600 | varies | Labels, metadata |

### Letter Spacing

```css
body { letter-spacing: 0.02em; }
.btn { letter-spacing: 0.03em; }
```

---

## Spacing & Sizing

### Spacing Scale

**Padding:**
- XS: `0.3rem, 0.5rem`
- S: `0.75rem, 1rem`
- M: `1.5rem`
- L: `2rem`
- XL: `2.5rem, 3rem`

**Margins:**
- S: `0.5rem, 0.75rem`
- M: `1rem, 1.5rem`
- L: `2rem`

**Gaps:**
- XS: `0.5rem`
- S: `0.75rem`
- M: `1rem, 1.5rem`
- L: `2rem`

### Responsive Sizing (using clamp)

```css
/* Zone cards */
width: clamp(220px, 18vw, 320px);
padding: clamp(1rem, 1.5vw, 1.5rem);

/* Central cards */
width: clamp(280px, 22vw, 400px);
padding: clamp(1.5rem, 2vw, 2rem);
```

### Border Radius Scale

- Small: `0.5rem` (8px)
- Medium: `0.75rem` (12px)
- Large: `1.25rem` (20px)
- Extra Large: `1.5rem` (24px)
- Circle: `50%`

---

## Glass Morphism System

### 1. Standard Glass Panel (`.glass-panel`)

**File:** `app/globals.css`

```css
.glass-panel {
  background: var(--glass-bg);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--glass-border);
  border-radius: 1.5rem;
  box-shadow:
    0 8px 32px 0 rgba(0, 0, 0, 0.37),
    inset 0 1px 0 0 rgba(255, 255, 255, 0.05);
}
```

**Usage:** Cards, panels, containers

---

### 2. Elevated Glass Card with Sheen (`.glass-card`)

**File:** `app/globals.css`

```css
.glass-card {
  position: relative;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0) 60%),
    radial-gradient(1200px 400px at -10% -20%, rgba(134,218,189,0.08), transparent 40%),
    radial-gradient(800px 300px at 110% 0%, rgba(241,95,36,0.07), transparent 40%),
    var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 1.25rem;
  backdrop-filter: blur(18px) saturate(110%);
  -webkit-backdrop-filter: blur(18px) saturate(110%);
  box-shadow: var(--glass-shadow), inset 0 1px 0 0 var(--glass-edge);
  overflow: hidden;
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
}

/* Sheen effect */
.glass-card::before {
  content: "";
  position: absolute;
  top: -50%;
  left: -60%;
  width: 120%;
  height: 200%;
  background: linear-gradient(120deg, transparent 30%, var(--glass-highlight) 50%, transparent 70%);
  transform: translateX(-120%);
  transition: transform 0.9s cubic-bezier(0.16, 1, 0.3, 1);
  pointer-events: none;
}

.glass-card:hover::before {
  transform: translateX(120%);
}

.glass-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(0,0,0,0.45), inset 0 1px 0 0 var(--glass-edge);
}
```

**Usage:** Interactive cards needing elevation and sheen

---

### 3. Completed State Glass

```css
.glass-card[data-complete="true"] {
  border-color: rgba(134, 218, 189, 0.55);
  box-shadow:
    0 14px 48px rgba(0,0,0,0.5),
    0 0 24px rgba(134,218,189,0.25),
    inset 0 1px 0 0 var(--glass-edge);
  animation: pulseGlow 4s ease-in-out infinite alternate;
}

@keyframes pulseGlow {
  0% {
    box-shadow: 0 14px 48px rgba(0,0,0,0.45),
                0 0 16px rgba(134,218,189,0.18),
                inset 0 1px 0 0 var(--glass-edge);
  }
  100% {
    box-shadow: 0 16px 54px rgba(0,0,0,0.5),
                0 0 28px rgba(134,218,189,0.3),
                inset 0 1px 0 0 var(--glass-edge);
  }
}
```

---

### 4. Zone-Specific Gradient Glass

```css
/* Combine glass-panel with zone color overlay */
background: linear-gradient(135deg, var(--glass-bg), rgba(241, 95, 36, 0.2));
```

**Usage:** ExploreStep zone cards, FourWsStep zone panels

---

## Button Styles

### Primary Button (`.btn-primary`)

**File:** `app/globals.css`

```css
.btn-primary {
  background: linear-gradient(135deg, var(--color-accent) 0%, #d94d1a 100%);
  color: white;
  box-shadow:
    0 4px 20px rgba(241, 95, 36, 0.4),
    inset 0 1px 0 0 rgba(255, 255, 255, 0.2);
  padding: 0.875rem 2rem;
  border: none;
  border-radius: 1.5rem;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  letter-spacing: 0.03em;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow:
    0 6px 28px rgba(241, 95, 36, 0.6),
    inset 0 1px 0 0 rgba(255, 255, 255, 0.3);
}

.btn-primary:active {
  transform: translateY(0);
}
```

**Usage:** Primary CTAs, main actions

---

### Secondary Button (`.btn-secondary`)

**File:** `app/globals.css`

```css
.btn-secondary {
  background: rgba(134, 218, 189, 0.15);
  color: var(--color-secondary);
  border: 1px solid rgba(134, 218, 189, 0.3);
  box-shadow:
    0 4px 20px rgba(134, 218, 189, 0.15),
    inset 0 1px 0 0 rgba(134, 218, 189, 0.1);
  padding: 0.875rem 2rem;
  border-radius: 1.5rem;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-secondary:hover {
  background: rgba(134, 218, 189, 0.25);
  transform: translateY(-2px);
  box-shadow:
    0 6px 28px rgba(134, 218, 189, 0.3),
    inset 0 1px 0 0 rgba(134, 218, 189, 0.2);
}
```

**Usage:** Secondary actions, close buttons, cancel

---

### Disabled State

```css
/* Custom disabled styling */
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: rgba(255, 255, 255, 0.1);
}
```

---

## Input Fields

### Glass Input / Textarea (`.input-glass`)

**File:** `app/globals.css`

```css
.input-glass {
  width: 100%;
  padding: 1rem 1.5rem;
  background: rgba(22, 34, 55, 0.5);
  border: 1px solid rgba(134, 218, 189, 0.3);
  border-radius: 1.5rem;
  color: var(--color-text-primary);
  font-size: 1rem;
  font-family: 'Inter', sans-serif;
  transition: all 0.3s ease;
  outline: none;
}

.input-glass:focus {
  border-color: var(--color-secondary);
  box-shadow: 0 0 20px rgba(134, 218, 189, 0.3);
  background: rgba(22, 34, 55, 0.7);
}

.input-glass::placeholder {
  color: rgba(224, 224, 224, 0.5);
}
```

### Textarea Specific

```css
textarea.input-glass {
  resize: vertical;
  min-height: 100px;
  font-family: inherit;
}
```

---

## Message Bubbles

### AI Message Bubble (`.message-mentor`)

**File:** `app/globals.css`

```css
.message-mentor {
  background: rgba(241, 95, 36, 0.1);
  border: 1px solid rgba(241, 95, 36, 0.3);
  box-shadow: 0 4px 16px rgba(241, 95, 36, 0.15);
  padding: 1rem 1.5rem;
  border-radius: 1.25rem;
  margin: 0.75rem 0;
  max-width: 85%;
  align-self: flex-start;
  backdrop-filter: blur(12px);
}
```

---

### Student Message Bubble (`.message-student`)

**File:** `app/globals.css`

```css
.message-student {
  background: rgba(134, 218, 189, 0.1);
  border: 1px solid rgba(134, 218, 189, 0.3);
  box-shadow: 0 4px 16px rgba(134, 218, 189, 0.15);
  padding: 1rem 1.5rem;
  border-radius: 1.25rem;
  margin: 0.75rem 0;
  max-width: 85%;
  align-self: flex-end;
  margin-left: auto;
  backdrop-filter: blur(12px);
}
```

---

### Alternative Pattern (Inline Style)

```tsx
/* AI Message */
<div style={{
  background: 'rgba(134, 218, 189, 0.1)',
  border: '1px solid rgba(134, 218, 189, 0.3)',
  borderRadius: '0.75rem',
  padding: '1rem',
}} />

/* Student Message */
<div style={{
  background: 'rgba(241, 95, 36, 0.1)',
  border: '1px solid rgba(241, 95, 36, 0.3)',
  borderRadius: '0.75rem',
  padding: '1rem',
  marginLeft: 'auto',
  maxWidth: '80%',
}} />
```

---

## Progress Indicators

### Progress Dots (`.progress-dot`)

**File:** `app/globals.css`

```css
.progress-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid var(--glass-border);
  background: radial-gradient(
    circle at 30% 30%,
    rgba(255,255,255,0.35),
    rgba(255,255,255,0.05) 40%,
    transparent 60%
  ), rgba(255,255,255,0.06);
  box-shadow: inset 0 1px 0 0 var(--glass-edge);
  transition: all 0.25s ease;
}

.progress-dot.done {
  background: radial-gradient(
    circle at 40% 35%,
    rgba(255,255,255,0.6),
    rgba(255,255,255,0.08) 45%,
    transparent 60%
  ), rgba(134,218,189,0.5);
  border-color: rgba(134, 218, 189, 0.8);
  box-shadow: 0 0 14px rgba(134,218,189,0.6), inset 0 1px 0 0 var(--glass-edge);
}
```

---

### Completion Checkmark Pattern

```tsx
/* Inline style pattern from components */
<div style={{
  width: '20px',
  height: '20px',
  borderRadius: '50%',
  background: 'var(--color-secondary)',
  color: 'var(--color-background)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '0.7rem',
  fontWeight: 'bold',
}}>
  ✓
</div>
```

---

## Modal Patterns

### 1. Fullscreen Modal Overlay (ExploreStep Pattern)

```tsx
/* Overlay */
<div style={{
  position: 'fixed',
  inset: 0,
  width: '100vw',
  height: '100vh',
  background: 'rgba(22, 34, 55, 0.95)',
  backdropFilter: 'blur(12px)',
  zIndex: 2000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  animation: 'fadeIn 0.3s ease-out',
  cursor: 'pointer',
}} onClick={closeModal}>

  /* Content */
  <div style={{
    width: '95vw',
    maxWidth: '1400px',
    height: '90vh',
    cursor: 'default',
    animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
    position: 'relative',
    display: 'flex',
    padding: '1rem',
  }} onClick={(e) => e.stopPropagation()}>
    {/* Modal content */}
  </div>
</div>
```

---

### 2. Standard Modal (FourWsStep Pattern)

```tsx
/* Overlay */
<div style={{
  position: 'fixed',
  inset: 0,
  width: '100vw',
  height: '100vh',
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2000,
  animation: 'fadeIn 0.3s ease-in-out',
}}>

  /* Content */
  <div style={{
    width: '90vw',
    maxWidth: '1200px',
    maxHeight: '85vh',
    display: 'flex',
    gap: '2rem',
    padding: 0,
    overflowY: 'hidden',
    animation: 'slideUp 0.3s ease-in-out',
  }}>
    {/* Modal content */}
  </div>
</div>
```

---

### 3. Close Button Patterns

**Large Circular (ExploreStep):**
```tsx
<button
  onClick={closeModal}
  className="btn btn-secondary"
  style={{
    position: 'absolute',
    left: '-140px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    padding: 0,
    fontSize: '4rem',
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }}
>
  ×
</button>
```

**Small Top-Right (SolutionsStep):**
```tsx
<button
  onClick={closeModal}
  style={{
    position: 'absolute',
    top: '1rem',
    right: '1rem',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
  }}
>
  ×
</button>
```

---

## Animations

### Core Keyframe Animations

**File:** `app/globals.css` (move from inline styles)

```css
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(40px) scale(0.95);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

@keyframes pulseGlow {
  0% {
    box-shadow: 0 14px 48px rgba(0,0,0,0.45),
                0 0 16px rgba(134,218,189,0.18),
                inset 0 1px 0 0 var(--glass-edge);
  }
  100% {
    box-shadow: 0 16px 54px rgba(0,0,0,0.5),
                0 0 28px rgba(134,218,189,0.3),
                inset 0 1px 0 0 var(--glass-edge);
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```

### Transition Standards

```css
/* Standard transitions */
transition: all 0.3s ease;
transition: all 0.25s ease;

/* Hover/interactive states */
transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;

/* Sheen effect */
transition: transform 0.9s cubic-bezier(0.16, 1, 0.3, 1);
```

### Animation Usage

```css
/* Overlay */
animation: fadeIn 0.3s ease-out;

/* Modal content */
animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);

/* Completed state */
animation: pulseGlow 4s ease-in-out infinite alternate;

/* Loading spinner */
animation: spin 1s linear infinite;
```

---

## Layout Systems

### 1. Fullscreen Centered Container

```tsx
<div style={{
  width: '100vw',
  height: '100vh',
  background: 'var(--color-background)',
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
}}>
  {/* Content */}
</div>
```

---

### 2. Absolute Positioning (Canvas Layout)

```tsx
/* Central element */
<div style={{
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 'clamp(280px, 22vw, 400px)',
}} />

/* Corner positioning */
const positionStyles = {
  'top-left': { top: 'max(2rem, 15vh)', left: 'max(2rem, 12vw)' },
  'top-right': { top: 'max(2rem, 15vh)', right: 'max(2rem, 12vw)' },
  'bottom-left': { bottom: 'max(2rem, 15vh)', left: 'max(2rem, 12vw)' },
  'bottom-right': { bottom: 'max(2rem, 15vh)', right: 'max(2rem, 12vw)' },
};
```

---

### 3. Two-Panel Modal Layout

```tsx
<div style={{ display: 'flex', gap: '2rem' }}>
  {/* Left Panel - Work Area */}
  <div style={{ flex: 1, padding: '3rem' }}>
    {/* Input/work content */}
  </div>

  {/* Right Panel - Feedback Area */}
  <div style={{ width: '400px', padding: '1.5rem' }}>
    {/* Feedback content */}
  </div>
</div>
```

---

### 4. Circular Arrangement

```typescript
// Calculate position for circular layout (SolutionsStep pattern)
const calculatePosition = (index: number, total: number, radius: number) => {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
};

// Apply as transform
style={{
  transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
}}
```

---

## Positioning in Journey Steps

**CRITICAL: Understanding the Journey's Horizontal Sliding Architecture**

### The Problem: Fixed Positioning in a Sliding Canvas

The journey page (`app/project/[projectId]/journey/page.tsx`) uses a **horizontal sliding canvas** where all 8 steps are rendered simultaneously in a single flex container. The container slides left/right using `transform: translateX()` to navigate between steps.

**Architecture:**
```tsx
<div style={{
  display: 'flex',
  width: `${STEPS.length * 100}vw`,  // 8 steps = 800vw total width
  height: '100vh',
  transform: `translateX(-${currentStepIndex * 100}vw)`,  // Slides between steps
  transition: 'transform 0.5s ease-in-out',
}}>
  {STEPS.map((step) => (
    <div key={step.id} style={{ width: '100vw', height: '100vh' }}>
      <step.component />  {/* ALL 8 steps rendered at once */}
    </div>
  ))}
</div>
```

### ❌ NEVER Use Fixed Positioning for Step-Specific Elements

**Problem:** Elements with `position: 'fixed'` are positioned relative to the **viewport**, not their parent container. This causes them to remain visible across ALL steps, even when their step has slid off-screen.

**Bad Example (causes global visibility):**
```tsx
{/* ❌ WRONG - Will appear on all steps */}
<h1 style={{
  position: 'fixed',  // ← PROBLEM
  top: '2rem',
  left: '50%',
  transform: 'translateX(-50%)',
}}>
  Step 1: What is the problem?
</h1>
```

**What happens:**
- Step 1 (ExploreStep) renders with this fixed title
- User navigates to Step 3 (CoFounderLab)
- The title from Step 1 is still visible because it's fixed to the viewport
- Result: Multiple step titles appear simultaneously, overlapping content

### ✅ ALWAYS Use Absolute Positioning for Step-Specific Elements

**Solution:** Use `position: 'absolute'` which positions elements relative to their nearest positioned parent (the step container).

**Good Example (stays within step):**
```tsx
{/* ✅ CORRECT - Only visible in this step */}
<h1 style={{
  position: 'absolute',  // ← SOLUTION
  top: '2rem',
  left: '50%',
  transform: 'translateX(-50%)',
}}>
  Step 1: What is the problem?
</h1>
```

**What happens:**
- Title is positioned relative to the step container
- When the step slides off-screen, the title moves with it
- Only the current step's elements are visible

### Positioning Rules for Journey Steps

| Element Type | Position | Reason |
|-------------|----------|---------|
| **Step titles** | `absolute` | Must stay within step container |
| **Breadcrumbs** | `absolute` | Step-specific navigation |
| **Step-specific headers** | `absolute` | Only relevant to current step |
| **Step content** | `relative` or `absolute` | Contained within step |
| **Modals/overlays** | `fixed` | Intentionally global (overlay all steps) |
| **Journey navigation** | `fixed` | Persistent across all steps (arrows, progress) |

### Step Container Requirements

For absolute positioning to work correctly, ensure the step's root container has `position: 'relative'`:

```tsx
export default function YourStep() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-background)',
      overflow: 'hidden',
      position: 'relative',  // ← REQUIRED for absolute children
    }}>
      {/* Absolute positioned elements */}
      <h1 style={{ position: 'absolute', top: '2rem', left: '50%' }}>
        Step Title
      </h1>

      {/* Rest of step content */}
    </div>
  )
}
```

### Real-World Example: ExploreStep Fix

**Before (Broken):**
```tsx
// ExploreStep.tsx - WRONG
<div style={{ minHeight: '100vh', position: 'relative' }}>
  <h1 style={{ position: 'fixed', top: '2rem' }}>  {/* ❌ Appears globally */}
    Step 1: What is the problem?
  </h1>
  <nav style={{ position: 'fixed', top: '1.5rem' }}>  {/* ❌ Appears globally */}
    Breadcrumb
  </nav>
</div>
```

**After (Fixed):**
```tsx
// ExploreStep.tsx - CORRECT
<div style={{ minHeight: '100vh', position: 'relative' }}>
  <h1 style={{ position: 'absolute', top: '2rem' }}>  {/* ✅ Step-specific */}
    Step 1: What is the problem?
  </h1>
  <nav style={{ position: 'absolute', top: '1.5rem' }}>  {/* ✅ Step-specific */}
    Breadcrumb
  </nav>
</div>
```

### When Fixed Positioning IS Appropriate

Use `position: 'fixed'` ONLY for elements that should persist across ALL steps:

1. **Journey navigation arrows** (left/right arrows to change steps)
2. **Progress indicator** (shows which step you're on, at bottom)
3. **Global modals/overlays** (confirmation dialogs, fullscreen overlays)
4. **Global notifications** (error messages, success toasts)

### Debugging Position Issues

If you see elements appearing on the wrong step:

1. **Check for `position: 'fixed'`** in step components
2. **Verify parent has `position: 'relative'`** for absolute children
3. **Use browser DevTools** to inspect z-index stacking
4. **Test navigation** between steps to confirm visibility

### Z-Index Considerations

When using absolute positioning in steps, maintain the z-index hierarchy:

```
1000+ - Journey navigation (always on top)
100   - Step-level headers, breadcrumbs
10    - Step content layers
1     - Base content
```

---

## Interactive States

### Hover States

**Card Hover:**
```tsx
onMouseEnter={(e) => {
  e.currentTarget.style.transform = 'translateY(-5px)';
  e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.5)';
}}

onMouseLeave={(e) => {
  e.currentTarget.style.transform = '';
  e.currentTarget.style.boxShadow = '';
}}
```

**Link Hover:**
```tsx
style={{ opacity: 0.7, transition: 'opacity 0.2s' }}
onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
```

---

### Focus States

```css
.input-glass:focus {
  border-color: var(--color-secondary);
  box-shadow: 0 0 20px rgba(134, 218, 189, 0.3);
  background: rgba(22, 34, 55, 0.7);
  outline: none;
}
```

---

### Disabled States

```css
opacity: 0.5;
cursor: not-allowed;
pointer-events: none;
```

---

### Active/Selected States

```css
/* Selected */
background: rgba(134, 218, 189, 0.2);
border: 2px solid var(--color-secondary);

/* Active */
border: 2px solid var(--color-accent);
opacity: 1;
```

---

## Utility Classes

**File:** `app/globals.css`

```css
/* Loading Spinner */
.spinner {
  border: 3px solid rgba(134, 218, 189, 0.2);
  border-top: 3px solid var(--color-secondary);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}

/* Text Colors */
.text-accent {
  color: var(--color-accent);
}

.text-secondary {
  color: var(--color-secondary);
}

/* Glow Effects */
.glow-accent {
  text-shadow: 0 0 20px rgba(241, 95, 36, 0.6);
}

.glow-secondary {
  text-shadow: 0 0 20px rgba(134, 218, 189, 0.6);
}
```

---

## Component Patterns

### Breadcrumb Navigation

```tsx
<nav style={{
  position: 'fixed',
  top: '1.5rem',
  left: '2rem',
  zIndex: 100,
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '0.9rem',
}}>
  <Link href="/" style={{ color: 'var(--color-text-primary)', opacity: 0.7 }}>
    Home
  </Link>
  <span style={{ opacity: 0.5 }}>→</span>
  <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
    Current Page
  </span>
</nav>
```

---

### Loading State

```tsx
{loading && (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--color-background)',
  }}>
    <div className="spinner" />
  </div>
)}
```

---

### Scrollbar Styling

**File:** `app/globals.css`

```css
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(22, 34, 55, 0.3);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: rgba(134, 218, 189, 0.3);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(134, 218, 189, 0.5);
}
```

---

## Design Conventions

### 1. Consistent Glass Morphism

✅ **DO:**
- Always use `.glass-panel` or `.glass-card` for containers
- Use 12-18px backdrop blur
- Include inset highlight for depth
- Use `var(--glass-border)` for borders

❌ **DON'T:**
- Create one-off glass styles
- Skip backdrop-filter
- Use solid backgrounds

---

### 2. Color-Coded Zones

✅ **DO:**
- Use thematic color overlay at 20% opacity
- Maintain glass background as base
- Use border-left accent for differentiation

❌ **DON'T:**
- Use full opacity overlays
- Mix multiple zone colors in one card

---

### 3. Modal Layout Standard

✅ **DO:**
- Left panel: Input/work area (flex: 1)
- Right panel: Feedback (fixed 400px)
- Gap: 2rem
- Use portal for rendering

❌ **DON'T:**
- Make feedback panel flexible width
- Use gaps smaller than 1.5rem

---

### 4. Completion Visual Language

✅ **DO:**
- Use checkmark (✓) in circular badge
- Use teal (`--color-secondary`)
- Add glow effect
- Optional pulsing animation

❌ **DON'T:**
- Use other icons for completion
- Use accent orange for completion

---

### 5. Responsive Approach

✅ **DO:**
- Use `clamp()` for fluid sizing
- Use `max()` for positioning with minimums
- Use vw/vh for fullscreen layouts

❌ **DON'T:**
- Use media queries (rely on fluid sizing)
- Use fixed pixel values for responsive elements

---

### 6. Z-Index Hierarchy

```
100   - Fixed navigation
2000  - Modals/overlays
10    - Modal close buttons
```

---

### 7. Animation Timing

- Enter: 0.3-0.4s
- Hover: 0.2-0.3s
- Sheen: 0.9s
- Pulse: 4s infinite

---

## Inconsistencies to Fix

### Priority 1: High Impact

1. **Modal Close Button Styling**
   - **Current:** Inconsistent across steps (large circular vs small vs none)
   - **Fix:** Standardize on ExploreStep pattern (large circular, left-positioned)

2. **Animation Definitions**
   - **Current:** Inline `<style jsx>` blocks in components
   - **Fix:** Move all animations to `globals.css`

3. **Loading States**
   - **Current:** Mix of `.spinner` class and text-only
   - **Fix:** Always use `.spinner` class

4. **Feedback Panel Width**
   - **Current:** Varies (400px, 40%, flexible)
   - **Fix:** Standardize at 400px fixed width

---

### Priority 2: Medium Impact

1. **Portal Usage**
   - **Current:** Some modals use `createPortal()`, some don't
   - **Fix:** Use portal for all modals

2. **Message Bubble Pattern**
   - **Current:** Two different approaches (`.message-mentor` vs inline styles)
   - **Fix:** Use utility classes consistently

3. **Disabled State Opacity**
   - **Current:** Mix of 0.5 and 0.6
   - **Fix:** Standardize at 0.5

---

### Priority 3: Low Impact

1. **CSS Custom Properties for Spacing**
   - **Current:** Hardcoded spacing values
   - **Consider:** Add `--spacing-*` variables

2. **CSS Grid for Layouts**
   - **Current:** Flexbox everywhere
   - **Consider:** Use Grid for two-column layouts

---

## Retrofitting Checklist

When updating existing components:

- [ ] Replace custom glass styles with `.glass-panel` or `.glass-card`
- [ ] Use CSS variables instead of hardcoded colors
- [ ] Apply standard button classes (`.btn-primary`, `.btn-secondary`)
- [ ] Use `.input-glass` for all text inputs
- [ ] Add standardized hover states
- [ ] Use `clamp()` for responsive sizing
- [ ] Move inline animations to `globals.css`
- [ ] Apply consistent spacing scale
- [ ] Use portal for modals
- [ ] Add breadcrumb navigation
- [ ] Include loading spinner with `.spinner` class
- [ ] Apply completion checkmarks with teal color
- [ ] Use standard z-index hierarchy

---

## Quick Reference

### Most Used Patterns

**Glass Card:**
```tsx
<div className="glass-card">Content</div>
```

**Primary Button:**
```tsx
<button className="btn btn-primary">Action</button>
```

**Input Field:**
```tsx
<input className="input-glass" placeholder="Enter text..." />
```

**Loading:**
```tsx
<div className="spinner" />
```

**Modal:**
```tsx
createPortal(
  <div style={{ /* overlay */ }}>
    <div style={{ /* content */ }}>
      {/* modal content */}
    </div>
  </div>,
  document.body
)
```

---

**End of Style Guide**

For questions or updates, reference the source components in `app/project/[projectId]/steps/`.
