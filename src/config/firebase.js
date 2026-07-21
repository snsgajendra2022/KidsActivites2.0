/**
 * Firebase web config for FCM (Cloud Messaging).
 *
 * Required Vite env (same Firebase project as mobile + Admin SDK):
 *   VITE_FIREBASE_API_KEY          (browser key, typically starts with AIza)
 *   VITE_FIREBASE_AUTH_DOMAIN
 *   VITE_FIREBASE_PROJECT_ID
 *   VITE_FIREBASE_STORAGE_BUCKET
 *   VITE_FIREBASE_MESSAGING_SENDER_ID
 *   VITE_FIREBASE_APP_ID
 *   VITE_FIREBASE_VAPID_KEY         (Cloud Messaging → Web Push certificates public key)
 *
 * Never put service-account JSON or private keys in the frontend.
 */

const firebaseConfig = {
  // Must be the Firebase web API key from Console (starts with AIza…) — not the VAPID key.
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
};

export const firebaseVapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

export function isFirebaseWebConfigured() {
  return Boolean(
    firebaseConfig.apiKey
    && firebaseConfig.projectId
    && firebaseConfig.messagingSenderId
    && firebaseConfig.appId
    && firebaseVapidKey,
  );
}

/** Soft check — Firebase browser keys normally start with AIza. */
export function isFirebaseApiKeyShapeValid() {
  return typeof firebaseConfig.apiKey === 'string' && firebaseConfig.apiKey.startsWith('AIza');
}

export { firebaseConfig };
