# Catalyst Change Project - Problem Incubator

A guided AI mentor experience to help students discover and define clear, actionable problems they're passionate about solving.

## Features

- **Interactive Problem Discovery**: AI mentor guides students through a structured conversation
- **Real-time Sync**: All progress automatically saved to Firebase Firestore
- **Live Teacher View**: Teachers can observe student progress in real-time via a read-only URL
- **Glassmorphic Design**: Beautiful, modern UI with liquid glass aesthetics

## Tech Stack

- **Next.js 14** with App Router
- **TypeScript**
- **Firebase** (Firestore + Anonymous Auth)
- **OpenAI GPT-4o-mini** (AI Mentor)
- **React**

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

**Important:** Never commit your `.env.local` file to git. It's already in `.gitignore`.

### 3. Configure Firebase

**CRITICAL:** Before deploying or making this repository public, you MUST deploy Firestore security rules:

1. Enable Anonymous Authentication in Firebase Console
2. **Deploy the security rules** from `firestore.rules` (see [FIREBASE_SECURITY.md](./FIREBASE_SECURITY.md) for detailed instructions)

**Why this matters:** Firebase configuration is intentionally hardcoded for ease of setup. Your Firestore security rules are the ONLY protection preventing unauthorized access to student data.

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. How It Works

**For Students:**
1. Click "Start a new project" on the landing page
2. Follow the AI mentor's guidance to:
   - Share your passion topic
   - Explore problem domains
   - Define specific issues
   - Craft problem statements
3. Save problems to your Problem Map
4. Choose a final problem to work on

**For Teachers:**
- Share the view URL with teachers: `/project/[projectId]/view`
- Teachers can watch student progress in real-time
- View shows passion topic, problem map, and chosen problem

## Project Structure

```
├── app/
│   ├── api/
│   │   └── mentor/
│   │       └── route.ts            # AI mentor API endpoint
│   ├── globals.css                 # Glassmorphic theme styles
│   ├── layout.tsx                  # Root layout
│   ├── page.tsx                    # Landing page
│   └── project/
│       └── [projectId]/
│           ├── page.tsx            # Student workspace (AI-powered)
│           └── view/
│               └── page.tsx        # Read-only teacher view
├── lib/
│   └── mentorLogic.ts             # Legacy state machine (reference)
├── firebase.ts                     # Firebase configuration & helpers
├── .env.local                      # Environment variables (not in git)
└── package.json
```

## AI Mentor

The Problem Incubator uses GPT-4o-mini to guide students through problem discovery. The AI mentor:

- Maintains a conversational, age-appropriate tone (10-17 year olds)
- Asks one clear question at a time
- Keeps responses concise (2-3 sentences)
- Focuses on problems, never solutions
- Adapts to each student's passion topic and context

**API Endpoint:** `/api/mentor`
- Server-side API route keeps your OpenAI key secure
- Maintains conversation history for context
- Includes project context (passion topic, saved problems)

**Cost:** GPT-4o-mini is OpenAI's most affordable model, costing approximately $0.15 per 1M input tokens and $0.60 per 1M output tokens (as of Nov 2024).

## Firebase Configuration & Security

### Configuration
The Firebase configuration is **intentionally hardcoded** in `firebase.ts` for ease of setup in educational contexts. This is a standard practice for client-side Firebase applications.

### Security Model
Since Firebase credentials are public, **security is enforced entirely through Firestore security rules**:

✅ **Anonymous authentication required** - No unauthenticated access
✅ **Ownership-based access control** - Users can only access projects they created
✅ **Owner validation** - Projects are tied to anonymous user UIDs
✅ **Default deny** - Everything not explicitly allowed is blocked

### Deploying Security Rules

**Production-ready rules are in `firestore.rules`**. Deploy them via:

1. **Firebase Console** (easiest): Copy `firestore.rules` → Firebase Console → Firestore → Rules → Publish
2. **Firebase CLI**: `firebase deploy --only firestore:rules`

**📖 Full security documentation:** See [FIREBASE_SECURITY.md](./FIREBASE_SECURITY.md) for:
- Detailed rule explanations
- Testing procedures
- Troubleshooting guide
- Why anonymous auth is secure here

**⚠️ WARNING:** Do NOT use these insecure rules:
```javascript
// ❌ INSECURE - DO NOT USE
allow read: if true;  // Anyone can read everything!
```

**✅ Use the rules in `firestore.rules` instead** - they enforce proper ownership validation.

## Brand Colors

- **Background**: `#162237` (dark navy)
- **Accent**: `#f15f24` (orange - buttons, highlights)
- **Secondary**: `#86dabd` (teal - secondary elements, glows)

## Extending the App

This is Step 0 of the larger Catalyst Change Project framework. The architecture is designed to be extended with:
- Additional project phases
- User authentication & classes
- Advanced AI integration
- Solution development workflows
- Project presentation features

## License

Private educational project.
