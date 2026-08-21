import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA5rM43xTi3vST0C05KKfgBP7fv4KJfR_0",
  authDomain: "oag-audit-management-online.firebaseapp.com",
  projectId: "oag-audit-management-online",
  storageBucket: "oag-audit-management-online.firebasestorage.app",
  messagingSenderId: "740724320697",
  appId: "1:740724320697:web:4ad302b7df4299ac4f6e68",
  measurementId: "G-B03LC45SHV"
};

// Initialize Firebase (ensure it's only initialized once)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
