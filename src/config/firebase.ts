
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from 'firebase/auth';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCZK3qtN0QDIp58ydNU9EZKnEQElOq0YtY",
  authDomain: "genzly.firebaseapp.com",
  projectId: "genzly",
  storageBucket: "genzly.firebasestorage.app",
  messagingSenderId: "258142953440",
  appId: "1:258142953440:web:adb42fbb7a297ecfb21585",
  measurementId: "G-LXY0MPSTLT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
console.log("[Firebase] Using storage bucket:", app.options.storageBucket);

// Configure Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});
googleProvider.addScope('profile');
googleProvider.addScope('email');

// Security helper - validates user access according to Firestore rules
export const validateUserAccess = (userId: string, targetUserId: string): boolean => {
  return userId === targetUserId;
};

// Enhanced message content sanitizer to prevent XSS
export const sanitizeMessage = (content: string): string => {
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/data:(?!image\/)/gi, '') // Allow only image data URLs
    .trim();
};


// Rate limiting helper using localStorage (client-side)
export const checkRateLimit = (actionType: string, maxActions: number, timeWindow: number): boolean => {
  const now = Date.now();
  const storageKey = `rate_limit_${actionType}`;
  const stored = localStorage.getItem(storageKey);
  
  let actions: number[] = stored ? JSON.parse(stored) : [];
  
  // Remove expired actions
  actions = actions.filter(timestamp => now - timestamp < timeWindow);
  
  if (actions.length >= maxActions) {
    return false; // Rate limit exceeded
  }
  
  actions.push(now);
  localStorage.setItem(storageKey, JSON.stringify(actions));
  return true;
};

// Security error response formatter
export const formatSecurityError = (action: string): { success: false; error: string } => {
  return {
    success: false,
    error: 'Unauthorized or invalid request'
  };
};

export default app;
