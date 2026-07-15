// firebase-config.js
// Shared by both victoria-rental-car.html (public site) and victoria-admin-panel.html (admin).
// Deploy this file at the ROOT of your Vercel project, alongside those two HTML files.
//
// Get these values from: Firebase Console → Project Settings → General → "Your apps" → Web app
// (see SETUP-GUIDE.md, Step 1)

const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY_HERE",
  authDomain: "PASTE_YOUR_PROJECT.firebaseapp.com",
  projectId: "PASTE_YOUR_PROJECT_ID",
  storageBucket: "PASTE_YOUR_PROJECT.appspot.com",
  messagingSenderId: "PASTE_YOUR_SENDER_ID",
  appId: "PASTE_YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
