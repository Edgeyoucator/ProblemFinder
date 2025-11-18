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
  setPersistence,
  browserLocalPersistence,
  User,
} from "firebase/auth";

// --- Your Firebase configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyD6QXDDSwuC1-aG0SA_tfw-tNYh3sI8dro",
  authDomain: "changeproject-e02ab.firebaseapp.com",
  projectId: "changeproject-e02ab",
  storageBucket: "changeproject-e02ab.firebasestorage.app",
  messagingSenderId: "779806329853",
  appId: "1:779806329853:web:62898a18dd7d1af4456794",
};
// -----------------------------------

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Set auth persistence to LOCAL (persists across browser sessions)
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Failed to set auth persistence:", error);
});

// Make sure every user (student) is at least anonymously authenticated
export const ensureAuth = (): Promise<User> =>
  new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe(); // Unsubscribe immediately after first callback
      if (user) {
        return resolve(user);
      }
      try {
        const cred = await signInAnonymously(auth);
        return resolve(cred.user);
      } catch (err) {
        return reject(err);
      }
    });
  });

// Create a new project document
export async function createProject() {
  const user = await ensureAuth();
  const ref = await addDoc(collection(db, "projects"), {
    ownerId: user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    passionTopic: null,
    problemMap: [],
    chosenProblem: null,
    currentStep: "problem_incubator",
  });
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
