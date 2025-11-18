// firebase.ts
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  serverTimestamp,
  doc,
  addDoc,
  collection,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  User,
} from "firebase/auth";

// --- Your Firebase configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyDq03sg3rWGzb4Lb4fAn_qZCuVCObYNsVw",
  authDomain: "problemfinder-test2.firebaseapp.com",
  projectId: "problemfinder-test2",
  storageBucket: "problemfinder-test2.firebasestorage.app",
  messagingSenderId: "105667603764",
  appId: "1:105667603764:web:3739eae8abdac6a3df8961",
};
// -----------------------------------

// Initialize Firebase only once
let app: any;
let db: any;
let auth: any;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  console.log('[Firebase] Initialized successfully');
} catch (error: any) {
  // If already initialized, get the existing instance
  if (error?.code === 'app/duplicate-app') {
    console.log('[Firebase] Already initialized, using existing instance');
    const { getApp } = require('firebase/app');
    app = getApp();
    db = getFirestore(app);
    auth = getAuth(app);
  } else {
    console.error('[Firebase] Initialization error:', error);
    throw error;
  }
}

export { db, auth };

// Make sure every user (student) is at least anonymously authenticated
export const ensureAuth = (): Promise<User> =>
  new Promise((resolve, reject) => {
    console.log('[ensureAuth] Starting auth check...');

    // Add timeout to prevent hanging
    const timeout = setTimeout(() => {
      console.error('[ensureAuth] Timeout after 10 seconds');
      reject(new Error('Authentication timeout'));
    }, 10000);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('[ensureAuth] onAuthStateChanged callback fired, user:', user?.uid || 'null');
      clearTimeout(timeout);
      unsubscribe(); // Unsubscribe immediately after first callback

      if (user) {
        console.log('[ensureAuth] User already authenticated:', user.uid);
        return resolve(user);
      }
      try {
        console.log('[ensureAuth] No user, signing in anonymously...');
        const cred = await signInAnonymously(auth);
        console.log('[ensureAuth] Anonymous sign-in successful:', cred.user.uid);
        return resolve(cred.user);
      } catch (err) {
        console.error('[ensureAuth] Error during anonymous sign-in:', err);
        return reject(err);
      }
    });
  });

// Create a new project document
export async function createProject() {
  console.log('[createProject] Starting project creation...');
  const user = await ensureAuth();
  console.log('[createProject] User authenticated, creating document...');
  const ref = await addDoc(collection(db, "projects"), {
    ownerId: user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    passionTopic: null,
    problemMap: [],
    chosenProblem: null,
    currentStep: "problem_incubator",
  });
  console.log('[createProject] Project created with ID:', ref.id);
  return ref.id;
}

// Subscribe to a project in real-time
export function subscribeToProject(
  projectId: string,
  callback: (data: any | null) => void
) {
  const ref = doc(db, "projects", projectId);
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      callback({ id: snap.id, ...snap.data() });
    } else {
      callback(null);
    }
  });
}

// Update the project document
export async function updateProject(projectId: string, partial: any) {
  await ensureAuth(); // Ensure user is authenticated
  const ref = doc(db, "projects", projectId);
  await updateDoc(ref, {
    ...partial,
    // Don't update ownerId - preserve the original owner
    updatedAt: serverTimestamp(),
  });
}
