import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
// Use a singleton pattern to prevent multiple initializations in development mode
if (!admin.apps.length) {
  try {
    // You should place your serviceAccountKey.json in the root of the project (afg-dashboard/)
    // or use environment variables. Using file path for now as requested.
    const serviceAccount = require('../../afgdashboard-3189a-firebase-adminsdk-fbsvc-4d964fb5b2.json');
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Firebase Admin initialization error', error);
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export default admin;
