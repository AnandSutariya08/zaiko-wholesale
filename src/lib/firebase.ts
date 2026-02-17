import { initializeApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

// Firebase configuration
// TODO: Replace with your actual Firebase config
// You can get this from Firebase Console > Project Settings > General > Your apps
const firebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    "AIzaSyDsdTCK3XOodXcuC1TWHAmxLAETDYv7AjE",
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    "zaiko-wholesale.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "zaiko-wholesale",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    "zaiko-wholesale.firebasestorage.app",
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "539852019524",
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    "1:539852019524:web:a820bcd48462efd9532911",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
// Note: Firebase Auth is not initialized since we're using static login (admin/123)
// This helps avoid CORS issues related to credential-based authentication
export const db: Firestore = getFirestore(app);

// Initialize Storage
export const storage: FirebaseStorage = getStorage(app);

export default app;
