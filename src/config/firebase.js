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
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCxj_w_Y0UMl_nUsKQhOZ3bJvW6MVXCDm8',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'kidsactivities-25696.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'kidsactivities-25696',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'kidsactivities-25696.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '748250115146',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:748250115146:web:b640485f60c746098bcab3',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-HHMS0S87FJ',
};

export const firebaseVapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || 'BB8kufx_zXoY5Ojrl2gFERDxtU0Of2juTC1h5XkmAyFdyouvEw1xHIALIa8eSFnBLD6FLBXaQUEJY8f5doa5uW0';

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
