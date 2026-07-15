// lib/firebaseAdmin.js
// Shared Firebase Admin SDK setup. Used only by server-side code (api/*.js) —
// never sent to the browser. Uses a service account, so it bypasses Firestore
// security rules entirely, which is why the client no longer needs its own
// Firebase Auth login to read/write data.

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export function getDb() {
  if (!getApps().length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    initializeApp({ credential: cert(serviceAccount) });
  }
  return getFirestore();
}
