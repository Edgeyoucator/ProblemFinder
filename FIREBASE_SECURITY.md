# Firebase Security Setup

## CRITICAL: Deploy Security Rules Before Making Repository Public

Your Firebase configuration is hardcoded in `firebase.ts` (intentional for educational project). This means **anyone who views your GitHub repository can access your Firebase project endpoints**. Proper Firestore security rules are your **ONLY protection** against unauthorized data access.

---

## Current Security Rules (RECOMMENDED)

The `firestore.rules` file in this repository contains production-ready security rules:

### What These Rules Do:
- ✅ **Users can only read their own projects** - Prevents others from viewing your data
- ✅ **Users can only update projects they own** - Prevents tampering with others' work
- ✅ **Owner ID cannot be changed** - Prevents project hijacking
- ✅ **Delete operations are disabled** - Prevents accidental data loss
- ✅ **Anonymous auth is required** - No unauthenticated access allowed
- ✅ **Default deny** - Anything not explicitly allowed is blocked

### How Projects Are Protected:
```javascript
// Each project document has an ownerId field
{
  ownerId: "abc123...",  // Firebase Auth UID (anonymous user)
  passionTopic: "...",
  problemMap: [...],
  // ... rest of project data
}

// Rules check: request.auth.uid == resource.data.ownerId
// Translation: "Is the current user the owner of this project?"
```

---

## How to Deploy Security Rules

### Option 1: Firebase Console (Easiest)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **changeproject-e02ab**
3. Navigate to **Firestore Database** → **Rules** tab
4. Copy the contents of `firestore.rules` from this repository
5. Paste into the rules editor
6. Click **Publish**
7. ✅ Your database is now secured!

### Option 2: Firebase CLI

```bash
# Install Firebase CLI (if not already installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in this project (if not already done)
firebase init firestore

# Deploy the rules
firebase deploy --only firestore:rules
```

---

## Testing Your Security Rules

### Test 1: Can I access my own project? (Should succeed)
1. Create a project in your app
2. Navigate to it - you should see all your data
3. ✅ Success: You own the project, you can read it

### Test 2: Can I access someone else's project? (Should fail)
1. Open browser DevTools → Console
2. Try to access a project you don't own:
   ```javascript
   // In browser console
   const db = firebase.firestore();
   db.collection('projects').doc('SOME_OTHER_PROJECT_ID').get()
     .then(doc => console.log(doc.data()))
     .catch(err => console.log('Blocked!', err)); // Should see "Missing or insufficient permissions"
   ```
3. ✅ Success: You should get a permissions error

### Test 3: Can unauthenticated users access anything? (Should fail)
1. Open an incognito window
2. Before the app signs in anonymously, try to access Firestore
3. ✅ Success: Should be completely blocked

---

## Why Anonymous Auth is Safe Here

**Question:** "If anyone can sign in anonymously, can't they access everything?"

**Answer:** No! Here's why:

1. **Each anonymous user gets a unique UID**
   - User A gets UID: `abc123`
   - User B gets UID: `xyz789`
   - They are completely separate identities

2. **Projects are tied to the creator's UID**
   - User A creates project → `ownerId: "abc123"`
   - User B creates project → `ownerId: "xyz789"`

3. **Rules enforce ownership**
   - User A can only access projects where `ownerId == "abc123"`
   - User B can only access projects where `ownerId == "xyz789"`
   - They cannot access each other's projects

4. **Anonymous UIDs persist**
   - Firebase stores anonymous auth in browser localStorage
   - Same user on same device keeps same anonymous UID
   - Clear browser data = new anonymous UID (loses access to old projects)

---

## Additional Security Recommendations

### 1. Enable App Check (Optional but Recommended)
Prevents API abuse by verifying requests come from your legitimate app:
1. Go to Firebase Console → **App Check**
2. Register your web app
3. Enable reCAPTCHA v3
4. Update `firebase.ts` to initialize App Check

### 2. Monitor Usage
1. Go to Firebase Console → **Usage & Billing**
2. Set up billing alerts
3. Monitor for unusual spikes in reads/writes

### 3. Rate Limiting (Advanced)
Consider implementing rate limiting if you see abuse:
- Cloud Functions with rate limiting middleware
- Firebase Extensions: "Limit Child Nodes"

---

## Current Firebase Project Info

**Project ID:** `changeproject-e02ab`
**Auth Domain:** `changeproject-e02ab.firebaseapp.com`
**Region:** Default (us-central1)

**Important:** These credentials are intentionally public (standard for client-side Firebase apps). Security is enforced through:
- ✅ Firestore security rules (must be deployed)
- ✅ Anonymous authentication requirement
- ✅ Ownership validation

---

## Troubleshooting

### "Missing or insufficient permissions"
**Symptom:** Users see this error when accessing their own projects
**Cause:** Security rules not deployed OR user not authenticated
**Fix:**
1. Check Firebase Console → Firestore → Rules (verify rules are published)
2. Check browser console for auth errors
3. Verify `ensureAuth()` is being called before Firestore operations

### "Permission denied" during development
**Symptom:** You can't access your own projects during testing
**Cause:** Auth state not initialized yet
**Fix:** Ensure `ensureAuth()` completes before any Firestore operations

### Rules simulator shows "denied"
**Symptom:** Firebase Console rules simulator denies valid operations
**Cause:** Simulator doesn't include all context (like timestamps)
**Fix:** Test with real app instead, or set `request.resource.data.createdAt` manually in simulator

---

## Emergency: Rules Not Working?

If you suspect your database is exposed:

1. **Immediate lockdown:**
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if false;  // Block everything
       }
     }
   }
   ```

2. **Investigate** in Firebase Console → Firestore → Usage tab
3. **Restore proper rules** from `firestore.rules` file after investigation

---

## Summary Checklist

Before making repository public:
- [ ] Deploy `firestore.rules` to Firebase Console
- [ ] Test rules with simulator or real app
- [ ] Verify anonymous auth is working
- [ ] Set up billing alerts (optional)
- [ ] Review this security guide
- [ ] ✅ Ready to push to GitHub!

**Your data is only as secure as your Firestore rules. Deploy them now!**
