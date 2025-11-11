# CATALYST CHANGE PROJECT — IDENTIFYING KEY PLAYERS (STAKEHOLDERS)

This stage follows **Evaluate It** in the horizontal journey.  
Students identify and plan engagement with key stakeholders who can influence or support their project.

---

## PURPOSE

Help students:
- map out who matters most to their project,
- understand different types of influence and support,
- and plan how to contact and engage one or more real stakeholders.

---

## LAYOUT OVERVIEW

**Visual design:**  
A **mindmap-style horizontal layout** with the student’s **project at the center** and **stakeholder categories radiating outward**.

Each node = stakeholder group.  
Clicking a node opens prompts for the student to identify specific people or organizations and plan outreach.

**Central node:**  
> *Your Project Name* (auto-filled from the student’s project data)

**Surrounding nodes:**
1. Influencers  
2. Media  
3. Government Officials  
4. Industry Experts  
5. Financial Stakeholders  
6. Community & Special Interest Groups  
7. Suppliers & Partners  
8. Beneficiaries

Each node can be completed independently; the stage is complete when at least one stakeholder group has a fully filled entry.

---

## STAKEHOLDER GROUP DEFINITIONS & PROMPTS

### 1. Influencers
**Local Influencers:**  
Community leaders, local celebrities, or respected figures who can sway public opinion.  
**Social Media Influencers:**  
Individuals with significant followings who can amplify the project’s message.

**Prompts:**
- Who fits this role for your project?  
- Why would their voice matter?  
- How could they share or promote your message?

---

### 2. Media
**Journalists & Reporters:**  
Local or school media interested in stories with community impact.  
**Bloggers & Content Creators:**  
Writers or vloggers who cover relevant topics.

**Prompts:**
- Which outlets or people could cover your story?  
- How would you contact them?  
- What’s your “headline” — how would you pitch it?

---

### 3. Government Officials
**Regulatory Authorities:**  
Officials who can grant permissions or ensure compliance.  
**Policy Makers:**  
Elected representatives or civil servants who can influence related issues.

**Prompts:**
- Who in government might affect or support your idea?  
- What approvals or advice could you need?  
- How will you present your idea professionally?

---

### 4. Industry Experts
**Consultants & Academics:**  
Specialists who can lend credibility or technical advice.  
**Professional Associations:**  
Organizations representing relevant professions or industries.

**Prompts:**
- Who are experts or professionals connected to your topic?  
- What kind of help could they give — information, validation, partnership?  
- How could you reach them?

---

### 5. Financial Stakeholders
**Investors & Donors:**  
Individuals or institutions who could fund the project.  
**Banks & Financial Institutions:**  
Possible sources of small grants or financial advice.

**Prompts:**
- Who could help fund or resource your project?  
- Why might it be appealing for them to support you?  
- What value or visibility could they gain from involvement?

---

### 6. Community & Special Interest Groups
**Environmental Groups:**  
Potential supporters or watchdogs if your project affects the environment.  
**Civic Organizations:**  
Local or national groups involved in community improvement.

**Prompts:**
- Which local or interest groups connect to your issue?  
- How might they support or challenge your project?  
- How could you make collaboration worthwhile for them?

---

### 7. Suppliers & Partners
**Vendors & Suppliers:**  
Companies providing materials or services.  
**Strategic Partners:**  
Organizations that can collaborate directly.

**Prompts:**
- Who could provide materials, space, or expertise?  
- How could you make it mutually beneficial?  
- Would you recognize them publicly (events, social media, posters)?

---

### 8. Beneficiaries
**Direct Beneficiaries:**  
The people who directly receive the project’s benefit.  
**Indirect Beneficiaries:**  
Wider community or secondary audiences.

**Prompts:**
- Who gains most from your project?  
- How will their lives improve?  
- Could they help spread or sustain the idea?

---

## REFLECTION QUESTIONS (APPLY TO ANY CHOSEN STAKEHOLDER)

Once a stakeholder node is selected, show these open-text prompts:

1. Which stakeholder are you approaching?  
2. How will you find their contact information and reach out?  
3. What will you say to introduce yourself and your project?  
4. What kind of involvement or support are you seeking?  
5. How can you make it appealing for them to participate or help?

---

## EXAMPLE SCENARIO

**Project:**  
Implementing a new recycling programme in my school.  

**Stakeholder:**  
Local recycling company.  

**Contact Method:**  
Online research for contact details → email → in-person meeting.  

**Message:**  
Introduction as a student leader, summary of project benefits for the school and potential new business for the company.  

**Engagement Strategy:**  
Offer recognition as a “Green Partner” in school publications and events to strengthen the company’s community profile.

---

## STEP COMPLETION RULES

The **Stakeholders** step is complete when:
- at least one stakeholder node has all reflection questions answered with non-empty text, **and**
- the node is marked as “planned” or “contact ready”.

Optionally:
- allow students to complete multiple nodes (encourage exploring breadth).

---

## DATA STRUCTURE

```js
stakeholders: {
  influencers: { local: string, social: string },
  media: { journalists: string, bloggers: string },
  government: { regulators: string, policymakers: string },
  experts: { consultants: string, associations: string },
  financial: { investors: string, banks: string },
  community: { environmental: string, civic: string },
  suppliers: { vendors: string, partners: string },
  beneficiaries: { direct: string, indirect: string },
  selectedStakeholder: {
    name: string,
    contactMethod: string,
    introductionMessage: string,
    involvement: string,
    appeal: string
  }
}
