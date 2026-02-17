import { initializeApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

// Firebase configuration
// TODO: Replace with your actual Firebase config
// You can get this from Firebase Console > Project Settings > General > Your apps
const firebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    "AIzaSyDIYMfn51U_e2uU6sbVfjRc44qb66KKY98",
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    "supergames-ai.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "supergames-ai",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    "supergames-ai.firebasestorage.app",
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "254966835658",
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    "1:254966835658:web:095c44a0c6c83bb2198733",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
// Note: Firebase Auth is not initialized since we're using static login (admin/123)
// This helps avoid CORS issues related to credential-based authentication
export const db: Firestore = getFirestore(app, "bill");

// Initialize Storage
export const storage: FirebaseStorage = getStorage(app);

export default app;
