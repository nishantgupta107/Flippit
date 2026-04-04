import { initializeApp, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import Constants from 'expo-constants';

/**
 * Firebase configuration from Expo constants
 * Values should be set in app.json or via environment variables
 */
const getFirebaseConfig = () => {
  const extra = Constants.expoConfig?.extra;

  return {
    apiKey: extra?.firebaseApiKey || '',
    authDomain: extra?.firebaseAuthDomain || '',
    projectId: extra?.firebaseProjectId || '',
    storageBucket: extra?.firebaseStorageBucket || '',
    messagingSenderId: extra?.firebaseMessagingSenderId || '',
    appId: extra?.firebaseAppId || '',
  };
};

/**
 * Initialize Firebase app (singleton)
 */
let app: FirebaseApp;

try {
  app = getApp();
} catch {
  const config = getFirebaseConfig();

  // Only initialize if config is valid
  if (config.apiKey && config.projectId) {
    app = initializeApp(config);
  } else {
    console.warn('Firebase config incomplete - auth features disabled');
    // Create a dummy app for development without Firebase
    app = initializeApp(
      {
        apiKey: 'dummy',
        projectId: 'dummy',
        appId: 'dummy',
      },
      'dummy-app'
    );
  }
}

/**
 * Firebase Auth instance
 */
export const auth: Auth = getAuth(app);

/**
 * Firebase Firestore instance
 */
export const db: Firestore = getFirestore(app);

/**
 * Check if Firebase is properly configured
 */
export const isFirebaseConfigured = (): boolean => {
  const config = getFirebaseConfig();
  return Boolean(config.apiKey && config.authDomain && config.projectId);
};

export default app;
