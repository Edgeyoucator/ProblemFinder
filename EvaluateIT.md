# CATALYST CHANGE PROJECT — EVALUATE IT (ENTREPRENEURIAL CRITIQUE STAGE)

This stage follows **Time to Decide** in the horizontal journey.  
It helps students critically and entrepreneurially test whether their chosen solution is *worth pursuing*.

---

## PURPOSE

Encourage students to:
- think critically about their chosen solution,
- anticipate weaknesses,
- recognise their unique strengths,
- and build confidence to take ownership like young founders.

This is not a “pros and cons list.”  
It is a **structured founder’s critique**: *Why this idea? Why you? What could break it?*

---

## STRUCTURE OVERVIEW

**Layout:**  
A single horizontal screen divided into three interactive cards (or horizontal bands) beneath the locked solution card.

Top:  
> **Your Solution** (glass card displaying the title and summary)

Below:  
| Left | Centre | Right |
|------|---------|--------|
| **1. Why It’s Worth It** | **2. What Could Break It** | **3. Why You (Entrepreneur Mode)** |

Students can complete these in any order, but all must be filled before advancing.

---

## 1. WHY IT’S WORTH IT  — *Value & Relevance*

**Prompt the student to identify:**
1. **Who actually cares?**  
   “Name the specific people or groups who will genuinely care about this idea.”
2. **What value do they get?**  
   “What changes for them if this idea works — time saved, harm reduced, pride, fun, safety, etc.?”
3. **Why this idea, not a boring one?**  
   “What makes this more interesting or powerful than a basic poster or awareness campaign?”

**Goal:**  
Get them to articulate a *clear value proposition* and avoid generic “raise awareness” answers.

**Completion logic:**  
- Minimum two fields filled with concrete, non-generic statements.  
- When complete, mark the card with a green check and subtle glow animation.

---

## 2. WHAT COULD BREAK IT  — *Critical Risk Thinking*

**Prompts:**
1. **Limitations**  
   “Where might this idea struggle — too big, too costly, too few people, wrong timing, rules?”
2. **Fragile Points**  
   “What one element, if it fails, could cause the whole thing to collapse?”
3. **Pushback**  
   “Who might not like this idea or might block it — teachers, brands, officials, older students — and why?”
4. **Reality Check**  
   “Is there any chance this could backfire or accidentally make things worse?”

**Goal:**  
Teach **risk anticipation** and honest evaluation, not self-sabotage.

**Completion logic:**  
- At least three thoughtful risks or limits described.  
- Optional: once complete, display AI or static reflection text such as:  
  > “You’ve spotted real risks — which one would you solve first?”

---

## 3. WHY YOU (ENTREPRENEUR MODE)  — *Strengths & Ownership*

**Prompts:**
1. **Your Edge**  
   “What skills, hobbies, or connections make you well-suited to run this project?”
2. **Allies**  
   “Who could you realistically get on board — friends, teachers, local groups, online communities?”
3. **Resilience**  
   “If someone said ‘this will never work’, what’s your one-sentence comeback?”

**Goal:**  
Help them see their **unfair advantage** — their personal fit and motivation.

**Completion logic:**  
- Minimum one strength + one comeback required.  
- Card completion unlocks when both fields are filled.

---

## STEP COMPLETION RULES

The “Evaluate It” step is complete when:
- “Why It’s Worth It” = filled (≥2 concrete responses)
- “What Could Break It” = filled (≥3 responses)
- “Why You” = filled (≥1 strength + comeback)

Once all are complete:
- Display a summary banner:

  > “You’ve checked your idea like a founder:  
  > ✅ Clear value  
  > ✅ Risks spotted  
  > ✅ Strengths identified  
  > You’re ready to plan how to make it real.”

- Unlock the right arrow → next horizontal stage (“Measure It” / “Plan It”).

---

## AI / MODEL BEHAVIOUR (OPTIONAL)

If using an AI mentor here:
- **Tone:** encouraging, curious, direct.
- **Behaviour:**  
  - Reacts to filled fields with short comments (1–2 sentences).  
  - Pushes for specificity if answers are vague.  
  - Never gates progression.
- **Examples of feedback phrasing:**
  - “That’s a real value point — can you give an example of who’d benefit most?”
  - “This risk is important; how might you design around it?”
  - “Strong comeback! What could make that response even more convincing?”

---

## DATA STRUCTURE

```js
evaluateIt: {
  worthIt: {
    whoCares: string,
    value: string,
    uniqueness: string
  },
  risks: {
    limitations: string,
    fragilePoint: string,
    pushback: string,
    realityCheck: string
  },
  entrepreneur: {
    edge: string,
    allies: string,
    comeback: string
  }
}
