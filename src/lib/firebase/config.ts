import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';

let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

export function initializeBlogFirebase(firebaseConfig: any) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  return { app, db, auth };
}

export function getFirebaseInstances() {
  if (!app || !db || !auth) {
    throw new Error('Firebase not initialized. Call initializeBlogFirebase() first.');
  }
  return { app, db, auth };
}

export { db, auth };
