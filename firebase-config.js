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
// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDMEQvsNb6ZF0rNLon6-Avpx6WLFWvmtHY",
  authDomain: "falcodigi-crm.firebaseapp.com",
  projectId: "falcodigi-crm",
  storageBucket: "falcodigi-crm.firebasestorage.app",
  messagingSenderId: "1041686538142",
  appId: "1:1041686538142:web:1349a026b9144bc3e0988f",
  measurementId: "G-1LY8PXRYQ6"
};

// ========================
// Initialize Firebase (do not modify)
// ========================
firebase.initializeApp(firebaseConfig);

console.log('✅ Firebase Config Loaded');
