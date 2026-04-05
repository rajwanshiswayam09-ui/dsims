// Firebase Configuration
// Your web app's Firebase configuration 
const firebaseConfig = { 
  apiKey: "AIzaSyBtXYZwUehe4q-Pf90B1cmhcSSiIEJ_y8M", 
  authDomain: "dsims-ed901.firebaseapp.com", 
  projectId: "dsims-ed901", 
  storageBucket: "dsims-ed901.firebasestorage.app", 
  messagingSenderId: "8226337003", 
  appId: "1:8226337003:web:1bb2be9f1f6475c21b0eae", 
  measurementId: "G-HTMDLQQTEB" 
}; 

// Initialize Firebase (using compat library for simplicity in vanilla JS)
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Initialize Analytics if needed
if (typeof firebase.analytics === 'function') {
  firebase.analytics();
}
