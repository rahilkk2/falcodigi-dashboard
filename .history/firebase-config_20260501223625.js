/**
 * FIREBASE CONFIGURATION
 * ========================
 * 
 * INSTRUCTIONS:
 * 1. Go to Firebase Console: https://console.firebase.google.com/
 * 2. Select your "falcodigi-crm" project
 * 3. Click Settings ⚙️ → Project settings (bottom left)
 * 4. Scroll down to "Your apps" section
 * 5. Find the Web App (looks like </> icon)
 * 6. Copy the entire firebaseConfig object
 * 7. Replace the placeholder config below with your actual config
 * 
 */

// PASTE YOUR FIREBASE CONFIG HERE (from Firebase Console)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_AUTH_DOMAIN_HERE",
  projectId: "YOUR_PROJECT_ID_HERE",
  storageBucket: "YOUR_STORAGE_BUCKET_HERE",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID_HERE",
  appId: "YOUR_APP_ID_HERE"
};

// ========================
// Initialize Firebase (do not modify)
// ========================
firebase.initializeApp(firebaseConfig);

console.log('✅ Firebase Config Loaded');
